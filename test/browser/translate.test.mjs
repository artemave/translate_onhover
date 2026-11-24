import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchBrowser, openContentPage, giftTranslation, closeOpenPages } from './support/contentPage.mjs'

describe('translating on click', () => {
  let browser

  before(async () => { browser = await launchBrowser() })
  after(async () => { await browser.close() })
  afterEach(closeOpenPages)

  async function translatedWords(content) {
    return (await content.sent('translate')).map(m => m.word)
  }

  it('clicking a word shows its translation', async () => {
    const content = await openContentPage(browser, 'word.html', { responses: { translate: giftTranslation } })
    await content.page.click('#word')

    assert.match(await content.waitForPopupText(), /noun: cadeau, don/)
    assert.deepStrictEqual(await translatedWords(content), ['gift'])
    assert.deepStrictEqual(await content.sent('trackEvent'), [
      { handler: 'trackEvent', event: { name: 'translate', params: { action: 'click', characters: 4 } } }
    ])
  })

  it('finds the word under the cursor inside a longer text node', async () => {
    const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
    await content.clickText('#dots', 'gift', 1)

    await content.waitForPopupText()
    assert.deepStrictEqual(await translatedWords(content), ['gift'])
  })

  it('leaves the page text as it was', async () => {
    const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
    const paragraph = () => content.page.$eval('#escapes', el => el.parentElement.innerHTML)
    const before = await paragraph()
    await content.clickText('#escapes', 'c')
    await content.waitForPopupText()

    assert.strictEqual(await paragraph(), before)
  })

  for (const [letter, word] of [['a', 'a'], ['c', 'c'], ['d', 'd']]) {
    it(`finds '${word}' among <, > and & in "a<b>c&d"`, async () => {
      const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
      await content.clickText('#escapes', letter)

      await content.waitForPopupText()
      assert.deepStrictEqual(await translatedWords(content), [word])
    })
  }

  const nothingToTranslate = [
    ['punctuation next to a word', content => content.clickText('#missed', '.')],
    ['punctuation in a separate part of the text', content => content.clickText('#dots', '.', 8)],
    ['the padding around a paragraph', content => content.page.click('#padded', { position: { x: 5, y: 5 } })],
    ['an element without text', content => content.page.click('#no-text')],
    ['an input', content => content.page.click('#input')],
    ['a textarea', content => content.page.click('#textarea')],
    ['a contenteditable element', content => content.clickText('#editable', 'gift')],
    ['a non-editable element inside a contenteditable one', content => content.page.click('#not-editable')],
    ['a link', content => content.page.click('#link')],
  ]

  for (const [where, click] of nothingToTranslate) {
    it(`clicking ${where} translates nothing`, async () => {
      const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
      await click(content)
      await content.settle()

      assert.deepStrictEqual(await translatedWords(content), [])
    })
  }

  it('clicking a word does nothing in point mode', async () => {
    const content = await openContentPage(browser, 'word.html', {
      options: { translate_by: 'point', delay: 5000 },
      responses: { translate: giftTranslation },
    })
    await content.page.click('#word')
    await content.settle()

    assert.deepStrictEqual(await translatedWords(content), [])
  })

  it('clicking outside the viewport translates nothing', async () => {
    const content = await openContentPage(browser, 'text.html', { responses: { translate: giftTranslation } })
    await content.page.evaluate(() => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: -10, clientY: -10 }))
    })
    await content.settle()

    assert.deepStrictEqual(await translatedWords(content), [])
  })

  it('clicking a selected word does not translate it a second time', async () => {
    const content = await openContentPage(browser, 'word.html', { responses: { translate: giftTranslation } })
    await content.page.dblclick('#word')
    await content.waitForPopupText()
    await content.settle()

    assert.deepStrictEqual(await translatedWords(content), ['gift', 'gift'])
  })

  it('shows an error from the background', async () => {
    const content = await openContentPage(browser, 'word.html', {
      responses: { translate: { error: true, message: 'Translation request failed with status 500.' } }
    })
    await content.page.click('#word')

    assert.match(await content.waitForPopupText(), /Error! Translation request failed with status 500/)
  })

  it('does nothing before a target language is chosen', async () => {
    const content = await openContentPage(browser, 'word.html', { options: { target_lang: undefined } })
    await content.page.click('#word')
    await content.settle()

    assert.deepStrictEqual(await content.sent('translate'), [])
    assert.strictEqual(await content.popupText(), null)
  })

  it('shows nothing for an empty translation', async () => {
    const content = await openContentPage(browser, 'word.html', { responses: { translate: { translation: '' } } })
    await content.page.click('#word')
    await content.waitForSent('translate')
    await content.settle()

    assert.strictEqual(await content.popupText(), null)
  })
})
