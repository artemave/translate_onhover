import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchBrowser, openContentPage, giftTranslation, closeOpenPages } from './support/contentPage.mjs'

describe('translating on mouse stop', () => {
  let browser

  before(async () => { browser = await launchBrowser() })
  after(async () => { await browser.close() })
  afterEach(closeOpenPages)

  async function translatedWords(content) {
    return (await content.sent('translate')).map(m => m.word)
  }

  it('hovering a word translates it in point mode', async () => {
    const content = await openContentPage(browser, 'text.html', {
      options: { translate_by: 'point' },
      responses: { translate: giftTranslation },
    })
    await content.moveToText('#delta', 'delta', 2)

    await content.waitForPopupText()
    assert.deepStrictEqual(await translatedWords(content), ['delta'])
    assert.strictEqual((await content.sent('trackEvent'))[0].event.params.action, 'point')
  })

  it('hovering a word does nothing in click mode', async () => {
    const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
    await content.moveToText('#delta', 'delta', 2)
    await content.settle()

    assert.deepStrictEqual(await translatedWords(content), [])
  })

  it('hovering a selection translates the selection', async () => {
    const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
    await content.select('#alpha', '#beta')
    await content.moveToText('#beta', 'beta', 1)

    await content.waitForPopupText()
    assert.deepStrictEqual(await translatedWords(content), ['alpha beta'])
    assert.strictEqual((await content.sent('trackEvent'))[0].event.params.action, 'select')
  })

  it('hovering the gap between the selected words translates the selection', async () => {
    const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
    await content.select('#alpha', '#beta')
    await content.moveToText('#sentence', ' ')

    await content.waitForPopupText()
    assert.deepStrictEqual(await translatedWords(content), ['alpha beta'])
  })

  it('hovering part of a selected word translates the selection', async () => {
    const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
    await content.select('#delta')
    await content.moveToText('#delta', 'delta', 1)

    await content.waitForPopupText()
    assert.deepStrictEqual(await translatedWords(content), ['delta'])
  })

  for (const [where, move] of [
    ['next to the selection', content => content.moveToText('#gamma', 'gamma', 2)],
    ['in another paragraph', content => content.moveToText('#delta', 'delta', 2)],
  ]) {
    it(`hovering a word ${where} translates that word in point mode`, async () => {
      const content = await openContentPage(browser, 'text.html', {
        options: { translate_by: 'point' },
        responses: { translate: giftTranslation },
      })
      await content.select('#alpha', '#beta')
      await move(content)

      await content.waitForPopupText()
      assert.notDeepStrictEqual(await translatedWords(content), ['alpha beta'])
    })

    it(`hovering a word ${where} translates nothing in click mode`, async () => {
      const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
      await content.select('#alpha', '#beta')
      await move(content)
      await content.settle()

      assert.deepStrictEqual(await translatedWords(content), [])
    })
  }

  it('waits for the delay option before translating', async () => {
    const content = await openContentPage(browser, 'text.html', {
      options: { translate_by: 'point', delay: 600 },
      responses: { translate: giftTranslation },
    })
    await content.moveToText('#delta', 'delta', 2)
    await content.settle()
    assert.deepStrictEqual(await translatedWords(content), [])

    await content.waitForPopupText()
  })

  it('a mouse jitter of a few pixels keeps the popup open', async () => {
    const content = await openContentPage(browser, 'text.html', {
      options: { translate_by: 'point' },
      responses: { translate: giftTranslation },
    })
    const { x, y } = await content.textPoint('#delta', 'delta', 2)
    await content.page.mouse.move(x, y)
    await content.waitForPopupText()

    await content.page.mouse.move(x + 3, y - 3)
    await content.settle()
    assert.match(await content.popupText(), /cadeau/)
    assert.strictEqual((await translatedWords(content)).length, 1)
  })

  for (const [direction, dx, dy] of [['right', 20, 0], ['left', -20, 0], ['down', 0, 20], ['up', 0, -20]]) {
    it(`moving the mouse ${direction} closes the popup`, async () => {
      const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
      const { x, y } = await content.textPoint('#delta', 'delta', 2)
      await content.page.mouse.click(x, y)
      await content.waitForPopupText()

      // The mouse-stop position is where the mouse last stopped, so let it
      // register first.
      await content.page.mouse.move(x + 1, y)
      await content.settle()
      await content.page.mouse.move(x + dx, y + dy)
      await content.waitForNoPopup()
    })
  }

  describe('moving away from the popup', () => {
    async function showPopup() {
      const content = await openContentPage(browser, 'word.html', { responses: { translate: giftTranslation } })
      await content.page.click('#word')
      await content.waitForPopupText()
      await content.page.evaluate(() => Promise.all(
        document.querySelector('transover-popup').shadowRoot.querySelector('main').getAnimations().map(animation => animation.finished)
      ))
      return content
    }

    function fadeOuts(content) {
      return content.page.evaluate(() =>
        document.querySelector('transover-popup').shadowRoot.querySelector('main').getAnimations()
          .map(animation => animation.effect.getKeyframes().map(keyframe => keyframe.opacity))
      )
    }

    it('fades the popup out once while the mouse keeps moving', async () => {
      const content = await showPopup()
      await content.page.mouse.move(600, 600)
      await content.page.mouse.move(650, 650)

      assert.deepStrictEqual(await fadeOuts(content), [['1', '0']])
      await content.waitForNoPopup()
    })

    it('fades out from the popup\'s current opacity', async () => {
      const content = await showPopup()
      await content.page.evaluate(() => {
        document.querySelector('transover-popup').shadowRoot.querySelector('main').style.opacity = '0.5'
      })
      await content.page.mouse.move(600, 600)

      assert.deepStrictEqual(await fadeOuts(content), [['0.5', '0']])
    })
  })

  it('scrolling closes the popup', async () => {
    const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
    await content.clickText('#delta', 'delta', 2)
    await content.waitForPopupText()

    await content.page.mouse.wheel(0, 300)
    await content.waitForNoPopup()
  })
})
