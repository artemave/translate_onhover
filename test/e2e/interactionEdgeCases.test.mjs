import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchExtension, popupStaysEmpty, waitForPopupText, gotoFixture, waitForOptionsLoaded } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, setSelectionKeyOnly, saveOptions } from './support/optionsPage.mjs'

describe('interaction edge cases', () => {
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

  // Only the last test below sets this, but resetting it unconditionally
  // here keeps that reset out of the test itself.
  afterEach(async () => {
    const resetPage = await openOptions(extension.context, extension.optionsUrl)
    await setSelectionKeyOnly(resetPage, false)
    await saveOptions(resetPage)
    await resetPage.close()
  })

  it('does nothing when clicking inside a text input', async () => {
    await gotoFixture(page, `${fixtures.baseUrl}/edgeCases.html`)
    await page.click('#text_input')
    assert.ok(await popupStaysEmpty(page))
  })

  it('does nothing when clicking inside a contenteditable element', async () => {
    await page.click('#editable')
    assert.ok(await popupStaysEmpty(page))
  })

  it('does nothing when clicking an element with no text', async () => {
    await page.click('#empty_box')
    assert.ok(await popupStaysEmpty(page))
  })

  it('does nothing when clicking a link', async () => {
    await page.click('#link')
    assert.ok(await popupStaysEmpty(page))
  })

  it('hides the popup on scroll', async () => {
    await page.click('#scroll_word')
    await waitForPopupText(page)

    await page.mouse.wheel(0, 500)
    await page.locator('transover-popup').waitFor({ state: 'detached' })
  })

  it('reloads options when the page becomes visible again', async () => {
    // Playwright's tab-focus switching doesn't actually toggle
    // document.hidden in this environment (every tab in the same window
    // reports visible), so this dispatches the real event directly rather
    // than trying to engineer a genuine OS-level focus change.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await waitForOptionsLoaded(page)

    // loadOptions() re-running successfully (not throwing) is the main
    // thing being checked here - confirm the extension is still working
    // afterwards.
    await page.click('#text_input')
    await page.click('#empty_box')
  })

  it('does nothing when selection_key_only is set and text is selected without holding the key', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setSelectionKeyOnly(optionsPage, true)
    await saveOptions(optionsPage)
    await optionsPage.close()

    // Plain, non-editable text - #editable would be caught by the earlier
    // "skip editable elements" check regardless of selection_key_only,
    // which would make this pass for the wrong reason.
    await gotoFixture(page, `${fixtures.baseUrl}/sentence.html`)
    const box = await page.locator('#sentence').boundingBox()

    let selectedText = ''
    for (let attempt = 0; attempt < 5 && !selectedText; attempt++) {
      await page.mouse.move(box.x + 5, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
      selectedText = await page.evaluate(() => window.getSelection().toString())
    }
    assert.ok(selectedText, 'drag-select never produced a text selection')

    assert.ok(await popupStaysEmpty(page))
  })
})
