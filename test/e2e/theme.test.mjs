import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, gotoFixture, openTypeAndTranslate } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, setTheme, saveOptions } from './support/optionsPage.mjs'

const LIGHT_BACKGROUND = 'rgb(252, 247, 217)'
const DARK_BACKGROUND = 'rgb(46, 44, 37)'

function popupBackground(page, popupTag) {
  return page.evaluate(popupTag => {
    const popups = document.querySelectorAll(popupTag)
    const main = popups[popups.length - 1].shadowRoot.querySelector('main')
    return getComputedStyle(main).backgroundColor
  }, popupTag)
}

describe('theme', () => {
  let extension, fixtures, page

  async function saveTheme(theme) {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTheme(optionsPage, theme)
    await saveOptions(optionsPage)
    await optionsPage.close()
  }

  async function translateWord() {
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    await waitForPopupText(page)
    return popupBackground(page, 'transover-popup')
  }

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

  afterEach(async () => {
    await saveTheme('light')
  })

  it('is light by default, even with a dark system color scheme', async () => {
    await page.emulateMedia({ colorScheme: 'dark' })

    assert.strictEqual(await translateWord(), LIGHT_BACKGROUND)
  })

  it('"same as system" follows the system color scheme', async () => {
    await saveTheme('auto')

    await page.emulateMedia({ colorScheme: 'light' })
    assert.strictEqual(await translateWord(), LIGHT_BACKGROUND)

    await page.emulateMedia({ colorScheme: 'dark' })
    assert.strictEqual(await translateWord(), DARK_BACKGROUND)
  })

  it('dark theme overrides a light system color scheme', async () => {
    await saveTheme('dark')
    await page.emulateMedia({ colorScheme: 'light' })

    assert.strictEqual(await translateWord(), DARK_BACKGROUND)
  })

  it('light theme overrides a dark system color scheme', async () => {
    await saveTheme('light')
    await page.emulateMedia({ colorScheme: 'dark' })

    assert.strictEqual(await translateWord(), LIGHT_BACKGROUND)
  })

  it('applies to the type-and-translate popup', async () => {
    await saveTheme('dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)

    await openTypeAndTranslate(extension, page)
    await page.locator('#tat_input').waitFor()

    assert.strictEqual(await popupBackground(page, 'transover-type-and-translate-popup'), DARK_BACKGROUND)
  })

  it('does not apply to the options page, which follows the system color scheme', async () => {
    await saveTheme('light')
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await optionsPage.emulateMedia({ colorScheme: 'dark' })

    assert.strictEqual(await optionsPage.evaluate(() => getComputedStyle(document.body).color), 'rgb(212, 212, 212)')

    await optionsPage.close()
  })
})
