import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchExtension, getPopupText, gotoFixture } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setSelectionKeyOnly, saveOptions } from './support/optionsPage.mjs'

describe('before a target language is chosen', () => {
  let extension, fixtures, page
  const translateRequests = []

  before(async () => {
    extension = await launchExtension()
    fixtures = await startFixtureServer()
    await extension.context.route('**/translate_a/single**', route => {
      translateRequests.push(route.request().url())
      return route.fallback()
    })
    page = await extension.context.newPage()
  })

  after(async () => {
    await extension.close()
    await fixtures.close()
  })

  it('installing opens the options page', async () => {
    const isOptionsPage = page => page.url() === extension.optionsUrl
    const optionsPage = extension.context.pages().find(isOptionsPage) || await extension.context.waitForEvent('page', { predicate: isOptionsPage })

    assert.ok(optionsPage)
  })

  it('clicking a word does nothing', async () => {
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    await page.waitForTimeout(500)

    assert.deepStrictEqual(translateRequests, [])
    assert.strictEqual(await getPopupText(page), null)
  })

  it('translating a selection with the trigger key does nothing', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setSelectionKeyOnly(optionsPage, true)
    await saveOptions(optionsPage)
    await optionsPage.close()

    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.dblclick('#word')
    await page.keyboard.press('Alt')
    await page.waitForTimeout(500)

    assert.deepStrictEqual(translateRequests, [])
    assert.strictEqual(await getPopupText(page), null)
  })
})
