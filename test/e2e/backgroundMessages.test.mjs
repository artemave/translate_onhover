import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, gotoFixture } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, saveOptions } from './support/optionsPage.mjs'

// Covers a couple of background.js's chrome.runtime message handlers that
// don't have a dedicated UI flow of their own to drive them through:
// getLastTranslationDetails (used by the TTS keyboard shortcut) and
// whatever happens with a request none of its cases recognize.
describe('background message handlers', () => {
  let extension, fixtures, page, optionsPage

  before(async () => {
    extension = await launchExtension()
    fixtures = await startFixtureServer()

    optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(optionsPage, 'fr')
    await saveOptions(optionsPage)

    page = await extension.context.newPage()
  })

  after(async () => {
    await optionsPage.close()
    await extension.close()
    await fixtures.close()
  })

  // Regular page content has no chrome.* access - only extension pages
  // (like options.html) and content scripts do - so these messages are
  // sent from the already-open options page rather than `page`.

  it('getLastTranslationDetails returns {} before any translation has succeeded', async () => {
    const response = await optionsPage.evaluate(() => chrome.runtime.sendMessage({ handler: 'getLastTranslationDetails' }))
    assert.deepStrictEqual(response, {})
  })

  it('getLastTranslationDetails returns the last successful translation', async () => {
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    await waitForPopupText(page)

    const response = await optionsPage.evaluate(() => chrome.runtime.sendMessage({ handler: 'getLastTranslationDetails' }))
    assert.strictEqual(response.succeeded, true)
    assert.strictEqual(response.word, 'gift')
  })

  it('an unrecognized handler is ignored rather than crashing the service worker', async () => {
    const response = await optionsPage.evaluate(() => chrome.runtime.sendMessage({ handler: 'not-a-real-handler' }))
    assert.deepStrictEqual(response, {})

    assert.ok(await extension.serviceWorker.evaluate(() => chrome.runtime.id))
  })
})
