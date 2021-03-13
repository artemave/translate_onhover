import TransOver from './lib/transover_utils'
import TransOverLanguages from './lib/languages'
const popupTemplate = require('./lib/popup.html')
const tatPopupTemplate = require('./lib/tat_popup.html')

let debug
if (process.env.NODE_ENV !== 'production') {
  debug = require('debug')('transover')
} else {
  debug = () => {}
}

let options
let disable_on_this_page

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
  const isBlacklisted = $.grep(options.except_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0
  const isWhitelisted = $.grep(options.only_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0 ||
    options.only_urls.length === 0

  return isBlacklisted || !isWhitelisted
}

function createPopup(nodeType) {
  return $(document.createElement(nodeType))
}

function removePopup(nodeType) {
  $(nodeType).each(function() {
    $(this.shadowRoot.querySelector('main')).fadeOut('fast', () => this.remove())
  })
}

function registerTransoverComponent(component) {
  const script = component + '.js'

  const s = document.createElement('script')
  s.type = 'text/javascript'
  s.src = chrome.runtime.getURL(script)
  s.async = true
  document.head.appendChild(s)
}

let last_translation

function showPopup(e, content) {
  removePopup('transover-type-and-translate-popup')

  const $popup = createPopup('transover-popup')
  $('body').append($popup)

  $popup.on('transover-popup_content_updated', function() {
    const pos = calculatePosition(e.clientX, e.clientY, $popup)
    $popup
      .each(function() {
        $(this.shadowRoot.querySelector('main')).hide()
      })
      .attr({ top: pos.y, left: pos.x })
      .each(function() {
        $(this.shadowRoot.querySelector('main')).fadeIn('fast')
      })
  })
  $popup.attr({content, options: JSON.stringify(options)})
}

function calculatePosition(x, y, $popup) {
  const pos = {}
  const margin = 5
  const anchor = 10
  const outerWidth = Number($popup.attr('outer-width'))
  const outerHeight = Number($popup.attr('outer-height'))

  // show popup to the right of the word if it fits into window this way
  if (x + anchor + outerWidth + margin < $(window).width()) {
    pos.x = x + anchor
  }
  // show popup to the left of the word if it fits into window this way
  else if (x - anchor - outerWidth - margin > 0) {
    pos.x = x - anchor - outerWidth
  }
  // show popup at the very left if it is not wider than window
  else if (outerWidth + margin*2 < $(window).width()) {
    pos.x = margin
  }
  // resize popup width to fit into window and position it the very left of the window
  else {
    const non_content_x = outerWidth - Number($popup.attr('content-width'))

    $popup.attr('content-width', $(window).width() - margin*2 - non_content_x )
    $popup.attr('content-height', Number($popup.attr('content-height')) + 4)

    pos.x = margin
  }

  // show popup above the word if it fits into window this way
  if (y - anchor - outerHeight - margin > 0) {
    pos.y = y - anchor - outerHeight
  }
  // show popup below the word if it fits into window this way
  else if (y + anchor + outerHeight + margin < $(window).height()) {
    pos.y = y + anchor
  }
  // show popup at the very top of the window
  else {
    pos.y = margin
  }

  return pos
}

function loadOptions() {
  chrome.runtime.sendMessage({handler: 'get_options'}, function(response) {
    options = JSON.parse( response.options )
    disable_on_this_page = ignoreThisPage(options)
    chrome.runtime.sendMessage({handler: 'setIcon', disabled: disable_on_this_page})
  })
}

document.addEventListener('visibilitychange', function () {
  if (!document.hidden) {
    loadOptions()
  }
}, false)

function processEvent(e) {

  function getHitWord(e) {

    function restorable(node, do_stuff) {
      $(node).wrap('<transwrapper />')
      const res = do_stuff(node)
      $('transwrapper').replaceWith(TransOver.escape_html( $('transwrapper').text() ))
      return res
    }

    function getExactTextNode(nodes, e) {
      $(text_nodes).wrap('<transblock />')
      let hit_text_node = document.elementFromPoint(e.clientX, e.clientY)

      //means we hit between the lines
      if (hit_text_node.nodeName != 'TRANSBLOCK') {
        $(text_nodes).unwrap()
        return null
      }

      hit_text_node = hit_text_node.childNodes[0]

      $(text_nodes).unwrap()

      return hit_text_node
    }

    const hit_elem = $(document.elementFromPoint(e.clientX, e.clientY))
    const word_re = '\\p{L}+(?:[\'’]\\p{L}+)*'
    const parent_font_style = {
      'line-height': hit_elem.css('line-height'),
      'font-size': '1em',
      'font-family': hit_elem.css('font-family')
    }

    const text_nodes = hit_elem.contents().filter(function(){
      return this.nodeType == Node.TEXT_NODE && XRegExp(word_re).test( this.nodeValue )
    })

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

      function getHitText(node, parent_font_style) {
        debug('getHitText: \'' + node.textContent + '\'')

        if (XRegExp(word_re).test( node.textContent )) {
          $(node).replaceWith(function() {
            return this.textContent.replace(XRegExp('^(.{'+Math.round( node.textContent.length/2 )+'}(?:\\p{L}|[\'’](?=\\p{L}))*)(.*)', 's'), function($0, $1, $2) {
              return '<transblock>'+TransOver.escape_html($1)+'</transblock><transblock>'+TransOver.escape_html($2)+'</transblock>'
            })
          })

          $('transblock').css(parent_font_style)

          const next_node = document.elementFromPoint(e.clientX, e.clientY).childNodes[0]

          if (next_node.textContent == node.textContent) {
            return next_node
          }
          else {
            return getHitText(next_node, parent_font_style)
          }
        }
        else {
          return null
        }
      }

      const minimal_text_node = getHitText(hit_text_node, parent_font_style)

      if (minimal_text_node) {
        //wrap words inside text node into <transover> element
        $(minimal_text_node).replaceWith(function() {
          return this.textContent.replace(XRegExp('(<|>|&|'+word_re+')', 'gs'), function ($0, $1) {
            switch ($1) {
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '&': return '&amp;'
            default: return '<transover>'+$1+'</transover>'
            }
          })
        })

        $('transover').css(parent_font_style)

        //get the exact word under cursor
        const hit_word_elem = document.elementFromPoint(e.clientX, e.clientY)

        //no word under cursor? we are done
        if (hit_word_elem.nodeName != 'TRANSOVER') {
          debug('missed!')
        }
        else  {
          hw = $(hit_word_elem).text()
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

  //skip inputs and editable divs
  if (/INPUT|TEXTAREA/.test( hit_elem.nodeName ) || hit_elem.isContentEditable
      || $(hit_elem).parents().filter(function() { return this.isContentEditable }).length > 0) {

    return
  }

  let word = ''
  if (selection.toString()) {

    if (options.selection_key_only) {
      debug('Skip because "selection_key_only"')
      return
    }

    debug('Got selection: ' + selection.toString())

    let sel_container = selection.getRangeAt(0).commonAncestorContainer

    while (sel_container.nodeType != Node.ELEMENT_NODE) {
      sel_container = sel_container.parentNode
    }

    if (
    // only choose selection if mouse stopped within immediate parent of selection
      ( $(hit_elem).is(sel_container) || $.contains(sel_container, hit_elem) )
        // and since it can still be quite a large area
        // narrow it down by only choosing selection if mouse points at the element that is (partially) inside selection
        && selection.containsNode(hit_elem, true)
        // But what is the point for the first part of condition? Well, without it, pointing at body for instance would also satisfy the second part
        // resulting in selection translation showing up in random places
    ) {
      word = selection.toString()
    }
    else if (options.translate_by == 'point') {
      word = getHitWord(e)
    }
  }
  else {
    word = getHitWord(e)
  }
  if (word != '') {
    chrome.runtime.sendMessage({handler: 'translate', word: word}, function(response) {
      debug('response: ', response)

      const translation = TransOver.deserialize(response.translation)

      if (!translation) {
        debug('skipping empty translation')
        return
      }

      last_translation = translation
      showPopup(e, TransOver.formatTranslation(translation, TransOverLanguages[response.tl].direction, response.sl, options))
    })
  }
}

function withOptionsSatisfied(e, do_stuff) {
  if (options.target_lang) {
    //respect 'translate only when alt pressed' option
    if (options.word_key_only && !show_popup_key_pressed) return

    //respect "don't translate these sites"
    if (disable_on_this_page) return

    do_stuff()
  }
}

$(document).on('mousestop', function(e) {
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
})

$(document).click(function(e) {
  withOptionsSatisfied(e, function() {
    if (options.translate_by != 'click')
      return
    if ($(e.target).closest('a').length > 0)
      return

    processEvent(e)
  })
  return true
})

let show_popup_key_pressed = false
$(document).keydown(function(e) {
  if (TransOver.modifierKeys[e.keyCode] == options.popup_show_trigger) {
    show_popup_key_pressed = true

    const selection = window.getSelection().toString()

    if (options.selection_key_only && selection) {
      debug('Got selection_key_only')

      chrome.runtime.sendMessage({handler: 'translate', word: selection}, function(response) {
        debug('response: ', response)

        const translation = TransOver.deserialize(response.translation)

        if (!translation) {
          debug('skipping empty translation')
          return
        }

        const xy = { clientX: last_mouse_stop.x, clientY: last_mouse_stop.y }
        last_translation = translation
        showPopup(xy, TransOver.formatTranslation(translation, TransOverLanguages[response.tl].direction, response.sl, options))
      })
    }
  }

  // text-to-speech on ctrl press
  if (!e.originalEvent.repeat && TransOver.modifierKeys[e.keyCode] == options.tts_key && options.tts && $('transover-popup').length > 0) {
    debug('tts')
    chrome.runtime.sendMessage({handler: 'tts'})
  }

  // Hide tat popup on escape
  if (e.keyCode == 27) {
    removePopup('transover-type-and-translate-popup')
  }
}).keyup(function(e) {
  if (TransOver.modifierKeys[e.keyCode] == options.popup_show_trigger) {
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

$(document).mousemove(function(e) {
  if (hasMouseReallyMoved(e)) {
    const mousemove_without_noise = new $.Event('mousemove_without_noise')
    mousemove_without_noise.clientX = e.clientX
    mousemove_without_noise.clientY = e.clientY

    $(document).trigger(mousemove_without_noise)
  }
})

let timer25
const last_mouse_stop = {x: 0, y: 0}

$(document).scroll(function() {
  removePopup('transover-popup')
})

// setup mousestop event
$(document).on('mousemove_without_noise', function(e){
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
      const mousestop = new $.Event('mousestop')
      last_mouse_stop.x = mousestop.clientX = e.clientX
      last_mouse_stop.y = mousestop.clientY = e.clientY

      $(document).trigger(mousestop)
    }, delay)
  }
})

chrome.runtime.onMessage.addListener(
  function(request) {
    if (window != window.top) return

    if (request == 'open_type_and_translate') {
      if ($('transover-type-and-translate-popup').length == 0) {
        chrome.runtime.sendMessage({handler: 'get_last_tat_sl_tl'}, function(response) {
          const $popup = createPopup('transover-type-and-translate-popup')
          const languages = $.extend({}, TransOverLanguages)

          if (response.sl) {
            languages[response.sl].selected_sl = true
          }
          languages[response.tast_tl || options.target_lang].selected_tl = true

          $popup.attr('data-languages', JSON.stringify(languages))
          $popup.attr('data-disable_on_this_page', disable_on_this_page)
          $('body').append($popup)
          $popup.each(function() {
            $(this.shadowRoot.querySelector('main')).hide().fadeIn('fast')
          })
        })
      }
      else {
        removePopup('transover-type-and-translate-popup')
      }
    } else if (request == 'copy-translation-to-clipboard') {
      debug('received copy-translation-to-clipboard')
      if ($('transover-popup').length > 0) {
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

$(function() {
  $(popupTemplate).appendTo(document.documentElement)
  $(tatPopupTemplate).appendTo(document.documentElement)
  registerTransoverComponent('popup')
  registerTransoverComponent('tat_popup')
  loadOptions()
})

window.addEventListener('message', function(e) {
  // We only accept messages from ourselves
  if (e.source != window)
    return

  if (e.data.type == 'transoverTranslate') {
    chrome.runtime.sendMessage({handler: 'translate', word: e.data.text, sl: e.data.sl, tl: e.data.tl}, function(response) {
      debug('tat response: ', response)

      const translation = TransOver.deserialize(response.translation)

      if (!translation) {
        debug('tat skipping empty translation')
        return
      }

      const e = { clientX: $(window).width(), clientY: 0 }
      last_translation = translation
      showPopup(e, TransOver.formatTranslation(translation, TransOverLanguages[response.tl].direction, response.sl, options))
    })
  } else if (e.data.type === 'toggle_disable_on_this_page') {
    disable_on_this_page = e.data.disable_on_this_page
    chrome.runtime.sendMessage({
      handler: 'toggle_disable_on_this_page',
      disable_on_this_page,
      current_url: window.location.origin
    })
    chrome.runtime.sendMessage({handler: 'setIcon', disabled: disable_on_this_page})
    removePopup('transover-type-and-translate-popup')
  } else if (e.data.type === 'tat_close') {
    removePopup('transover-type-and-translate-popup')
  }
})
