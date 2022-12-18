/* eslint-disable no-console */
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
import addMilliseconds from 'date-fns/addMilliseconds'
import Options from './lib/options'
import {regexp_escape} from './lib/transover_utils'
import trackEvent from './lib/tracking'
import { localStorage } from './lib/storage'

const blockTimeoutMs = 30000 * 60
const browserAction = chrome[process.env.MANIFEST_V3 === 'true' ? 'action' : 'browserAction']

function blockedErrorMessage(blockExpiresAt) {
  return `Too many requests - translation is temporary disabled. Will retry in ${formatDistanceToNow(blockExpiresAt)}.`
}

// Next time url fails:
// - install Google Translate extension: https://chrome.google.com/webstore/detail/google-translate/aapbdbdomjkkjkaonfhkkikfgjllcleb
// - click on extension button to show popup
// - inspect popup to see the requests
async function translate(word, sl, tl, last_translation, onresponse, ga_event_name) {
  const blockExpiresAt = await localStorage.get('blockExpiresAt') || new Date()
  const blockedErrorCount = await localStorage.get('blockedErrorCount') || 0

  if (new Date() < blockExpiresAt) {
    await localStorage.set('blockedErrorCount', blockedErrorCount + 1)

    if (blockedErrorCount % 3 === 0) {
      return {message: blockedErrorMessage(blockExpiresAt), error: true}
    } else {
      return {}
    }
  }

  const encoded = `sl=${sl}&tl=${tl}&q=${encodeURIComponent(word.trim())}`
  const urls = [
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&tbb=1&ie=UTF-8&oe=UTF-8&${encoded}`,
    `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd&dj=1&source=input&${encoded}`,
  ]
  const rateLimitedApi = async () => {
    const response = await fetch(urls[1])

    if (response.ok) {
      const data = await response.json()
      return await onresponse(data, word, tl, last_translation, ga_event_name)
    } else {
      trackEvent({
        ec: 'error',
        ea: 'translate',
        el: `dict-chrome-ex API: ${response.statusText}`,
        ev: 1
      })
      console.error(response)

      if (response.status == 429) {
        await chrome.storage.sync.set({blockExpiresAt: addMilliseconds(new Date(), blockTimeoutMs), blockedErrorCount: 1})
        return {message: blockedErrorMessage(blockExpiresAt), error: true}
      }
    }
  }

  const response = await fetch(urls[0])

  if (response.ok) {
    let data = await response.json()
    // Is this API still returns expected json structure?
    if (data.sentences) {
      return await onresponse(data, word, tl, last_translation, ga_event_name)
    } else {
      // Fallback to rate limited API
      return await rateLimitedApi()
    }
  } else {
    trackEvent({
      ec: 'error',
      ea: 'translate',
      el: `gtx API: ${response.statusText}`,
      ev: 1
    })
    console.error(response)

    return await rateLimitedApi()
  }
}

async function figureOutSlTl(tab_lang) {
  const res = {}

  if (await Options.target_lang() == tab_lang && await Options.reverse_lang()) {
    res.tl = await Options.reverse_lang()
    res.sl = await Options.target_lang()
    console.log('reverse translate into: ', {tl: res.tl, sl: res.sl})
  }
  else {
    res.tl = await Options.target_lang()
    res.sl = await Options.from_lang()
    console.log('normal translate into:', {tl: res.tl, sl: res.sl})
  }

  return res
}

function translationIsTheSameAsInput(sentences, input) {
  input = input.replace(/^ *| *$/g, '')
  return sentences[0].trans.match(new RegExp(regexp_escape(input), 'i'))
}

async function on_translation_response(data, word, tl, last_translation) {
  let output
  const translation = {tl: tl}

  console.log('raw_translation: ', data)

  if ((!data.dict && !data.sentences) || (!data.dict && translationIsTheSameAsInput(data.sentences, word))) {
    translation.succeeded = false

    if (await Options.do_not_show_oops()) {
      output = ''
    } else {
      output = 'Oops.. No translation found.'
    }
  } else {
    translation.succeeded = true
    translation.word = word

    output = []
    if (data.dict) { // full translation
      data.dict.forEach(function(t) {
        const translationItem = {pos: t.pos, meanings: t.terms}

        output.push(translationItem)

        if (t.pos === 'noun' && data.query_inflections) {
          for (let i of data.query_inflections) {
            if (i.written_form === word && i.features.gender) {
              if (i.features.gender === 1)
                translationItem.gender = 'm'
              if (i.features.gender === 2)
                translationItem.gender = 'f'
              if (i.features.gender === 3)
                translationItem.gender = 'n'
              break
            }
          }
        }
      })
    } else { // single word or sentence(s)
      data.sentences.forEach(function(s) {
        output.push(s.trans)
      })
      output = output.join(' ')
    }

    translation.sl = data.src
  }

  if (!(output instanceof String)) {
    output = JSON.stringify(output)
  }

  translation.translation = output

  Object.assign(last_translation, translation)
  await localStorage.set('last_translation', last_translation)

  console.log('response: ', translation)
  return translation
}

async function detectLanguage(request) {
  return new Promise(resolve => {
    chrome.tabs.detectLanguage(null, async function(tab_lang) {
      // hack: presence of request.tl/sl means this came from popup translate
      if (request.tl && request.sl) {
        await localStorage.set('last_tat_tl', request.tl)
        await localStorage.set('last_tat_sl', request.sl)
        resolve({tl: request.tl, sl: request.sl})
      } else {
        const sltl = await figureOutSlTl(tab_lang)
        resolve(sltl)
      }
    })
  })
}

async function contentScriptListener(request) {
  const except_urls = await Options.except_urls()
  const last_translation = await localStorage.get('last_translation') || {}

  switch (request.handler) {
  case 'get_last_tat_sl_tl':
    console.log('get_last_tat_sl_tl')
    return {
      last_tl: await localStorage.get('last_tat_tl'),
      last_sl: await localStorage.get('last_tat_sl')
    }
  case 'get_options': { // Only used by Manifest V2 version
    let options = {}
    const promises = Object.keys(Options).map(async key => {
      options[key] = await Options[key]()
    })
    await Promise.all(promises)

    return JSON.stringify(options)
  }
  case 'translate': {
    console.log('received to translate: ' + request.word)

    const {sl, tl} = await detectLanguage(request)

    return await translate(request.word, sl, tl, last_translation, on_translation_response, await Options.translate_by())
  }
  case 'tts':
    if (last_translation.succeeded) {
      console.log('tts: ' + last_translation.word + ', sl: ' + last_translation.sl)
      trackEvent({ec: 'tts', ea: 'play'})

      const msg = new SpeechSynthesisUtterance()
      msg.lang = last_translation.sl
      msg.text = last_translation.word
      msg.rate = 0.7
      speechSynthesis.speak(msg)
    }
    return {}
  case 'trackEvent':
    trackEvent(request.event)
    return {}
  case 'setIcon':
    browserAction.setIcon({path: request.disabled ? 'to_bw_38.png' : 'to_38.png'})
    return {}
  case 'toggle_disable_on_this_page':
    if (request.disable_on_this_page) {
      if (!except_urls.find(u => u.match(request.current_url))) {
        await Options.except_urls(
          [request.current_url, ...except_urls]
        )
      }
    } else {
      if (except_urls.find(u => u.match(request.current_url))) {
        await Options.except_urls(
          except_urls.filter(u => !u.match(request.current_url))
        )
      }
    }
    break
  default:
    console.error('Unknown request', JSON.stringify(request, null, 2))
    return {}
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  contentScriptListener(request).then(sendResponse)
  // Without this, firefox sends empty async response
  // Details: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage
  return true
})

browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.sendMessage(tab.id, 'open_type_and_translate')
})

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == 'install') {
    chrome.tabs.create({url: chrome.runtime.getURL('options.html')})
  }
})

chrome.commands.onCommand.addListener(function(command) {
  switch (command) {
  case 'copy-translation-to-clipboard':
    chrome.tabs.query({active: true}, ([activeTab]) => {
      chrome.tabs.sendMessage(activeTab.id, 'copy-translation-to-clipboard')
    })
    break
  default:
    console.log('Unknown command %s', command)
  }
})
