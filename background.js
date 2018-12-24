import Options from './lib/options'
import TransOver from './lib/transover_utils'

const _gaq = []
_gaq.push(['_setAccount', 'UA-46863240-1'])
_gaq.push(['_trackPageview'])

const ga = document.createElement('script')
ga.type = 'text/javascript'
ga.async = true
ga.src = 'https://ssl.google-analytics.com/ga.js'
const s = document.getElementsByTagName('script')[0]
s.parentNode.insertBefore(ga, s)

function translate(word, sl, tl, last_translation, onresponse, sendResponse, ga_event_name) {
  const options = {
    url: 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex',
    data: {
      q: word,
      sl: sl,
      tl: tl,
    },
    dataType: 'json',
    success: function on_success(data) {
      onresponse(data, word, tl, last_translation, sendResponse, ga_event_name)
    },
    error: function(xhr, status, e) {
      console.log({e: e, xhr: xhr})
    }
  }

  $.ajax(options)
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
  return sentences[0].trans.match(new RegExp(TransOver.regexp_escape(input), 'i'))
}

function on_translation_response(data, word, tl, last_translation, sendResponse, ga_event_name) {
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
        output.push({pos: t.pos, meanings: t.terms})
      })
    } else { // single word or sentence(s)
      data.sentences.forEach(function(s) {
        output.push(s.trans)
      })
      output = output.join(' ')
    }

    translation.sl = data.src
  }

  if (!( output instanceof String)) {
    output = JSON.stringify(output)
  }

  translation.translation = output

  $.extend(last_translation, translation)

  _gaq.push(['_trackEvent', ga_event_name, translation.sl, translation.tl])

  console.log('response: ', translation)
  sendResponse(translation)
}

const last_translation = {}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  switch (request.handler) {
  case 'get_last_tat_sl_tl':
    console.log('get_last_tat_sl_tl')
    sendResponse({last_tl: localStorage['last_tat_tl'], last_sl: localStorage['last_tat_sl']})
    break
  case 'get_options':
    sendResponse({
      options: JSON.stringify({
        except_urls: Options.except_urls(),
        only_urls: Options.only_urls(),
        target_lang: Options.target_lang(),
        reverse_lang: Options.reverse_lang(),
        delay: Options.delay(),
        word_key_only: Options.word_key_only(),
        selection_key_only: Options.selection_key_only(),
        tts: Options.tts(),
        tts_key: Options.tts_key(),
        popup_show_trigger: Options.popup_show_trigger(),
        translate_by: Options.translate_by(),
        show_from_lang: Options.show_from_lang()
      })
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
      _gaq.push(['_trackEvent', 'tts', last_translation.sl, last_translation.tl])

      const msg = new SpeechSynthesisUtterance()
      msg.lang = last_translation.sl
      msg.text = last_translation.word
      msg.rate = 0.7
      speechSynthesis.speak(msg)
    }
    sendResponse({})
    break
  default:
    console.log('Error! Unknown handler')
    sendResponse({})
  }
})

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.sendMessage(tab.id, 'open_type_and_translate')
})

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == 'install') {
    chrome.tabs.create({url: chrome.extension.getURL('options.html')})
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
