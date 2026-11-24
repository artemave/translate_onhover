import { openHarnessPage, origin } from './harnessPage.mjs'

export { launchBrowser, closeOpenPages, origin } from './harnessPage.mjs'

// What lib/background.js's get_options returns on a fresh install with a target
// language chosen.
export const defaultOptions = {
  except_urls: [],
  only_urls: [],
  target_lang: 'fr',
  from_lang: 'auto',
  reverse_lang: undefined,
  word_key_only: 0,
  selection_key_only: 0,
  tts: 0,
  tts_key: 'Shift',
  translate_by: 'click',
  delay: 50,
  do_not_show_oops: 0,
  popup_show_trigger: 'Alt',
  show_from_lang: true,
  fontSize: 14,
  theme: 'light',
  disable_everywhere: 0,
}

export const giftTranslation = {
  translation: [{ pos: 'noun', meanings: ['cadeau', 'don'] }],
  sl: 'en',
  tl: 'fr',
}

// Opens `fixture` with the content script running against a fake
// chrome.runtime (see contentHarness.js). `responses` are the replies, by handler,
// to runtime.sendMessage; handlers in `held` don't reply until release().
export async function openContentPage(browser, fixture, { options = {}, responses = {}, held = [], viewport } = {}) {
  const harnessPage = await openHarnessPage(browser, {
    responses: { get_options: { ...defaultOptions, ...options }, ...responses },
    held,
  }, { viewport })
  const { page } = harnessPage

  const content = {
    ...harnessPage,

    async goto(fixture) {
      await page.goto(`${origin}/${fixture}`)
      if (!held.includes('get_options')) await content.waitForOptionsLoaded()
    },

    async waitForOptionsLoaded() {
      await page.waitForFunction(() => document.documentElement.dataset.transoverOptionsLoaded === 'true')
    },

    setOptions(changes) {
      return page.evaluate(changes => Object.assign(window.transoverHarness.responses.get_options, changes), changes)
    },

    // Messages sent by each page this one navigated away from, oldest first.
    sentByPreviousPages() {
      return page.evaluate(() => JSON.parse(sessionStorage.getItem('transoverSent')))
    },

    setResponse(handler, response, frame = page) {
      return frame.evaluate(([handler, response]) => { window.transoverHarness.responses[handler] = response }, [handler, response])
    },

    release(handler, frame = page) {
      return frame.evaluate(handler => window.transoverHarness.release(handler), handler)
    },

    deliver(request, frame = page) {
      return frame.evaluate(request => window.transoverHarness.deliver(request), request)
    },

    sent(handler, frame = page) {
      return frame.evaluate(handler => window.transoverHarness.sent.filter(m => m.handler === handler), handler)
    },

    async waitForSent(handler, count = 1) {
      await page.waitForFunction(([handler, count]) =>
        window.transoverHarness.sent.filter(m => m.handler === handler).length >= count, [handler, count])
      return content.sent(handler)
    },

    popupText(nodeType = 'transover-popup') {
      return page.evaluate(nodeType => {
        const popups = document.querySelectorAll(nodeType)
        return popups[popups.length - 1]?.shadowRoot.querySelector('main').innerText.trim() ?? null
      }, nodeType)
    },

    async waitForPopupText(nodeType = 'transover-popup', { timeout } = {}) {
      const handle = await page.waitForFunction(nodeType => {
        const popups = document.querySelectorAll(nodeType)
        return popups[popups.length - 1]?.shadowRoot.querySelector('main').innerText.trim()
      }, nodeType, { timeout })
      return handle.jsonValue()
    },

    async waitForNoPopup(nodeType = 'transover-popup') {
      await page.waitForFunction(nodeType => document.querySelectorAll(nodeType).length === 0, nodeType)
    },

    popupBox() {
      return page.evaluate(() => {
        const popups = document.querySelectorAll('transover-popup')
        const popup = popups[popups.length - 1]
        const rect = popup.shadowRoot.querySelector('main').getBoundingClientRect()
        return {
          left: Number(popup.getAttribute('left')),
          top: Number(popup.getAttribute('top')),
          width: rect.width,
          height: rect.height,
          outerWidth: Number(popup.getAttribute('outer-width')),
          outerHeight: Number(popup.getAttribute('outer-height')),
        }
      })
    },

    // Viewport coordinates of the middle of `text`'s `offset`-th character
    // inside `selector`, for hitting an exact spot in a line of text.
    textPoint(selector, text, offset = 0) {
      return page.evaluate(([selector, text, offset]) => {
        const walker = document.createTreeWalker(document.querySelector(selector), NodeFilter.SHOW_TEXT)
        let found = false
        while (!found && walker.nextNode()) found = walker.currentNode.nodeValue.includes(text)
        if (!found) throw new Error(`No text node in ${selector} contains '${text}'`)
        const range = document.createRange()
        const start = walker.currentNode.nodeValue.indexOf(text) + offset
        range.setStart(walker.currentNode, start)
        range.setEnd(walker.currentNode, start + 1)
        const rect = range.getBoundingClientRect()
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      }, [selector, text, offset])
    },

    async clickText(selector, text, offset = 0) {
      const { x, y } = await content.textPoint(selector, text, offset)
      await page.mouse.click(x, y)
    },

    async moveToText(selector, text, offset = 0) {
      const { x, y } = await content.textPoint(selector, text, offset)
      await page.mouse.move(x, y)
    },

    // Selects from the start of `fromSelector`'s text to the end of
    // `toSelector`'s.
    select(fromSelector, toSelector = fromSelector) {
      return page.evaluate(([fromSelector, toSelector]) => {
        const range = document.createRange()
        range.setStartBefore(document.querySelector(fromSelector).firstChild)
        range.setEndAfter(document.querySelector(toSelector).lastChild)
        window.getSelection().removeAllRanges()
        window.getSelection().addRange(range)
      }, [fromSelector, toSelector])
    },

    // Nothing to wait on for "nothing happened" - give any handler time to
    // fire (the default delay option is 50ms), then check.
    async settle() {
      await page.waitForTimeout(200)
    },
  }

  await content.goto(fixture)
  return content
}
