import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchBrowser, openContentPage, giftTranslation, closeOpenPages } from './support/contentPage.mjs'

describe('keyboard', () => {
  let browser

  before(async () => { browser = await launchBrowser() })
  after(async () => { await browser.close() })
  afterEach(closeOpenPages)

  async function translatedWords(content) {
    return (await content.sent('translate')).map(m => m.word)
  }

  describe('selection_key_only', () => {
    async function selectAndPressTrigger(response) {
      const content = await openContentPage(browser, 'text.html', {
        options: { selection_key_only: 1, delay: 5000 },
        responses: { translate: response },
      })
      await content.select('#alpha', '#beta')
      await content.moveToText('#beta', 'beta', 1)
      await content.settle()
      assert.deepStrictEqual(await translatedWords(content), [], 'translated on mouse stop without the trigger key')

      await content.page.keyboard.press('Alt')
      await content.waitForSent('translate')
      return content
    }

    it('the trigger key translates the selection', async () => {
      const content = await selectAndPressTrigger(giftTranslation)

      assert.match(await content.waitForPopupText(), /cadeau/)
      assert.deepStrictEqual(await translatedWords(content), ['alpha beta'])
    })

    it('the trigger key shows an error from the background', async () => {
      const content = await selectAndPressTrigger({ error: true, message: 'Translation request failed with status 500.' })

      assert.match(await content.waitForPopupText(), /Error! Translation request failed with status 500/)
    })

    it('the trigger key does nothing before a target language is chosen', async () => {
      const content = await openContentPage(browser, 'text.html', { options: { selection_key_only: 1, target_lang: undefined } })
      await content.select('#alpha', '#beta')
      await content.page.keyboard.press('Alt')
      await content.settle()

      assert.deepStrictEqual(await translatedWords(content), [])
      assert.strictEqual(await content.popupText(), null)
    })

    it('the trigger key shows nothing for an empty translation', async () => {
      const content = await selectAndPressTrigger({ translation: '' })
      await content.settle()

      assert.strictEqual(await content.popupText(), null)
    })

    it('the trigger key does nothing without a selection', async () => {
      const content = await openContentPage(browser, 'text.html', {
        options: { selection_key_only: 1 },
        responses: { translate: giftTranslation },
      })
      await content.page.keyboard.press('Alt')
      await content.settle()

      assert.deepStrictEqual(await translatedWords(content), [])
    })
  })

  it('other keys do nothing', async () => {
    const content = await openContentPage(browser, 'text.html', {
      options: { selection_key_only: 1 },
      responses: { translate: giftTranslation },
    })
    await content.select('#alpha')
    await content.page.keyboard.press('a')
    await content.settle()

    assert.deepStrictEqual(await translatedWords(content), [])
  })

  describe('text to speech', () => {
    async function showTranslation(details, options = {}) {
      const content = await openContentPage(browser, 'word.html', {
        options: { tts: 1, ...options },
        responses: { translate: giftTranslation, getLastTranslationDetails: details },
      })
      await content.page.click('#word')
      await content.waitForPopupText()
      return content
    }

    // Returns what was spoken and in which language, once the audio has
    // loaded (speak() removes its no-referrer <meta> then).
    async function pressTtsKey(content) {
      const request = content.page.waitForRequest(request => request.url().includes('translate_tts'))
      await content.page.keyboard.press('Shift')
      const params = new URL((await request).url()).searchParams
      await content.page.waitForFunction(() => !document.querySelector('meta[name=referrer]'))
      return [params.get('q'), params.get('tl')]
    }

    it('the tts key speaks the translated word in its own language', async () => {
      const content = await showTranslation({ word: 'gift', sl: 'en', tl: 'fr', isReverseTranslate: false, translation: giftTranslation.translation })

      assert.deepStrictEqual(await pressTtsKey(content), ['gift', 'en'])
      assert.deepStrictEqual((await content.sent('trackEvent')).map(m => m.event.name), ['translate', 'tts'])
    })

    it('when reverse translating, speaks the translation\'s meanings', async () => {
      const translation = [{ pos: 'noun', meanings: ['one', 'two', 'three', 'four', 'five', 'six'] }, { meanings: ['seven'] }]
      const content = await showTranslation({ word: 'gift', sl: 'en', tl: 'fr', isReverseTranslate: true, translation })

      assert.deepStrictEqual(await pressTtsKey(content), ['one, two, three, four, five\nseven', 'fr'])
    })

    it('when reverse translating a sentence, speaks the translated sentence', async () => {
      const content = await showTranslation({ word: 'gift', sl: 'en', tl: 'fr', isReverseTranslate: true, translation: 'le cadeau' })

      assert.deepStrictEqual(await pressTtsKey(content), ['le cadeau', 'fr'])
    })

    // Whether the audio actually stopped isn't observable from the page -
    // speak()'s Audio is never attached to the document.
    it('keys pressed while speaking, including Escape, do not throw', async () => {
      const content = await showTranslation({ word: 'gift', sl: 'en', tl: 'fr', isReverseTranslate: false, translation: 'cadeau' })
      await pressTtsKey(content)
      await content.page.keyboard.press('a')
      await content.page.keyboard.press('Escape')
      await content.settle()
    })

    it('holding the tts key speaks once', async () => {
      const content = await showTranslation({ word: 'gift', sl: 'en', tl: 'fr', isReverseTranslate: false, translation: 'cadeau' })
      await content.page.keyboard.down('Shift')
      await content.page.keyboard.down('Shift')
      await content.page.keyboard.up('Shift')
      await content.settle()

      assert.strictEqual((await content.sent('getLastTranslationDetails')).length, 1)
    })

    it('the tts key does nothing with tts off', async () => {
      const content = await showTranslation({}, { tts: 0 })
      await content.page.keyboard.press('Shift')
      await content.settle()

      assert.deepStrictEqual(await content.sent('getLastTranslationDetails'), [])
    })

    it('the tts key does nothing without a translation popup', async () => {
      const content = await openContentPage(browser, 'word.html', { options: { tts: 1 } })
      await content.page.keyboard.press('Shift')
      await content.settle()

      assert.deepStrictEqual(await content.sent('getLastTranslationDetails'), [])
    })
  })
})
