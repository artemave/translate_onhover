import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, gotoFixture, openTypeAndTranslate } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, saveOptions } from './support/optionsPage.mjs'
import { trackContentScriptWorld, flushPage, flushServiceWorker } from './support/coverage.mjs'

// Pages such as Gmail send `Content-Security-Policy: require-trusted-types-for
// 'script'`, which makes assigning a plain string to innerHTML (or to a
// script's src) throw a TypeError. See https://github.com/artemave/translate_onhover/issues/116
describe('pages enforcing Trusted Types', () => {
  let extension, fixtures, page, errors

  before(async () => {
    extension = await launchExtension()
    fixtures = await startFixtureServer()

    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(optionsPage, 'fr')
    await saveOptions(optionsPage)
    await optionsPage.close()

    page = await extension.context.newPage()
    await trackContentScriptWorld(page)
    errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => m.type() === 'error' && errors.push(m.text()))
    await gotoFixture(page, `${fixtures.baseUrl}/trusted-types.html`)
  })

  after(async () => {
    await flushPage(page)
    await flushServiceWorker(extension)
    await extension.close()
    await fixtures.close()
  })

  it('translates on click', async () => {
    await page.click('#word')

    const text = await waitForPopupText(page)
    assert.match(text, /cadeau/i)
    assert.deepStrictEqual(errors.filter(e => /TrustedHTML|TrustedScript|Trusted Type/i.test(e)), [])
  })

  it('opens the type-and-translate popup and translates typed text', async () => {
    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_input').waitFor()

    await page.fill('#tat_input', 'gift')
    await page.click('#tat_submit')

    const text = await waitForPopupText(page)
    assert.match(text, /cadeau/i)
    assert.deepStrictEqual(errors.filter(e => /TrustedHTML|TrustedScript|Trusted Type/i.test(e)), [])
  })
})
