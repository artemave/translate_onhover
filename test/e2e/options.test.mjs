import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, popupHasRtlClass, popupStaysEmpty, gotoFixture, resetUrlLists } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, addExceptUrl, addOnlyUrl, saveOptions } from './support/optionsPage.mjs'

describe('options page', () => {
  let extension, siteA, siteB, page

  before(async () => {
    extension = await launchExtension()
    // Two distinct origins (different ports), needed for the
    // except_urls/only_urls scenarios below.
    siteA = await startFixtureServer()
    siteB = await startFixtureServer()

    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(optionsPage, 'fr')
    await saveOptions(optionsPage)
    await optionsPage.close()

    page = await extension.context.newPage()
  })

  after(async () => {
    await extension.close()
    await siteA.close()
    await siteB.close()
  })

  beforeEach(async () => {
    await resetUrlLists(extension)
  })

  // Only the first test below changes this, but resetting it unconditionally
  // here keeps that reset out of the test itself.
  afterEach(async () => {
    const resetPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(resetPage, 'fr')
    await saveOptions(resetPage)
    await resetPage.close()
  })

  it('changing the target language changes what translations come back as', async () => {
    await gotoFixture(page, `${siteA.baseUrl}/word.html`)
    await page.click('#word')
    assert.match(await waitForPopupText(page), /cadeau/i)

    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(optionsPage, 'de')
    await saveOptions(optionsPage)
    await optionsPage.close()

    await gotoFixture(page, `${siteA.baseUrl}/word.html`)
    await page.click('#word')
    assert.match(await waitForPopupText(page), /geschenk/i)

    const arabicPage = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(arabicPage, 'ar')
    await saveOptions(arabicPage)
    await arabicPage.close()

    await gotoFixture(page, `${siteA.baseUrl}/word.html`)
    await page.click('#word')
    await waitForPopupText(page)
    assert.ok(await popupHasRtlClass(page), 'expected the rtl class when translating into Arabic')
  })

  it('except_urls disables translation only on the listed origin', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await addExceptUrl(optionsPage, siteA.baseUrl)
    await saveOptions(optionsPage)
    await optionsPage.close()

    await gotoFixture(page, `${siteA.baseUrl}/word.html`)
    await page.click('#word')
    assert.ok(await popupStaysEmpty(page), 'expected no popup on the blacklisted origin')

    await gotoFixture(page, `${siteB.baseUrl}/word.html`)
    await page.click('#word')
    assert.match(await waitForPopupText(page), /cadeau/i)
  })

  it('only_urls restricts translation to just the listed origin', async () => {
    const optionsPage = await openOptions(extension.context, extension.optionsUrl)
    await addOnlyUrl(optionsPage, siteA.baseUrl)
    await saveOptions(optionsPage)
    await optionsPage.close()

    await gotoFixture(page, `${siteA.baseUrl}/word.html`)
    await page.click('#word')
    assert.match(await waitForPopupText(page), /cadeau/i)

    await gotoFixture(page, `${siteB.baseUrl}/word.html`)
    await page.click('#word')
    assert.ok(await popupStaysEmpty(page), 'expected no popup on an origin not in only_urls')
  })
})
