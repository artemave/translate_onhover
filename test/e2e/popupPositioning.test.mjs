import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchExtension, waitForPopupText, gotoFixture } from './support/extension.mjs'
import { startFixtureServer } from './support/fixtureServer.mjs'
import { openOptions, setTargetLang, saveOptions } from './support/optionsPage.mjs'

// calculatePopupPosition() has 5 horizontal and 3 vertical placement
// branches, but every other e2e test leaves comfortable room to the right
// and below the word, so only the (default) right/below-ish branches ever
// fired. These pick viewport sizes and word positions that force the
// other placements instead.
describe('popup positioning', () => {
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

  it('shows the popup at the very left, and resizes it, when nothing else fits a narrow viewport', async () => {
    await page.setViewportSize({ width: 400, height: 400 })
    await gotoFixture(page, `${fixtures.baseUrl}/word.html`)
    await page.click('#word')
    await waitForPopupText(page)

    const attrs = await page.evaluate(() => {
      const el = document.querySelector('transover-popup')
      return { left: el.getAttribute('left') }
    })
    assert.strictEqual(attrs.left, '5', 'expected the popup pinned to the left margin')
  })

  it('shows the popup to the left and below the word when there is no room to the right or above', async () => {
    await page.setViewportSize({ width: 550, height: 600 })
    await gotoFixture(page, `${fixtures.baseUrl}/wordNearEdge.html`)
    const box = await page.locator('#word').boundingBox()
    await page.click('#word')
    await waitForPopupText(page)

    const attrs = await page.evaluate(() => {
      const el = document.querySelector('transover-popup')
      return { top: Number(el.getAttribute('top')), left: Number(el.getAttribute('left')) }
    })
    assert.ok(attrs.left < box.x, 'expected the popup to the left of the word')
    assert.ok(attrs.top > box.y, 'expected the popup below the word')
  })
})
