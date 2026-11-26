import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert'
import { createServer } from 'node:http'
import { init } from '../lib/background.js'
import { createLocalStorage } from '../lib/storage.js'
import { createOptions } from '../lib/options.js'
import { createTracker } from '../lib/tracking.js'
import { createFakeStorage } from '../test-support/fakeChrome.mjs'
import { capturedTranslateResponse } from './e2e/support/googleStub.mjs'

// Stands in for both Google Translate APIs and Google Analytics.
// `server.translate` answers translate requests; by default it replays the
// captured real responses the e2e suite uses.
async function startGoogleServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, server.origin)
    let body = ''
    for await (const chunk of req) body += chunk

    if (url.pathname === '/mp/collect') {
      server.analytics.push(...JSON.parse(body).events)
      res.end()
      return
    }

    server.translateRequests.push(url)
    const { status = 200, json } = await server.translate(url)
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(json))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  server.origin = `http://127.0.0.1:${server.address().port}`
  server.reset = () => {
    server.analytics = []
    server.translateRequests = []
    server.translate = async url => ({ json: JSON.parse(await capturedTranslateResponse(url)) })
  }
  server.reset()
  return server
}

function waitFor(condition) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const check = () => {
      if (condition()) return resolve()
      if (Date.now() - started > 5000) return reject(new Error(`timed out waiting for ${condition}`))
      setTimeout(check, 10)
    }
    check()
  })
}

describe('background', () => {
  let google

  before(async () => { google = await startGoogleServer() })
  after(() => google.close())
  beforeEach(() => google.reset())

  function startBackground({ items = { target_lang: 'fr' }, tabLanguage = 'und', devOptions = {}, translateOrigin = google.origin } = {}) {
    const chrome = createFakeStorage(items)
    const listeners = { message: [], installed: [], clicked: [], command: [] }
    const calls = { setIcon: [], createdTabs: [], tabMessages: [] }
    const localStorage = createLocalStorage(chrome)

    init({
      runtime: {
        onMessage: { addListener: listener => listeners.message.push(listener) },
        onInstalled: { addListener: listener => listeners.installed.push(listener) },
        getURL: path => `chrome-extension://transover/${path}`,
      },
      action: {
        setIcon: details => calls.setIcon.push(details),
        onClicked: { addListener: listener => listeners.clicked.push(listener) },
      },
      tabs: {
        detectLanguage: (tabId, callback) => setTimeout(() => callback(tabLanguage)),
        create: properties => calls.createdTabs.push(properties),
        query: (query, callback) => setTimeout(() => callback([{ id: 7 }])),
        sendMessage: (tabId, message) => calls.tabMessages.push([tabId, message]),
      },
      commands: {
        onCommand: { addListener: listener => listeners.command.push(listener) },
      },
      localStorage,
      options: createOptions(localStorage),
      trackEvent: createTracker({ url: `${google.origin}/mp/collect`, clientId: 'client' }),
      devOptions,
      translateOrigins: { dict: translateOrigin, gtx: translateOrigin },
      logger: { log() {}, error() {} },
    })

    return {
      items: chrome.items,
      calls,
      listeners,
      send(request) {
        return new Promise(resolve => {
          const keepsChannelOpen = listeners.message[0](request, {}, resolve)
          assert.strictEqual(keepsChannelOpen, true)
        })
      },
    }
  }

  describe('translate', () => {
    it('translates with the dictionary API', async () => {
      const background = startBackground()
      const response = await background.send({ handler: 'translate', word: 'gift' })

      assert.strictEqual(response.succeeded, true)
      assert.strictEqual(response.sl, 'en')
      assert.strictEqual(response.tl, 'fr')
      assert.strictEqual(response.isReverseTranslate, false)
      assert.ok(response.translation.some(block => block.pos === 'noun' && block.meanings.includes('le cadeau')))
      assert.deepStrictEqual(google.translateRequests.map(url => url.searchParams.get('client')), ['dict-chrome-ex'])
    })

    it('replies with the error when Google is unreachable', async () => {
      const background = startBackground({ translateOrigin: 'http://127.0.0.1:1' })

      assert.deepStrictEqual(await background.send({ handler: 'translate', word: 'gift' }), {
        error: true,
        message: 'fetch failed',
      })
    })

    it('falls back to the gtx API when the dictionary API answers in an unknown format', async () => {
      const background = startBackground()
      google.translate = async url => url.searchParams.get('client') === 'gtx'
        ? { json: JSON.parse(await capturedTranslateResponse(url)) }
        : { json: { unexpected: true } }
      const response = await background.send({ handler: 'translate', word: 'gift' })

      assert.strictEqual(response.succeeded, true)
      assert.deepStrictEqual(google.translateRequests.map(url => url.searchParams.get('client')), ['dict-chrome-ex', 'gtx'])
    })

    it('falls back to the gtx API when the dictionary API fails', async () => {
      const background = startBackground()
      google.translate = async url => url.searchParams.get('client') === 'gtx'
        ? { json: JSON.parse(await capturedTranslateResponse(url)) }
        : { status: 500, json: {} }
      const response = await background.send({ handler: 'translate', word: 'gift' })

      assert.strictEqual(response.succeeded, true)
      await waitFor(() => google.analytics.length === 1)
      assert.deepStrictEqual(google.analytics, [
        { name: 'error', params: { operation: 'translate', api: 'dict-chrome-ex', message: 'Internal Server Error' } },
      ])
    })

    it('reports the status when both APIs fail', async () => {
      const background = startBackground()
      google.translate = async () => ({ status: 503, json: {} })

      assert.deepStrictEqual(await background.send({ handler: 'translate', word: 'gift' }), {
        error: true,
        message: 'Translation request failed with status 503.',
      })
      await waitFor(() => google.analytics.length === 2)
      assert.deepStrictEqual(google.analytics.map(event => event.params.api).sort(), ['dict-chrome-ex', 'gtx'])
    })

    it('backs off for 30 minutes when rate limited, reporting it every third attempt', async () => {
      const background = startBackground()
      google.translate = async () => ({ status: 429, json: {} })
      const blocked = { error: true, message: 'Too many requests - translation is temporary disabled. Will retry in 30 minutes.' }

      assert.deepStrictEqual(await background.send({ handler: 'translate', word: 'gift' }), blocked)
      assert.ok(Math.abs(background.items.blockExpiresAt - (Date.now() + 30 * 60 * 1000)) < 5000)

      const requestsBeforeBlock = google.translateRequests.length
      assert.deepStrictEqual(await background.send({ handler: 'translate', word: 'gift' }), {})
      assert.deepStrictEqual(await background.send({ handler: 'translate', word: 'gift' }), {})
      assert.deepStrictEqual(await background.send({ handler: 'translate', word: 'gift' }), blocked)
      assert.strictEqual(google.translateRequests.length, requestsBeforeBlock)
    })

    it('translates again once the back-off has expired', async () => {
      const background = startBackground({ items: { target_lang: 'fr', blockExpiresAt: Date.now() - 1000, blockedErrorCount: 5 } })

      assert.strictEqual((await background.send({ handler: 'translate', word: 'gift' })).succeeded, true)
    })

    it('translates the other way on pages in the target language when reverse_lang is set', async () => {
      const background = startBackground({ items: { target_lang: 'fr', reverse_lang: 'en' }, tabLanguage: 'fr' })
      google.translate = async () => ({ json: { sentences: [{ trans: 'gift' }], src: 'fr' } })
      const response = await background.send({ handler: 'translate', word: 'cadeau' })

      assert.strictEqual(response.isReverseTranslate, true)
      assert.strictEqual(response.tl, 'en')
      assert.strictEqual(response.translation, 'gift')
      assert.deepStrictEqual([google.translateRequests[0].searchParams.get('sl'), google.translateRequests[0].searchParams.get('tl')], ['fr', 'en'])
    })

    it('translates normally on pages in the target language without reverse_lang', async () => {
      const background = startBackground({ items: { target_lang: 'fr' }, tabLanguage: 'fr' })
      const response = await background.send({ handler: 'translate', word: 'gift' })

      assert.strictEqual(response.isReverseTranslate, false)
      assert.strictEqual(response.tl, 'fr')
    })

    it('autodetects the language of a selection whatever from_lang says', async () => {
      const background = startBackground({ items: { target_lang: 'fr', from_lang: 'de' } })
      google.translate = async () => ({ json: { sentences: [{ trans: 'un cadeau' }], src: 'en' } })
      const response = await background.send({ handler: 'translate', word: 'a gift', selection: true })

      assert.strictEqual(response.sl, 'en')
      assert.deepStrictEqual([google.translateRequests[0].searchParams.get('sl'), google.translateRequests[0].searchParams.get('tl')], ['auto', 'fr'])
    })

    it('translates a hovered word from from_lang', async () => {
      const background = startBackground({ items: { target_lang: 'fr', from_lang: 'de' } })
      google.translate = async () => ({ json: { sentences: [{ trans: 'cadeau' }], src: 'de' } })
      await background.send({ handler: 'translate', word: 'Geschenk' })

      assert.strictEqual(google.translateRequests[0].searchParams.get('sl'), 'de')
    })

    it('uses the type-and-translate languages and remembers them', async () => {
      const background = startBackground()
      await background.send({ handler: 'translate', word: 'geschenk', sl: 'fr', tl: 'de' })

      assert.deepStrictEqual([google.translateRequests[0].searchParams.get('sl'), google.translateRequests[0].searchParams.get('tl')], ['fr', 'de'])
      assert.deepStrictEqual(await background.send({ handler: 'get_last_tat_sl_tl' }), { last_sl: 'fr', last_tl: 'de' })
    })

    it('says so when there is no translation', async () => {
      const background = startBackground()
      const response = await background.send({ handler: 'translate', word: 'zxqvbnmghjk' })

      assert.strictEqual(response.succeeded, false)
      assert.strictEqual(response.translation, 'Oops.. No translation found.')
    })

    it('returns an empty translation when there is none and do_not_show_oops is set', async () => {
      const background = startBackground({ items: { target_lang: 'fr', do_not_show_oops: 1 } })

      assert.strictEqual((await background.send({ handler: 'translate', word: 'zxqvbnmghjk' })).translation, '')
    })
  })

  describe('getLastTranslationDetails', () => {
    it('returns the last successful translation', async () => {
      const background = startBackground()
      const translation = await background.send({ handler: 'translate', word: 'gift' })

      assert.deepStrictEqual(await background.send({ handler: 'getLastTranslationDetails' }), translation)
    })

    it('returns nothing after a failed translation', async () => {
      const background = startBackground()
      await background.send({ handler: 'translate', word: 'zxqvbnmghjk' })

      assert.deepStrictEqual(await background.send({ handler: 'getLastTranslationDetails' }), {})
    })

    it('returns nothing before any translation', async () => {
      assert.deepStrictEqual(await startBackground().send({ handler: 'getLastTranslationDetails' }), {})
    })
  })

  it('get_options returns every option', async () => {
    const background = startBackground({ items: { target_lang: 'fr', translate_by: 'point' } })
    const options = await background.send({ handler: 'get_options' })

    assert.strictEqual(options.target_lang, 'fr')
    assert.strictEqual(options.translate_by, 'point')
    assert.strictEqual(options.delay, 700)
    assert.deepStrictEqual(Object.keys(options).sort(), Object.keys(createOptions()).sort())
  })

  it('trackEvent forwards the event to analytics', async () => {
    const background = startBackground()
    assert.deepStrictEqual(await background.send({ handler: 'trackEvent', event: { name: 'tts' } }), {})

    await waitFor(() => google.analytics.length === 1)
    assert.deepStrictEqual(google.analytics, [{ name: 'tts' }])
  })

  it('setIcon switches between the colour and grey icons', async () => {
    const background = startBackground()
    await background.send({ handler: 'setIcon', disabled: true })
    await background.send({ handler: 'setIcon', disabled: false })

    assert.deepStrictEqual(background.calls.setIcon, [{ path: 'to_bw_38.png' }, { path: 'to_38.png' }])
  })

  describe('toggle_disable_on_this_page', () => {
    for (const [description, saved, disable, expected] of [
      ['adds the page to except_urls', ['a.com'], true, ['https://b.com', 'a.com']],
      ['does not add the page twice', ['https://b.com'], true, ['https://b.com']],
      ['removes the page from except_urls', ['a.com', 'https://b.com'], false, ['a.com']],
      ['leaves except_urls alone when the page is not in it', ['a.com'], false, ['a.com']],
    ]) {
      it(description, async () => {
        const background = startBackground({ items: { except_urls: saved } })
        await background.send({ handler: 'toggle_disable_on_this_page', disable_on_this_page: disable, current_url: 'https://b.com' })

        assert.deepStrictEqual(background.items.except_urls, expected)
      })
    }
  })

  it('toggle_disable_everywhere turns translation off and on everywhere', async () => {
    const background = startBackground()
    await background.send({ handler: 'toggle_disable_everywhere', disable_everywhere: true })
    assert.strictEqual(background.items.disable_everywhere, 1)

    await background.send({ handler: 'toggle_disable_everywhere', disable_everywhere: false })
    assert.strictEqual(background.items.disable_everywhere, 0)
  })

  it('answers unknown requests with nothing', async () => {
    assert.deepStrictEqual(await startBackground().send({ handler: 'nonsense' }), {})
  })

  it('the toolbar button opens type-and-translate in the tab', () => {
    const background = startBackground()
    background.listeners.clicked[0]({ id: 3 })

    assert.deepStrictEqual(background.calls.tabMessages, [[3, 'open_type_and_translate']])
  })

  describe('keyboard commands', () => {
    it('copy-translation-to-clipboard asks the active tab to copy', async () => {
      const background = startBackground()
      background.listeners.command[0]('copy-translation-to-clipboard')

      await waitFor(() => background.calls.tabMessages.length === 1)
      assert.deepStrictEqual(background.calls.tabMessages, [[7, 'copy-translation-to-clipboard']])
    })

    it('ignores unknown commands', () => {
      const background = startBackground()
      background.listeners.command[0]('nonsense')

      assert.deepStrictEqual(background.calls.tabMessages, [])
    })
  })

  describe('install', () => {
    it('opens the options page', () => {
      const background = startBackground()
      background.listeners.installed[0]({ reason: 'install' })

      assert.deepStrictEqual(background.calls.createdTabs, [{ url: 'chrome-extension://transover/options.html' }])
    })

    it('does not open the options page on update', () => {
      const background = startBackground()
      background.listeners.installed[0]({ reason: 'update' })

      assert.deepStrictEqual(background.calls.createdTabs, [])
    })

    it('does not open the options page in the dev browsers', () => {
      const background = startBackground({ devOptions: { target_lang: 'de' } })
      background.listeners.installed[0]({ reason: 'install' })

      assert.deepStrictEqual(background.calls.createdTabs, [])
    })
  })

  it('seeds dev options without overriding saved ones', async () => {
    const background = startBackground({ items: { target_lang: 'fr' }, devOptions: { target_lang: 'de', translate_by: 'point' } })

    await waitFor(() => background.items.translate_by === 'point')
    assert.strictEqual(background.items.target_lang, 'fr')
  })
})
