import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, gotoFixture, openTypeAndTranslate } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, saveOptions } from './support/optionsPage.mjs'

describe('page enforcing Trusted Types', () => {
  let extension, fixtures, page

  before(async () => {
    extension = await launchExtension()
    fixtures = await startFixtureServer()

    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(optionsPage, 'fr')
    await saveOptions(optionsPage)
    await optionsPage.close()

    page = await extension.context.newPage()
    await gotoFixture(page, `${fixtures.baseUrl}/trustedTypes.html`)
  })

  after(async () => {
    await extension.close()
    await fixtures.close()
  })

  it('translates on click', async () => {
    await page.click('#word')

    assert.match(await waitForPopupText(page), /cadeau/i)
  })

  it('translates from the type-and-translate popup', async () => {
    await openTypeAndTranslate(extension, page)
    await page.fill('#tat_input', 'gift')
    await page.click('#tat_submit')

    assert.match(await waitForPopupText(page), /cadeau/i)
  })
})
