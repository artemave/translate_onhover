import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import {
  launchExtension,
  waitForPopupText,
  popupStaysEmpty,
  gotoFixture,
  openTypeAndTranslate,
  copyTranslationToClipboard
} from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, setDoNotShowOops, saveOptions } from './support/optionsPage.mjs'

describe('type-and-translate popup', () => {
  let extension, fixtures, page

  before(async () => {
    extension = await launchExtension()
    fixtures = await startFixtureServer()

    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(optionsPage, 'fr')
    await saveOptions(optionsPage)
    await optionsPage.close()

    page = await extension.context.newPage()
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
  })

  after(async () => {
    await extension.close()
    await fixtures.close()
  })

  // Only the do_not_show_oops test below changes this, but resetting it
  // unconditionally here keeps that reset out of the test itself. The
  // disable_everywhere test registers its own cleanup instead (see below) -
  // the "disable on this page" test already exercises and reverts its own
  // except_urls state as part of testing the idempotent-removal path, so
  // that one's cleanup stays where it is too.
  afterEach(async () => {
    const resetPage = await openOptions(extension.context, extension.optionsUrl)
    await setDoNotShowOops(resetPage, false)
    await saveOptions(resetPage)
    await resetPage.close()
  })

  it('opens, translates typed text, and closes on Escape', async () => {
    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_input').waitFor()

    await page.fill('#tat_input', 'gift')
    await page.click('#tat_submit')

    const text = await waitForPopupText(page)
    assert.match(text, /cadeau/i)

    await page.keyboard.press('Escape')
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })
  })

  it('submits on Enter and closes via the close button', async () => {
    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_input').waitFor()

    await page.fill('#tat_input', 'gift')
    await page.press('#tat_input', 'Enter')

    const text = await waitForPopupText(page)
    assert.match(text, /cadeau/i)

    await page.click('#tat_close')
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })
  })

  it('does not truncate a dictionary entry with 5 or fewer meanings', async () => {
    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_input').waitFor()

    await page.fill('#tat_input', 'yes')
    await page.click('#tat_submit')

    const text = await waitForPopupText(page)
    assert.match(text, /oui/i)
    assert.doesNotMatch(text, /\.\.\./)

    await page.keyboard.press('Escape')
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })
  })

  it('swap_languages swaps the from/to language selects, and the picked language is remembered', async () => {
    await openTypeAndTranslate(extension, page)
    const fromLang = page.locator('#tat_from_lang')
    const toLang = page.locator('#tat_to_lang')
    await fromLang.waitFor()

    // Swapping while from_lang is still "Autodetect" (the default) is a
    // no-op - the button starts disabled until a real language is picked.
    assert.strictEqual(await fromLang.inputValue(), 'auto')
    await page.click('#swap_languages')
    assert.strictEqual(await fromLang.inputValue(), 'auto')
    assert.strictEqual(await toLang.inputValue(), 'fr')

    // to_lang defaults to the target_lang option we set in before() ('fr').
    // Pick a distinct from_lang so the swap is actually observable, and
    // picking a real language (not "auto") is also what enables the swap
    // button in the first place.
    await fromLang.selectOption('de')
    assert.strictEqual(await toLang.inputValue(), 'fr')

    await page.click('#swap_languages')
    assert.strictEqual(await fromLang.inputValue(), 'fr')
    assert.strictEqual(await toLang.inputValue(), 'de')

    // Submit with this non-"auto" from-language, then reopen: the popup
    // should remember and pre-select it next time.
    await page.fill('#tat_input', 'Geschenk')
    await page.click('#tat_submit')
    await waitForPopupText(page)
    await page.keyboard.press('Escape')
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })

    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_from_lang').waitFor()
    assert.strictEqual(await page.locator('#tat_from_lang').inputValue(), 'fr')

    // and switching back to "Autodetect" is itself a real, distinct choice
    await page.locator('#tat_from_lang').selectOption('auto')
    await page.keyboard.press('Escape')
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })
  })

  it('the "disable on this page" checkbox stops translation only on this page, and persists across reopen', async () => {
    await openTypeAndTranslate(extension, page)
    const disableOnThisPage = page.locator('#disable_on_this_page')
    await disableOnThisPage.waitFor()
    await disableOnThisPage.check()

    // toggling it also closes the popup (contentscript.js's handler for
    // this message removes it), so no need to Escape separately
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })

    await page.click('#word')
    assert.ok(await popupStaysEmpty(page), 'expected no popup once disabled on this page')

    // reopening should reflect the persisted state (attributeChangedCallback
    // reading data-disable_on_this_page back)
    await openTypeAndTranslate(extension, page)
    await page.locator('#disable_on_this_page').waitFor()
    assert.strictEqual(await page.locator('#disable_on_this_page').isChecked(), true)

    // It's already checked, so a real .check() would be a no-op here -
    // dispatch the 'change' event directly to exercise "already in
    // except_urls, don't add it twice" (background.js's toggle handler).
    await page.locator('#disable_on_this_page').evaluate(el => el.dispatchEvent(new Event('change')))
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })

    // revert and confirm translation actually works again, so this test
    // doesn't leak a blacklisted origin into the rest of the file
    await openTypeAndTranslate(extension, page)
    await page.locator('#disable_on_this_page').waitFor()
    await page.locator('#disable_on_this_page').uncheck()
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })
    await page.click('#word')
    assert.match(await waitForPopupText(page), /cadeau/i)

    // same idempotency check for the removal side: already absent from
    // except_urls, so this should skip trying to remove it again.
    await openTypeAndTranslate(extension, page)
    await page.locator('#disable_on_this_page').waitFor()
    await page.locator('#disable_on_this_page').evaluate(el => el.dispatchEvent(new Event('change')))
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })
  })

  it('the "disable everywhere" checkbox stops translation on the page', async (t) => {
    // Toggling back off through the same real checkbox (rather than
    // resetting the underlying storage value directly) matters here, not
    // just for symmetry: it's the only thing in this suite that exercises
    // toggle_disable_everywhere's "turn it back off" branch in both
    // background.js and contentscript.js's postMessage handler.
    t.after(async () => {
      await openTypeAndTranslate(extension, page)
      await page.locator('#disable_everywhere').waitFor()
      await page.locator('#disable_everywhere').uncheck()
    })

    await openTypeAndTranslate(extension, page)
    const disableEverywhere = page.locator('#disable_everywhere')
    await disableEverywhere.waitFor()
    await disableEverywhere.check()

    // toggling it also closes the popup (contentscript.js's handler for
    // this message removes it), so no need to Escape separately
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })

    await page.click('#word')
    assert.ok(await popupStaysEmpty(page), 'expected no popup once disabled everywhere')
  })

  it('opening it again while already open closes it instead', async () => {
    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_input').waitFor()

    await openTypeAndTranslate(extension, page)
    await page.locator('transover-type-and-translate-popup').waitFor({ state: 'detached' })
  })

  it('shows no popup for untranslatable input when do_not_show_oops is set', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setDoNotShowOops(optionsPage, true)
    await saveOptions(optionsPage)
    await optionsPage.close()

    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_input').waitFor()
    // TAT remembers the last submitted from/to language pair across
    // reopens - pin both explicitly rather than depend on whatever an
    // earlier test in this file last left selected.
    await page.locator('#tat_from_lang').selectOption('auto')
    await page.locator('#tat_to_lang').selectOption('fr')
    await page.fill('#tat_input', 'zxqvbnmghjk')
    await page.click('#tat_submit')

    assert.ok(await popupStaysEmpty(page))
  })

  it('copies a sentence translation (not a dictionary array) to the clipboard', async () => {
    await extension.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: fixtures.baseUrl })
    await page.evaluate(() => navigator.clipboard.writeText(''))

    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_input').waitFor()
    // an earlier test leaves a from/to language pair selected, and TAT
    // remembers it across reopens - pin both explicitly so this assertion
    // doesn't depend on that ordering.
    await page.locator('#tat_from_lang').selectOption('auto')
    await page.locator('#tat_to_lang').selectOption('fr')
    await page.fill('#tat_input', 'gifts are yellow')
    await page.click('#tat_submit')
    await waitForPopupText(page)
    await page.keyboard.press('Escape')

    await copyTranslationToClipboard(extension, page)
    // Same reasoning as translate.test.mjs's clipboard test: the command
    // reaches the content script via a real cross-process extension
    // message, so poll the clipboard itself rather than guess a delay.
    await page.waitForFunction(() => navigator.clipboard.readText().then(text => text.length > 0))
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    assert.match(clipboardText, /jaunes/i)
  })

  it('ignores a window message with an unrecognized type', async () => {
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.evaluate(() => window.postMessage({ type: 'not-a-real-message-type' }, '*'))

    // still working normally afterwards
    await page.click('#word')
    assert.match(await waitForPopupText(page), /cadeau/i)
  })
})
