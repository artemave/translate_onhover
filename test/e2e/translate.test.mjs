import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, popupStaysEmpty, gotoFixture, copyTranslationToClipboard } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, setTranslateBy, setDelay, setDoNotShowOops, saveOptions } from './support/optionsPage.mjs'

describe('translate flows', () => {
  let extension, fixtures, page

  before(async () => {
    extension = await launchExtension()
    fixtures = await startFixtureServer()

    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(optionsPage, 'fr')
    await saveOptions(optionsPage)
    await optionsPage.close()

    page = await extension.context.newPage()
  })

  after(async () => {
    await extension.close()
    await fixtures.close()
  })

  // Only the hover and do_not_show_oops tests below change these, but
  // resetting them unconditionally here keeps that reset out of the tests
  // themselves. translate_by matters beyond just the hover test itself: the
  // mousemove-debounce timer it interacts with schedules regardless of
  // translate_by, so leaving it at "point" would also affect the
  // drag-selection test that follows.
  afterEach(async () => {
    const resetPage = await openOptions(extension.context, extension.optionsUrl)
    await setTranslateBy(resetPage, 'click')
    await setDoNotShowOops(resetPage, false)
    await saveOptions(resetPage)
    await resetPage.close()
  })

  it('translates on click (the default translate_by)', async () => {
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')

    const text = await waitForPopupText(page)
    assert.match(text, /cadeau/i)
  })

  it('the copy-translation-to-clipboard command copies the last shown translation', async () => {
    await extension.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: fixtures.baseUrl })
    await page.evaluate(() => navigator.clipboard.writeText(''))

    await copyTranslationToClipboard(extension, page)
    // The command reaches the content script through a real cross-process
    // extension message (service worker -> tab), whose delivery isn't
    // observable from here - poll the clipboard itself instead of guessing
    // how long that takes.
    await page.waitForFunction(() => navigator.clipboard.readText().then(text => text.length > 0))

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    assert.match(clipboardText, /cadeau/i)
  })

  it('translates on hover when translate_by is "point"', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTranslateBy(optionsPage, 'point')
    // The real default (700ms) is tuned for a human not to feel like
    // hovering triggers a translation by accident - nothing here needs
    // that UX margin. Not 0 though: this delay debounces every mousemove
    // (regardless of translate_by), so too low lets a drag's synthetic
    // intermediate mousemove events each fire their own mousestop instead
    // of being cleared/replaced by the next one - 50ms is comfortably below
    // "annoyingly slow to a human" and comfortably above the gap between
    // two synthetic mousemove events in one drag.
    await setDelay(optionsPage, 50)
    await saveOptions(optionsPage)
    await optionsPage.close()

    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    const box = await page.locator('#word').boundingBox()
    // The previous test already left the (virtual) mouse sitting on this
    // exact word - move away first so the move below is a real change and
    // actually dispatches a mousemove for the content script to see.
    await page.mouse.move(0, 0)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

    const text = await waitForPopupText(page)
    assert.match(text, /cadeau/i)
  })

  it('translates a text selection', async () => {
    await gotoFixture(page, `${fixtures.baseUrl}/sentence.html`)
    const box = await page.locator('#sentence').boundingBox()

    // A drag doesn't reliably produce a real text selection every time
    // under CI's slower, more contended timing - retry rather than let a
    // missed drag surface as a 15s "no popup ever showed up" timeout below,
    // which wouldn't say why.
    let selectedText = ''
    for (let attempt = 0; attempt < 5 && !selectedText; attempt++) {
      await page.mouse.move(box.x + 5, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2, { steps: 20 })
      await page.mouse.up()
      selectedText = await page.evaluate(() => window.getSelection().toString())
    }
    assert.ok(selectedText, 'drag-select never produced a text selection')

    const text = await waitForPopupText(page)
    assert.match(text, /jaunes/i)
  })

  it('shows "Oops" for input Google just echoes back untranslated', async () => {
    await gotoFixture(page, `${fixtures.baseUrl}/oops.html`)
    await page.click('#word')

    const text = await waitForPopupText(page)
    assert.match(text, /Oops/)
  })

  it('shows no popup at all for untranslatable input when do_not_show_oops is set', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setDoNotShowOops(optionsPage, true)
    await saveOptions(optionsPage)
    await optionsPage.close()

    await gotoFixture(page, `${fixtures.baseUrl}/oops.html`)
    await page.click('#word')
    assert.ok(await popupStaysEmpty(page))
  })
})
