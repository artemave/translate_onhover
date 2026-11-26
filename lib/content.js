import {
  renderError,
  formatTranslation
} from './transover_utils'
import { languages } from './languages'
import { fadeIn, fadeOut } from './fade'
const debug = require('debug')('transover')
const popupTemplate = require('./popup.html')
const tatPopupTemplate = require('./tat_popup.html')

export function init(runtime) {
  let options
  let disable_on_this_page
  let disable_everywhere

  function copyToClipboard(text) {
    const input = document.createElement('input')
    input.style.position = 'fixed'
    input.style.opacity = 0
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
  }

  function ignoreThisPage(options) {
    const matchesThisPage = url => RegExp(url).test(window.location.href)
    const isBlacklisted = options.except_urls.some(matchesThisPage)
    const isWhitelisted = options.only_urls.length === 0 || options.only_urls.some(matchesThisPage)

    return isBlacklisted || !isWhitelisted
  }

  function removePopup(nodeType) {
    document.querySelectorAll(nodeType).forEach(popup => {
      debug(`removePopup ${nodeType}`)
      fadeOut(popup.shadowRoot.querySelector('main'), 200, () => popup.remove())
    })
  }

  function removeAllPopups() {
    ['transover-popup', 'transover-type-and-translate-popup'].forEach(nodeType => {
      removePopup(nodeType)
    })
  }

  function registerTransoverComponent(component) {
    const script = component + '.js'

    const s = document.createElement('script')
    s.type = 'text/javascript'
    s.src = runtime.getURL(script)
    s.async = true
    document.head.appendChild(s)
  }

  let last_translation

  function showPopup(e, content) {
    removeAllPopups()

    const popup = document.createElement('transover-popup')
    document.body.append(popup)
    popup.setAttribute('options', JSON.stringify(options))
    popup.setAttribute('theme', options.theme)

    // Filled from here rather than by popup.js: popup.js runs in the page's
    // world, where pages enforcing Trusted Types (e.g. Gmail) block innerHTML.
    const main = popup.shadowRoot.querySelector('main')
    main.innerHTML = content

    popup.setAttribute('outer-width', main.offsetWidth)
    popup.setAttribute('outer-height', main.offsetHeight)

    let textRect = {
      top: e.clientY,
      bottom: e.clientY,
      left: e.clientX,
      right: e.clientX,
    }

    const selection = window.getSelection()
    if (selection.toString()) {
      const selectionRect = selection.getRangeAt(0).getBoundingClientRect()
      textRect = {
        top: selectionRect.top,
        bottom: selectionRect.bottom,
        left: selectionRect.left,
        right: selectionRect.right,
      }
    }
    const pos = calculatePopupPosition(textRect, popup, main)

    popup.setAttribute('top', pos.y)
    popup.setAttribute('left', pos.x)
    fadeIn(main, 200)
  }

  function calculatePopupPosition(textRect, popup, main) {
    const pos = {}
    const margin = 5
    const anchor = 10
    const outerWidth = Number(popup.getAttribute('outer-width'))
    const outerHeight = Number(popup.getAttribute('outer-height'))
    const windowWidth = document.documentElement.clientWidth

    // show popup to the right of the word if it fits into window this way
    if (textRect.right + anchor + outerWidth + margin < windowWidth) {
      pos.x = textRect.right + anchor
    }
    // show popup to the left of the word if it fits into window this way
    else if (textRect.left - anchor - outerWidth - margin > 0) {
      pos.x = textRect.left - anchor - outerWidth
    }
    // align popup with selection start if it's too wide to be on the either sides
    else if (textRect.left + anchor + outerWidth + margin < windowWidth) {
      pos.x = textRect.left
    }
    // show popup at the very left if it is not wider than window
    else if (outerWidth + margin*2 < windowWidth) {
      pos.x = margin
    }
    // resize popup width to fit into window and position it the very left of the window
    else {
      const non_content_x = outerWidth - parseFloat(window.getComputedStyle(main).width)
      main.style.width = `${windowWidth - margin*2 - non_content_x}px`
      pos.x = margin
    }

    // show popup above the word if it fits into window this way
    if (textRect.top - anchor - outerHeight - margin > 0) {
      pos.y = textRect.top - anchor - outerHeight
    }
    // show popup below the word if it fits into window this way
    else if (textRect.bottom + anchor + outerHeight + margin < document.documentElement.clientHeight) {
      pos.y = textRect.bottom + anchor
    }
    // show popup at the very top of the window
    else {
      pos.y = margin
    }

    return pos
  }

  async function loadOptions() {
    // Exposes whether `options` is currently populated on the DOM - the state
    // itself lives in this isolated world's module scope, invisible to a
    // Playwright page.evaluate() in the main world, and there's no other
    // observable signal for "options just (re)loaded" that a test could wait
    // on instead of guessing a delay.
    document.documentElement.dataset.transoverOptionsLoaded = 'false'

    options = await new Promise((resolve) => {
      runtime.sendMessage({handler: 'get_options'}, resolve)
    })

    disable_on_this_page = ignoreThisPage(options)
    disable_everywhere = options.disable_everywhere
    runtime.sendMessage({
      handler: 'setIcon',
      disabled: disable_on_this_page || disable_everywhere
    })
    document.documentElement.dataset.transoverOptionsLoaded = 'true'
  }

  document.addEventListener('visibilitychange', function () {
    show_popup_key_pressed = false
    if (!document.hidden) {
      loadOptions()
    }
  }, false)

  function processEvent(e) {

    function getHitWord(e) {

      function wrap(node, tagName) {
        const wrapper = document.createElement(tagName)
        node.before(wrapper)
        wrapper.append(node)
        return wrapper
      }

      function restorable(node, do_stuff) {
        const wrapper = wrap(node, 'transwrapper')
        const res = do_stuff(node)
        wrapper.replaceWith(wrapper.textContent)
        return res
      }

      function getExactTextNode(text_nodes, e) {
        const blocks = text_nodes.map(node => wrap(node, 'transblock'))
        const hit = document.elementFromPoint(e.clientX, e.clientY)

        //not a block means we hit between the lines
        const hit_text_node = hit.nodeName == 'TRANSBLOCK' ? hit.childNodes[0] : null

        blocks.forEach(block => block.replaceWith(...block.childNodes))

        return hit_text_node
      }

      const hit_elem = document.elementFromPoint(e.clientX, e.clientY)
      const word_re = '\\p{L}+(?:[\'’]\\p{L}+)*'
      const hit_elem_style = window.getComputedStyle(hit_elem)
      const parent_font_style = {
        lineHeight: hit_elem_style.lineHeight,
        fontSize: '1em',
        fontFamily: hit_elem_style.fontFamily,
      }

      function inParentFont(tagName, text) {
        const element = document.createElement(tagName)
        element.textContent = text
        Object.assign(element.style, parent_font_style)
        return element
      }

      const text_nodes = [...hit_elem.childNodes].filter(node =>
        node.nodeType == Node.TEXT_NODE && new RegExp(word_re, 'u').test( node.nodeValue )
      )

      if (text_nodes.length == 0) {
        debug('no text')
        return ''
      }

      const hit_text_node = getExactTextNode(text_nodes, e)
      if (!hit_text_node) {
        debug('hit between lines')
        return ''
      }

      const hit_word = restorable(hit_text_node, function() {
        let hw = ''

        function getHitText(node) {
          debug('getHitText: \'' + node.textContent + '\'')

          if (new RegExp(word_re, 'u').test( node.textContent )) {
            const [, first_half, second_half] = node.textContent.match(new RegExp('^(.{'+Math.round( node.textContent.length/2 )+'}(?:\\p{L}|[\'’](?=\\p{L}))*)(.*)', 'us'))
            node.replaceWith(inParentFont('transblock', first_half), inParentFont('transblock', second_half))

            const next_node = document.elementFromPoint(e.clientX, e.clientY).childNodes[0]

            if (next_node.textContent == node.textContent) {
              return next_node
            }
            else {
              return getHitText(next_node)
            }
          }
          else {
            return null
          }
        }

        const minimal_text_node = getHitText(hit_text_node)

        if (minimal_text_node) {
          //wrap words inside text node into <transover> element (split puts the words at odd indexes)
          const parts = minimal_text_node.textContent.split(new RegExp('('+word_re+')', 'u'))
          minimal_text_node.replaceWith(...parts.map((part, i) => i % 2 ? inParentFont('transover', part) : part))

          //get the exact word under cursor
          const hit_word_elem = document.elementFromPoint(e.clientX, e.clientY)

          //no word under cursor? we are done
          if (hit_word_elem.nodeName != 'TRANSOVER') {
            debug('missed!')
          }
          else  {
            hw = hit_word_elem.textContent
            debug('got it: \''+hw+'\'')
          }
        }

        return hw
      })

      return hit_word
    }

    const selection = window.getSelection()
    const hit_elem = document.elementFromPoint(e.clientX, e.clientY)

    // happens sometimes on page resize (I think)
    if (!hit_elem) {
      return
    }

    function isInEditable(element) {
      return Boolean(element) && (element.isContentEditable || isInEditable(element.parentElement))
    }

    //skip inputs and editable divs
    if (/INPUT|TEXTAREA/.test( hit_elem.nodeName ) || isInEditable(hit_elem)) {

      return
    }

    let word = ''
    let isSelection = false
    let trackedAction = options.translate_by

    if (selection.toString()) {
      trackedAction = 'select'

      debug('Got selection: ' + selection.toString())

      let sel_container = selection.getRangeAt(0).commonAncestorContainer

      while (sel_container.nodeType != Node.ELEMENT_NODE) {
        sel_container = sel_container.parentNode
      }

      if (
      // only choose selection if mouse stopped within immediate parent of selection
        sel_container.contains(hit_elem)
          // and since it can still be quite a large area
          // narrow it down by only choosing selection if mouse points at the element that is (partially) inside selection
          && selection.containsNode(hit_elem, true)
          // But what is the point for the first part of condition? Well, without it, pointing at body for instance would also satisfy the second part
          // resulting in selection translation showing up in random places
      ) {
        word = selection.toString()
        isSelection = true
      }
      else if (options.translate_by == 'point') {
        word = getHitWord(e)
      }
    } else {
      word = getHitWord(e)
    }

    if (word != '') {
      runtime.sendMessage({
        handler: 'trackEvent',
        event: {
          name: 'translate',
          params: {
            action: trackedAction,
            characters: word.length
          }
        }
      })

      runtime.sendMessage({handler: 'translate', word, selection: isSelection}, function(response) {
        debug('response: ', response)

        if (response.error) {
          showPopup(e, renderError(response.message))
          return
        }

        if (!response.translation) {
          debug('skipping empty translation')
          return
        }

        last_translation = response.translation
        showPopup(e, formatTranslation(response.translation, response, options))
      })
    }
  }

  function withOptionsSatisfied(_, do_stuff) {
    if (!options || !options.target_lang) return

    //respect 'translate only when alt pressed' option
    if (options.word_key_only && !show_popup_key_pressed) return

    //respect "don't translate these sites"
    if (disable_on_this_page || disable_everywhere) return

    do_stuff()
  }

  function onMouseStop(e) {
    debug('processing mousestop')

    withOptionsSatisfied(e, function() {
      // translate selection unless 'translate selection on alt only' is set
      if (window.getSelection().toString()) {
        if (!options.selection_key_only) {
          processEvent(e)
        }
      } else {
        if (options.translate_by == 'point') {
          processEvent(e)
        }
      }
    })
  }

  document.addEventListener('click', function(e) {
    debug('processing click')

    withOptionsSatisfied(e, function() {
      if (options.translate_by != 'click') {
        return
      }
      if (e.target.closest('a')) {
        return
      }
      // If selection is present, the translation is already being taken care of by the 'mousestop' event.
      // Hence skipping it here to avoid double translation and flicker.
      if (window.getSelection().toString()) {
        return
      }

      processEvent(e)
    })
  })

  let show_popup_key_pressed = false

  function speak({ text, lang }) {
    // It seems that (at least at the moment) translate_tts blocks requests with Referer
    // This code below stops fetch from sending Referer header
    const meta = document.createElement('meta')
    meta.name = 'referrer'
    meta.content = 'never'
    document.getElementsByTagName('head')[0].appendChild(meta)

    const url = `https://translate.google.com/translate_tts?client=tw-ob&q=${encodeURI(text)}&tl=${lang}`

    // If this ever gets blocked, try iframe?
    // const iframe = document.createElement('iframe')
    // iframe.src = url
    // iframe.style.display = 'none'
    // document.body.appendChild(iframe)

    const audio = new Audio(url)
    audio.play()

    audio.oncanplay = () => {
      meta.remove()
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
    })

    audio.onended = () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }

  document.addEventListener('keydown', function(e) {
    if (!options) return

    if (e.key == options.popup_show_trigger) {
      show_popup_key_pressed = true

      const selection = window.getSelection().toString()

      if (options.selection_key_only && options.target_lang && selection) {
        debug('Got selection_key_only')

        runtime.sendMessage({handler: 'translate', word: selection, selection: true}, function(response) {
          debug('response: ', response)

          const xy = { clientX: last_mouse_stop.x, clientY: last_mouse_stop.y }

          if (response.error) {
            showPopup(xy, renderError(response.message))
            return
          }

          if (!response.translation) {
            debug('skipping empty translation')
            return
          }

          last_translation = response.translation
          showPopup(xy, formatTranslation(response.translation, response, options))
        })
      }
    }

    // text-to-speech on ctrl press
    if (!e.repeat && e.key == options.tts_key && options.tts && document.querySelector('transover-popup')) {
      runtime.sendMessage({
        handler: 'trackEvent',
        event: {
          name: 'tts',
          params: {
            operation: 'play'
          }
        }
      })

      runtime.sendMessage({ handler: 'getLastTranslationDetails' }, ({ word, sl, tl, isReverseTranslate, translation }) => {
        if (isReverseTranslate) {
          if (Array.isArray(translation)) {
            const toTts = translation.map(({ meanings }) => {
              return meanings.slice(0,5).join(', ')
            }).join('\n')

            debug('tts: ' + toTts + ', lang: ' + tl)
            speak({ text: toTts, lang: tl })

          } else {
            debug('tts: ' + translation + ', lang: ' + tl)
            speak({ text: translation, lang: tl })
          }
        } else {
          debug('tts: ' + word + ', lang: ' + sl)
          speak({ text: word, lang: sl })
        }
      })
    }

    // Hide tat popup on escape
    if (e.key == 'Escape') {
      removePopup('transover-type-and-translate-popup')
    }
  })

  document.addEventListener('keyup', function(e) {
    if (options && e.key == options.popup_show_trigger) {
      show_popup_key_pressed = false
    }
  })

  function hasMouseReallyMoved(e) { //or is it a tremor?
    const left_boundry = parseInt(last_mouse_stop.x) - 5,
      right_boundry  = parseInt(last_mouse_stop.x) + 5,
      top_boundry    = parseInt(last_mouse_stop.y) - 5,
      bottom_boundry = parseInt(last_mouse_stop.y) + 5

    return e.clientX > right_boundry || e.clientX < left_boundry || e.clientY > bottom_boundry || e.clientY < top_boundry
  }

  document.addEventListener('mousemove', function(e) {
    if (hasMouseReallyMoved(e)) {
      onMouseMoveWithoutNoise(e)
    }
  })

  let timer25
  const last_mouse_stop = {x: 0, y: 0}

  document.addEventListener('scroll', function() {
    removePopup('transover-popup')
  })

  function onMouseMoveWithoutNoise(e) {
    removePopup('transover-popup')

    clearTimeout(timer25)

    if (options) {
      let delay = options.delay

      if (window.getSelection().toString()) {
        if (options.selection_key_only) {
          delay = 200
        }
      } else {
        if (options.word_key_only) {
          delay = 200
        }
      }

      timer25 = setTimeout(function() {
        last_mouse_stop.x = e.clientX
        last_mouse_stop.y = e.clientY

        onMouseStop(e)
      }, delay)
    }
  }

  runtime.onMessage.addListener(
    function(request) {
      if (window != window.top) return

      if (request == 'open_type_and_translate') {
        if (!document.querySelector('transover-type-and-translate-popup')) {
          runtime.sendMessage({handler: 'get_last_tat_sl_tl'}, function(response) {
            const popup = document.createElement('transover-type-and-translate-popup')
            const popupLanguages = { ...languages }

            if (response.last_sl && popupLanguages[response.last_sl]) {
              popupLanguages[response.last_sl].selected_sl = true
            }
            popupLanguages[response.last_tl || options.target_lang].selected_tl = true

            popup.setAttribute('data-languages', JSON.stringify(popupLanguages))
            popup.setAttribute('data-disable_on_this_page', disable_on_this_page)
            popup.setAttribute('data-disable_everywhere', disable_everywhere)
            popup.setAttribute('theme', options.theme)
            document.body.append(popup)
            fadeIn(popup.shadowRoot.querySelector('main'), 200)
          })
        }
        else {
          removePopup('transover-type-and-translate-popup')
        }
      } else if (request == 'copy-translation-to-clipboard') {
        debug('received copy-translation-to-clipboard')
        if (document.querySelector('transover-popup')) {
          let toClipboard
          if (Array.isArray(last_translation)) {
            toClipboard = last_translation.map(t => {
              let line = ''
              if (t.pos) {
                line = t.pos + ': '
              }
              line = line + t.meanings.slice(0,5).join(', ')
              return line
            }).join('; ')
          } else {
            toClipboard = last_translation
          }
          copyToClipboard(toClipboard)
        }
      }
    }
  )

  document.documentElement.insertAdjacentHTML('beforeend', popupTemplate + tatPopupTemplate)
  registerTransoverComponent('popup')
  registerTransoverComponent('tat_popup')
  loadOptions()

  window.addEventListener('message', function(e) {
    // We only accept messages from ourselves
    if (e.source != window)
      return

    if (e.data.type == 'transoverTranslate') {
      runtime.sendMessage({handler: 'translate', word: e.data.text, sl: e.data.sl, tl: e.data.tl}, function(response) {
        debug('tat response: ', response)

        if (!response.translation) {
          debug('tat skipping empty translation')
          return
        }

        const e = { clientX: document.documentElement.clientWidth, clientY: 0 }
        last_translation = response.translation
        showPopup(e, formatTranslation(response.translation, response, options))
      })
    } else if (e.data.type === 'toggle_disable_on_this_page') {
      disable_on_this_page = e.data.disable_on_this_page
      runtime.sendMessage({
        handler: 'toggle_disable_on_this_page',
        disable_on_this_page,
        current_url: window.location.origin
      })

      const disabled = disable_everywhere || disable_on_this_page
      runtime.sendMessage({handler: 'setIcon', disabled})
      removePopup('transover-type-and-translate-popup')
    } else if (e.data.type === 'toggle_disable_everywhere') {
      disable_everywhere = e.data.disable_everywhere
      runtime.sendMessage({
        handler: 'toggle_disable_everywhere',
        disable_everywhere,
      })

      const disabled = disable_everywhere || disable_on_this_page
      runtime.sendMessage({handler: 'setIcon', disabled})
      removePopup('transover-type-and-translate-popup')
    } else if (e.data.type === 'tat_close') {
      removePopup('transover-type-and-translate-popup')
    } else if (e.data.type === 'transoverTrackEvent') {
      runtime.sendMessage({ handler: 'trackEvent', event: e.data.event })
    }
  })
}
