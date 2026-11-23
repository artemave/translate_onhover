import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, popupStaysEmpty, gotoFixture } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, saveOptions } from './support/optionsPage.mjs'

describe('rate-limit backoff', () => {
  let extension, fixtures, page

  before(async () => {
    extension = await launchExtension()
    fixtures = await startFixtureServer()

    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(optionsPage, 'fr')
    await saveOptions(optionsPage)
    await optionsPage.close()

    // The only stubbed thing in the whole e2e suite: Google's translate
    // endpoints, so a real 429 is deterministic instead of needing to
    // actually get rate-limited by Google. This applies at the context
    // level so it also covers background.js's service-worker fetches, not
    // just page-initiated ones.
    await extension.context.route('**/translate_a/single**', route =>
      route.fulfill({ status: 429, body: '' })
    )

    page = await extension.context.newPage()
  })

  after(async () => {
    await extension.close()
    await fixtures.close()
  })

  it('shows a "too many requests" message when the API returns 429', async () => {
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')

    const text = await waitForPopupText(page)
    assert.match(text, /too many requests/i)
  })

  // background.js's block bookkeeping only shows the message on every 3rd
  // blocked attempt (checked against the count *before* incrementing, so
  // it's attempts 1, 4, 7, ... that speak up) - everything in between is
  // silently suppressed rather than re-hitting the API.
  it('further attempts during the block window are silent, except every 3rd', async () => {
    await page.click('#word')
    assert.ok(await popupStaysEmpty(page), 'expected no popup on the 2nd blocked attempt')

    await page.click('#word')
    assert.ok(await popupStaysEmpty(page), 'expected no popup on the 3rd blocked attempt')

    await page.click('#word')
    assert.match(await waitForPopupText(page), /too many requests/i)
  })
})
