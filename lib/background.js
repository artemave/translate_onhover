import { generateUrls, parseResponse, googleOrigins } from './apiClient.mjs'

const blockTimeoutMs = 30000 * 60
const minutes = new Intl.NumberFormat('en', { style: 'unit', unit: 'minute', unitDisplay: 'long' })

// devOptions pre-fills options for the dev browsers (scripts/browser.mjs)
// without overriding anything already set. Empty in every other build.
export function init({ runtime, action, tabs, commands, localStorage, options, trackEvent, devOptions, translateOrigins = googleOrigins, logger = console }) {
  function blockedErrorMessage(blockExpiresAt) {
    return `Too many requests - translation is temporary disabled. Will retry in ${minutes.format(Math.ceil((blockExpiresAt - Date.now()) / 60000))}.`
  }

  // Next time url fails:
  // - install Google Translate extension: https://chrome.google.com/webstore/detail/google-translate/aapbdbdomjkkjkaonfhkkikfgjllcleb
  // - click on extension button to show popup
  // - inspect popup to see the requests
  async function translate(word, sl, tl, last_translation, onresponse, isReverseTranslate) {
    const blockExpiresAt = await localStorage.get('blockExpiresAt') || 0
    const blockedErrorCount = await localStorage.get('blockedErrorCount') || 0

    if (Date.now() < blockExpiresAt) {
      await localStorage.set('blockedErrorCount', blockedErrorCount + 1)

      if (blockedErrorCount % 3 === 0) {
        return {message: blockedErrorMessage(blockExpiresAt), error: true}
      } else {
        return {}
      }
    }

    const urls = generateUrls(word, { sl, tl }, translateOrigins)

    const rateLimitedApi = async () => {
      const response = await fetch(urls[1])

      if (response.ok) {
        const data = await response.json()
        return await onresponse(data, word, tl, last_translation, isReverseTranslate)
      } else {
        trackEvent({
          name: 'error',
          params: {
            operation: 'translate',
            api: 'gtx',
            message: response.statusText,
          }
        })
        logger.error(response)

        if (response.status == 429) {
          const newBlockExpiresAt = Date.now() + blockTimeoutMs
          await localStorage.set('blockExpiresAt', newBlockExpiresAt)
          await localStorage.set('blockedErrorCount', 1)
          return {message: blockedErrorMessage(newBlockExpiresAt), error: true}
        }

        return {message: `Translation request failed with status ${response.status}.`, error: true}
      }
    }

    const response = await fetch(urls[0])

    if (response.ok) {
      let data = await response.json()
      // Is this API still returns expected json structure?
      if (data.sentences) {
        return await onresponse(data, word, tl, last_translation, isReverseTranslate)
      } else {
        // Fallback to rate limited API
        return await rateLimitedApi()
      }
    } else {
      trackEvent({
        name: 'error',
        params: {
          operation: 'translate',
          api: 'dict-chrome-ex',
          message: response.statusText,
        }
      })
      logger.error(response)

      return await rateLimitedApi()
    }
  }

  async function figureOutSlTl(tab_lang) {
    const res = {}

    if (await options.target_lang() == tab_lang && await options.reverse_lang()) {
      res.tl = await options.reverse_lang()
      res.sl = await options.target_lang()
      res.isReverseTranslate = true
      logger.log('reverse translate into: ', {tl: res.tl, sl: res.sl})
    }
    else {
      res.tl = await options.target_lang()
      res.sl = await options.from_lang()
      res.isReverseTranslate = false
      logger.log('normal translate into:', {tl: res.tl, sl: res.sl})
    }

    return res
  }

  async function on_translation_response(data, word, tl, last_translation, isReverseTranslate) {
    let output

    logger.log('raw_translation: ', data)

    const { succeeded, sl, parsed } = parseResponse(data, word)
    const translation = { tl, succeeded, sl, word, isReverseTranslate }

    if (succeeded) {
      output = parsed
    } else {
      if (await options.do_not_show_oops()) {
        output = ''
      } else {
        output = 'Oops.. No translation found.'
      }
    }

    translation.translation = output

    Object.assign(last_translation, translation)
    await localStorage.set('last_translation', last_translation)

    logger.log('response: ', translation)
    return translation
  }

  async function detectLanguage(request) {
    return new Promise(resolve => {
      tabs.detectLanguage(null, async function(tab_lang) {
        // hack: presence of request.tl/sl means this came from popup translate
        if (request.tl && request.sl) {
          await localStorage.set('last_tat_tl', request.tl)
          await localStorage.set('last_tat_sl', request.sl)
          resolve({tl: request.tl, sl: request.sl})
        } else {
          const sltl = await figureOutSlTl(tab_lang)
          if (request.selection) {
            sltl.sl = 'auto'
          }
          resolve(sltl)
        }
      })
    })
  }

  async function contentScriptListener(request) {
    const except_urls = await options.except_urls()
    const last_translation = await localStorage.get('last_translation') || {}

    switch (request.handler) {
    case 'get_last_tat_sl_tl':
      logger.log('get_last_tat_sl_tl')
      return {
        last_tl: await localStorage.get('last_tat_tl'),
        last_sl: await localStorage.get('last_tat_sl')
      }
    case 'get_options': {
      const values = {}
      const promises = Object.keys(options).map(async key => {
        values[key] = await options[key]()
      })
      await Promise.all(promises)

      return values
    }
    case 'translate': {
      logger.log('received to translate: ' + request.word)

      const {sl, tl, isReverseTranslate} = await detectLanguage(request)
      return await translate(request.word, sl, tl, last_translation, on_translation_response, isReverseTranslate)
    }
    case 'getLastTranslationDetails':
      if (last_translation.succeeded) {
        return last_translation
      }
      return {}
    case 'trackEvent':
      trackEvent(request.event)
      return {}
    case 'setIcon':
      action.setIcon({path: request.disabled ? 'to_bw_38.png' : 'to_38.png'})
      return {}
    case 'toggle_disable_on_this_page':
      if (request.disable_on_this_page) {
        if (!except_urls.find(u => u.match(request.current_url))) {
          await options.except_urls(
            [request.current_url, ...except_urls]
          )
        }
      } else {
        if (except_urls.find(u => u.match(request.current_url))) {
          await options.except_urls(
            except_urls.filter(u => !u.match(request.current_url))
          )
        }
      }
      break
    case 'toggle_disable_everywhere':
      if (request.disable_everywhere) {
        await options.disable_everywhere(1)
      } else {
        await options.disable_everywhere(0)
      }
      break
    default:
      logger.error('Unknown request', JSON.stringify(request, null, 2))
      return {}
    }
  }

  runtime.onMessage.addListener(function(request, sender, sendResponse) {
    contentScriptListener(request).then(
      sendResponse,
      error => sendResponse({message: error.message, error: true})
    )
    // Without this, firefox sends empty async response
    // Details: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage
    return true
  })

  action.onClicked.addListener(function(tab) {
    tabs.sendMessage(tab.id, 'open_type_and_translate')
  })

  async function seedOptions(defaults) {
    for (const [key, value] of Object.entries(defaults)) {
      if (await localStorage.get(key) === undefined) {
        await localStorage.set(key, value)
      }
    }
  }
  seedOptions(devOptions)

  runtime.onInstalled.addListener(function(details) {
    if (details.reason == 'install' && Object.keys(devOptions).length === 0) {
      tabs.create({url: runtime.getURL('options.html')})
    }
  })

  commands.onCommand.addListener(function(command) {
    switch (command) {
    case 'copy-translation-to-clipboard':
      tabs.query({active: true}, ([activeTab]) => {
        tabs.sendMessage(activeTab.id, 'copy-translation-to-clipboard')
      })
      break
    default:
      logger.log('Unknown command %s', command)
    }
  })
}
