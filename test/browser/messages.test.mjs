import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchBrowser, openContentPage, giftTranslation, origin, closeOpenPages } from './support/contentPage.mjs'

const tat = 'transover-type-and-translate-popup'

describe('messages', () => {
  let browser

  before(async () => { browser = await launchBrowser() })
  after(async () => { await browser.close() })
  afterEach(closeOpenPages)

  function tatPopup(content) {
    return content.page.locator(tat)
  }

  async function openTat(content) {
    await content.deliver('open_type_and_translate')
    await tatPopup(content).locator('#tat_input').waitFor()
  }

  function selectedLanguages(content) {
    return content.page.evaluate(tat => {
      const popup = document.querySelector(tat).shadowRoot
      return [popup.querySelector('#tat_from_lang').value, popup.querySelector('#tat_to_lang').value]
    }, tat)
  }

  describe('type and translate', () => {
    for (const [description, lastLanguages, expected] of [
      ['the last used languages', { last_sl: 'de', last_tl: 'es' }, ['de', 'es']],
      ['autodetect for an unknown last source language', { last_sl: 'xx', last_tl: 'es' }, ['auto', 'es']],
      ['autodetect and the target language when nothing was used yet', {}, ['auto', 'fr']],
    ]) {
      it(`opens with ${description}`, async () => {
        const content = await openContentPage(browser, 'word.html', { responses: { get_last_tat_sl_tl: lastLanguages } })
        await openTat(content)

        assert.deepStrictEqual(await selectedLanguages(content), expected)
      })
    }

    it('swaps the languages', async () => {
      const content = await openContentPage(browser, 'word.html', { responses: { get_last_tat_sl_tl: { last_sl: 'de', last_tl: 'es' } } })
      await openTat(content)
      await tatPopup(content).locator('#swap_languages').click()

      assert.deepStrictEqual(await selectedLanguages(content), ['es', 'de'])
    })

    it('cannot swap with an autodetected source language', async () => {
      const content = await openContentPage(browser, 'word.html', { responses: { get_last_tat_sl_tl: { last_sl: 'de', last_tl: 'es' } } })
      await openTat(content)
      const swap = tatPopup(content).locator('#swap_languages')

      await tatPopup(content).locator('#tat_from_lang').selectOption('auto')
      assert.match(await swap.getAttribute('class'), /disabled/)
      await swap.click()
      assert.deepStrictEqual(await selectedLanguages(content), ['auto', 'es'])

      await tatPopup(content).locator('#tat_from_lang').selectOption('de')
      assert.doesNotMatch(await swap.getAttribute('class'), /disabled/)
    })

    it('opening it again closes it', async () => {
      const content = await openContentPage(browser, 'word.html', { responses: { get_last_tat_sl_tl: {} } })
      await openTat(content)
      await content.deliver('open_type_and_translate')

      await content.waitForNoPopup(tat)
    })

    for (const [how, close] of [
      ['Escape', content => content.page.keyboard.press('Escape')],
      ['its close link', content => tatPopup(content).locator('#tat_close').click()],
    ]) {
      it(`closes with ${how}`, async () => {
        const content = await openContentPage(browser, 'word.html', { responses: { get_last_tat_sl_tl: {} } })
        await openTat(content)
        await close(content)

        await content.waitForNoPopup(tat)
      })
    }

    it('translates the typed text', async () => {
      const content = await openContentPage(browser, 'word.html', {
        responses: { get_last_tat_sl_tl: { last_sl: 'en', last_tl: 'fr' }, translate: giftTranslation },
      })
      await openTat(content)
      await tatPopup(content).locator('#tat_input').fill('gift')
      await tatPopup(content).locator('#tat_input').press('Enter')

      assert.match(await content.waitForPopupText(), /cadeau/)
      assert.deepStrictEqual(await content.sent('translate'), [{ handler: 'translate', word: 'gift', sl: 'en', tl: 'fr' }])
      assert.deepStrictEqual((await content.sent('trackEvent')).map(m => m.event.params.action), ['popup'])
    })

    it('shows nothing for an empty translation', async () => {
      const content = await openContentPage(browser, 'word.html', {
        responses: { get_last_tat_sl_tl: {}, translate: { translation: '' } },
      })
      await openTat(content)
      await tatPopup(content).locator('#tat_input').fill('gift')
      await tatPopup(content).locator('#tat_input').press('Enter')
      await content.waitForSent('translate')
      await content.settle()

      assert.strictEqual(await content.popupText(), null)
    })

    for (const [checkbox, handler, flag] of [
      ['#disable_on_this_page', 'toggle_disable_on_this_page', 'disable_on_this_page'],
      ['#disable_everywhere', 'toggle_disable_everywhere', 'disable_everywhere'],
    ]) {
      it(`${checkbox} turns translation off and closes the popup`, async () => {
        const content = await openContentPage(browser, 'word.html', {
          responses: { get_last_tat_sl_tl: {}, translate: giftTranslation },
        })
        await openTat(content)
        await tatPopup(content).locator(checkbox).check()
        await content.waitForNoPopup(tat)

        const [toggle] = await content.sent(handler)
        assert.strictEqual(toggle[flag], true)
        if (flag === 'disable_on_this_page') assert.strictEqual(toggle.current_url, origin)
        const setIcon = await content.sent('setIcon')
        assert.strictEqual(setIcon[setIcon.length - 1].disabled, true)

        await content.page.click('#word')
        await content.settle()
        assert.deepStrictEqual(await content.sent('translate'), [])
      })
    }

    it('unchecking #disable_everywhere turns translation back on', async () => {
      const content = await openContentPage(browser, 'word.html', {
        options: { disable_everywhere: 1 },
        responses: { get_last_tat_sl_tl: {}, translate: giftTranslation },
      })
      await openTat(content)
      await tatPopup(content).locator('#disable_everywhere').uncheck()
      await content.waitForNoPopup(tat)

      const setIcon = await content.sent('setIcon')
      assert.strictEqual(setIcon[setIcon.length - 1].disabled, false)
      await content.page.click('#word')
      await content.waitForPopupText()
    })

    it('ignores other window messages', async () => {
      const content = await openContentPage(browser, 'word.html', { responses: { get_last_tat_sl_tl: {} } })
      await openTat(content)
      await content.page.evaluate(() => window.postMessage({ type: 'something else' }, '*'))
      await content.settle()

      assert.strictEqual(await tatPopup(content).count(), 1)
    })
  })

  describe('copy translation to clipboard', () => {
    async function copy(translation) {
      const content = await openContentPage(browser, 'word.html', { responses: { translate: { ...giftTranslation, translation } } })
      await content.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin })
      await content.page.evaluate(() => navigator.clipboard.writeText('unchanged'))
      await content.page.click('#word')
      await content.waitForPopupText()

      await content.deliver('copy-translation-to-clipboard')
      const clipboard = await content.page.evaluate(() => navigator.clipboard.readText())
      return clipboard
    }

    it('copies dictionary meanings, five per part of speech', async () => {
      const translation = [{ pos: 'noun', meanings: ['one', 'two', 'three', 'four', 'five', 'six'] }, { meanings: ['seven'] }]
      assert.strictEqual(await copy(translation), 'noun: one, two, three, four, five; seven')
    })

    it('copies a sentence translation as is', async () => {
      assert.strictEqual(await copy('le cadeau'), 'le cadeau')
    })

    it('copies nothing without a translation popup', async () => {
      const content = await openContentPage(browser, 'word.html')
      await content.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin })
      await content.page.evaluate(() => navigator.clipboard.writeText('unchanged'))
      await content.deliver('copy-translation-to-clipboard')

      assert.strictEqual(await content.page.evaluate(() => navigator.clipboard.readText()), 'unchanged')
    })
  })

  it('ignores unknown background messages', async () => {
    const content = await openContentPage(browser, 'word.html')
    await content.deliver('something else')
    await content.settle()
  })

  describe('in an iframe', () => {
    function frame(content) {
      return content.page.frames().find(f => f.url().endsWith('/word.html'))
    }

    it('ignores background messages', async () => {
      const content = await openContentPage(browser, 'iframe.html', { responses: { get_last_tat_sl_tl: {} } })
      await frame(content).waitForFunction(() => document.documentElement.dataset.transoverOptionsLoaded === 'true')
      await content.deliver('open_type_and_translate', frame(content))
      await content.settle()

      assert.strictEqual(await frame(content).locator(tat).count(), 0)
      assert.deepStrictEqual(await content.sent('get_last_tat_sl_tl', frame(content)), [])
    })

    it('the parent page ignores window messages from it', async () => {
      const content = await openContentPage(browser, 'iframe.html', { responses: { get_last_tat_sl_tl: {} } })
      await frame(content).evaluate(() => window.parent.postMessage({ type: 'transoverTrackEvent', event: {} }, '*'))
      await content.settle()

      assert.deepStrictEqual(await content.sent('trackEvent'), [])
    })
  })
})
