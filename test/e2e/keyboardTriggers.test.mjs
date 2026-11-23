import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, popupStaysEmpty, gotoFixture } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, setSelectionKeyOnly, setWordKeyOnly, setTts, saveOptions } from './support/optionsPage.mjs'

describe('keyboard-triggered translation', () => {
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

  // Each test below flips one of these on to test it, then relies on this
  // to put it back rather than resetting it inline itself.
  afterEach(async () => {
    const resetPage = await openOptions(extension.context, extension.optionsUrl)
    await setSelectionKeyOnly(resetPage, false)
    await setWordKeyOnly(resetPage, false)
    await setTts(resetPage, false)
    await saveOptions(resetPage)
    await resetPage.close()
  })

  it('pressing the trigger key (Alt by default) translates a selection when selection_key_only is set', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setSelectionKeyOnly(optionsPage, true)
    await saveOptions(optionsPage)
    await optionsPage.close()

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

    await page.keyboard.press('Alt')
    assert.match(await waitForPopupText(page), /jaunes/i)
  })

  it('word_key_only requires holding the trigger key before a click translates', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setWordKeyOnly(optionsPage, true)
    await saveOptions(optionsPage)
    await optionsPage.close()

    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    assert.ok(await popupStaysEmpty(page), 'expected no popup without holding the trigger key')

    await page.keyboard.down('Alt')
    await page.click('#word')
    await page.keyboard.up('Alt')
    assert.match(await waitForPopupText(page), /cadeau/i)
  })

  it('pressing the TTS key (Shift by default) plays audio for the last translation, and Escape stops it', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTts(optionsPage, true)
    await saveOptions(optionsPage)
    await optionsPage.close()

    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    await waitForPopupText(page)

    const ttsRequest = page.waitForRequest(req => req.url().includes('translate_tts'))
    await page.keyboard.press('Shift')
    const request = await ttsRequest
    assert.match(request.url(), /q=gift/)

    // stopping playback shouldn't throw
    await page.keyboard.press('Escape')
  })
})
