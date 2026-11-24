import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchBrowser, openContentPage, giftTranslation, origin, closeOpenPages } from './support/contentPage.mjs'

describe('options', () => {
  let browser

  before(async () => { browser = await launchBrowser() })
  after(async () => { await browser.close() })
  afterEach(closeOpenPages)

  async function translatedWords(content) {
    return (await content.sent('translate')).map(m => m.word)
  }

  async function iconDisabled(content) {
    const setIcon = await content.sent('setIcon')
    return !!setIcon[setIcon.length - 1].disabled
  }

  for (const [description, options, disabled] of [
    ['no url lists', {}, false],
    ['a matching except url', { except_urls: [`${origin}/word`] }, true],
    ['a non-matching except url', { except_urls: ['example.com'] }, false],
    ['a matching only url', { only_urls: ['transover.test'] }, false],
    ['a non-matching only url', { only_urls: ['example.com'] }, true],
    ['disable_everywhere', { disable_everywhere: 1 }, true],
  ]) {
    it(`${disabled ? 'does not translate' : 'translates'} with ${description}`, async () => {
      const content = await openContentPage(browser, 'word.html', { options, responses: { translate: giftTranslation } })
      await content.page.click('#word')
      await content.settle()

      assert.strictEqual(await iconDisabled(content), disabled)
      assert.deepStrictEqual(await translatedWords(content), disabled ? [] : ['gift'])
    })
  }

  it('word_key_only translates a click only while the trigger key is held', async () => {
    const content = await openContentPage(browser, 'word.html', {
      options: { word_key_only: 1 },
      responses: { translate: giftTranslation },
    })
    await content.page.click('#word')
    await content.settle()
    assert.deepStrictEqual(await translatedWords(content), [])

    await content.page.keyboard.down('Alt')
    await content.page.click('#word')
    await content.waitForPopupText()
    assert.deepStrictEqual(await translatedWords(content), ['gift'])

    await content.page.keyboard.up('Alt')
    await content.page.click('#word')
    await content.settle()
    assert.deepStrictEqual(await translatedWords(content), ['gift'])
  })

  it('word_key_only hovering translates after a short wait while the trigger key is held', async () => {
    const content = await openContentPage(browser, 'text.html', {
      options: { word_key_only: 1, translate_by: 'point', delay: 5000 },
      responses: { translate: giftTranslation },
    })
    await content.page.keyboard.down('Alt')
    await content.moveToText('#delta', 'delta', 2)

    await content.waitForPopupText('transover-popup', { timeout: 2000 })
    await content.page.keyboard.up('Alt')
  })

  it('ignores input until the options have loaded', async () => {
    const content = await openContentPage(browser, 'text.html', {
      options: { translate_by: 'point' },
      responses: { translate: giftTranslation },
      held: ['get_options'],
    })
    await content.moveToText('#delta', 'delta', 2)
    await content.page.keyboard.press('Alt')
    await content.clickText('#delta', 'delta', 2)
    await content.settle()
    assert.deepStrictEqual(await translatedWords(content), [])

    await content.release('get_options')
    await content.waitForOptionsLoaded()
    await content.moveToText('#delta', 'delta', 4)
    await content.waitForPopupText()
  })

  it('reloads the options when the page becomes visible again', async () => {
    const content = await openContentPage(browser, 'word.html', { responses: { translate: giftTranslation } })
    await content.setOptions({ disable_everywhere: 1 })
    await content.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await content.waitForSent('setIcon', 2)

    await content.page.click('#word')
    await content.settle()
    assert.deepStrictEqual(await translatedWords(content), [])
  })

  it('does not reload the options when the page is hidden', async () => {
    const content = await openContentPage(browser, 'word.html', { responses: { translate: giftTranslation } })
    await content.goto('word.html')

    const [firstPage] = await content.sentByPreviousPages()
    assert.strictEqual(firstPage.filter(m => m.handler === 'get_options').length, 1)
  })
})
