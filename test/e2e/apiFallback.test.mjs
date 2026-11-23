import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, gotoFixture } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, saveOptions } from './support/optionsPage.mjs'

describe('falling back from the primary translate API to the rate-limited one', () => {
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

  it('falls back to the second API when the primary one returns an unexpected shape', async () => {
    // dict-chrome-ex (clients5.google.com) responding 200 with no
    // "sentences" field - background.js treats that as "is this API still
    // returning the expected structure?" and falls back to the gtx API
    // (translate.googleapis.com), which is left real/unmocked here.
    await extension.context.route('**/clients5.google.com/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )

    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    assert.match(await waitForPopupText(page), /cadeau/i)
  })

  it('shows an error instead of crashing when both APIs fail with a non-429 status', async () => {
    await extension.context.route('**/translate_a/single**', route =>
      route.fulfill({ status: 500, body: '' })
    )

    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    assert.match(await waitForPopupText(page), /failed with status 500/i)
  })
})
