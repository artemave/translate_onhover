import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchFirefoxExtension, gotoFixture, waitForPopupText } from './support/firefox.mjs'
import { startFixtureServer } from '../e2e/support/fixtureServer.mjs'

describe('Firefox (manifest v2)', () => {
  let extension, fixtures, optionsPage

  before(async () => {
    extension = await launchFirefoxExtension()
    fixtures = await startFixtureServer()

    optionsPage = await extension.openOptions()
    await optionsPage.select('#target_lang', 'fr')
    await optionsPage.click('#save_button')
    await optionsPage.waitForFunction(() => document.documentElement.dataset.transoverOptionsSaved === 'true')
  })

  after(async () => {
    await extension.close()
    await fixtures.close()
  })

  it('options page shows the Firefox hotkey hint instead of the Chrome one', async () => {
    const visible = selector => optionsPage.$eval(selector, el => !el.classList.contains('u-hidden'))

    assert.ok(await visible('.firefox-option'))
    assert.ok(!(await visible('.chrome-option')))
  })

  it('translates on click', async () => {
    const page = await extension.browser.newPage()
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')

    assert.match(await waitForPopupText(page), /cadeau/i)
  })

  it('tracks translations under the extension id', async () => {
    const page = await extension.browser.newPage()
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    await waitForPopupText(page)

    const translateEvent = extension.analyticsRequests.find(r => r.events[0].name === 'translate')
    assert.strictEqual(translateEvent.client_id, extension.extensionUuid)
  })
})
