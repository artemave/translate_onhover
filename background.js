/* eslint-disable no-console */
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
import addMilliseconds from 'date-fns/addMilliseconds'
import Options from './lib/options'
import {regexp_escape} from './lib/transover_utils'
import trackEvent from './lib/tracking'

const blockTimeoutMs = 30000 * 60
let blockExpiresAt = new Date()
let blockedErrorCount = 0

function blockedErrorMessage() {
  return `Too many requests - translation is temporary disabled. Will retry in ${formatDistanceToNow(blockExpiresAt)}.`
}

// Next time url fails:
// - install Google Translate extension: https://chrome.google.com/webstore/detail/google-translate/aapbdbdomjkkjkaonfhkkikfgjllcleb
// - click on extension button to show popup
// - inspect popup to see the requests
async function translate(word, sl, tl, last_translation, onresponse, sendResponse, ga_event_name) {
  if (new Date() < blockExpiresAt) {
    if (blockedErrorCount % 3 === 0) {
      sendResponse({message: blockedErrorMessage(), error: true})
    } else {
      sendResponse()
    }
    blockedErrorCount++
    return
  }

  const encoded = `sl=${sl}&tl=${tl}&q=${encodeURIComponent(word)}`
  const urls = [
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&tbb=1&ie=UTF-8&oe=UTF-8&${encoded}`,
    `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd&dj=1&source=input&${encoded}`,
  ]
  const rateLimitedApi = async () => {
    const response = await window.fetch(urls[1])

    if (response.ok) {
      const data = await response.json()
      onresponse(data, word, tl, last_translation, sendResponse, ga_event_name)
    } else {
      trackEvent({
        ec: 'error',
        ea: 'translate',
        el: `dict-chrome-ex API: ${response.statusText}`,
        ev: 1
      })
      console.error(response)

      if (response.status == 429) {
        blockedErrorCount = 1
        blockExpiresAt = addMilliseconds(new Date(), blockTimeoutMs)
        sendResponse({message: blockedErrorMessage(), error: true})
      }
    }
  }

  const response = await window.fetch(urls[0])

  if (response.ok) {
    let data = await response.json()
    // Is this API still returns expected json structure?
    if (data.sentences) {
      onresponse(data, word, tl, last_translation, sendResponse, ga_event_name)
    } else {
      // Fallback to rate limited API
      rateLimitedApi()
    }
  } else {
    trackEvent({
      ec: 'error',
      ea: 'translate',
      el: `gtx API: ${response.statusText}`,
      ev: 1
    })
    console.error(response)

    rateLimitedApi()
  }
}

function figureOutSlTl(tab_lang) {
  const res = {}

  if (Options.target_lang() == tab_lang && Options.reverse_lang()) {
    res.tl = Options.reverse_lang()
    res.sl = Options.target_lang()
    console.log('reverse translate into: ', {tl: res.tl, sl: res.sl})
  }
  else {
    res.tl = Options.target_lang()
    res.sl = Options.from_lang()
    console.log('normal translate into:', {tl: res.tl, sl: res.sl})
  }

  return res
}

function translationIsTheSameAsInput(sentences, input) {
  input = input.replace(/^ *| *$/g, '')
  return sentences[0].trans.match(new RegExp(regexp_escape(input), 'i'))
}

function on_translation_response(data, word, tl, last_translation, sendResponse) {
  let output
  const translation = {tl: tl}

  console.log('raw_translation: ', data)

  if ((!data.dict && !data.sentences) || (!data.dict && translationIsTheSameAsInput(data.sentences, word))) {
    translation.succeeded = false

    if (Options.do_not_show_oops()) {
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

  console.log('response: ', translation)
  sendResponse(translation)
}

const last_translation = {}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  const except_urls = Options.except_urls()

  switch (request.handler) {
  case 'get_last_tat_sl_tl':
    console.log('get_last_tat_sl_tl')
    sendResponse({
      last_tl: localStorage['last_tat_tl'],
      last_sl: localStorage['last_tat_sl']
    })
    break
  case 'get_options':
    sendResponse({
      options: JSON.stringify(
        Object.keys(Options).reduce((result, key) => {
          result[key] = Options[key]()
          return result
        }, {})
      )
    })
    break
  case 'translate':
    console.log('received to translate: ' + request.word)

    chrome.tabs.detectLanguage(null, function(tab_lang) {
      let sl, tl
      // hack: presence of request.tl/sl means this came from popup translate
      if (request.tl && request.sl) {
        localStorage['last_tat_tl'] = request.tl
        localStorage['last_tat_sl'] = request.sl
        sl = request.sl
        tl = request.tl
      } else {
        const sltl = figureOutSlTl(tab_lang)
        sl = sltl.sl
        tl = sltl.tl
      }
      translate(request.word, sl, tl, last_translation, on_translation_response, sendResponse, Options.translate_by())
    })
    break
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
    sendResponse({})
    break
  case 'trackEvent':
    trackEvent(request.event)
    sendResponse({})
    break
  case 'setIcon':
    chrome.browserAction.setIcon({path: request.disabled ? 'to_bw_38.png' : 'to_38.png'})
    break
  case 'toggle_disable_on_this_page':
    if (request.disable_on_this_page) {
      if (!except_urls.find(u => u.match(request.current_url))) {
        Options.except_urls(
          [request.current_url, ...except_urls]
        )
      }
    } else {
      if (except_urls.find(u => u.match(request.current_url))) {
        Options.except_urls(
          except_urls.filter(u => !u.match(request.current_url))
        )
      }
    }
    break
  default:
    console.error('Unknown request', JSON.stringify(request, null, 2))
    sendResponse({})
  }
  // Without this, firefox sends empty async response
  // Details: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage
  return true
})

chrome.browserAction.onClicked.addListener(function(tab) {
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
