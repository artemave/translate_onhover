import TransOverLanguages from './languages'

export const modifierKeys = {
  16: 'shift', 17: 'ctrl', 18: 'alt', 224: 'meta', 91: 'command', 93: 'command', 13: 'Return'
}

export function deserialize (text) {
  let res

  try {
    res = JSON.parse(text)
  }
  catch (e) {
    // that means text is a string (including "") as opposed to a serialized object
    if (e.toString().match(/SyntaxError/)) {
      res = text
    }
    else {
      throw e
    }
  }
  return res
}

export function renderError (message) {
  return `
    <div class="pos_translation">
      <strong class="red">Error!</strong> ${message}
    </div>
  `
}

export function formatTranslation (translation, {sl, tl}, options) {
  const textDirection = TransOverLanguages[tl].direction
  let formatted_translation = '',
    rtl = ''

  if (textDirection == 'rtl') {
    rtl = ' rtl'
  }

  if (translation instanceof Array) {
    translation.forEach(function(pos_block) {
      const formatted_pos = pos_block.pos ? '<strong>'+pos_block.pos+ (pos_block.gender?' ('+pos_block.gender+')':'') +'</strong>: ' : ''
      const formatted_meanings = pos_block.meanings.slice(0,5).join(', ') + ( pos_block.meanings.length > 5 ? '...' : '' )
      formatted_translation = formatted_translation + '<div class="pos_translation ' + rtl + '">' + formatted_pos + formatted_meanings + '</div>'
    })
  }
  else {
    formatted_translation = '<div class="pos_translation ' + rtl + '">' + escape_html(translation) + '</div>'
  }

  const fromLang = TransOverLanguages[sl]
  if (fromLang && options.show_from_lang) {
    formatted_translation += `
      <div class="from_lang ${rtl}">
        <strong>translated from:</strong>
        <span> ${fromLang.label}</span>
      </div>
    `
  }

  return formatted_translation
}

export function escape_html (text) {
  return text.replace(new RegExp('(<|>|&)', 'g'), function ($0, $1) {
    switch ($1) {
    case '<': return '&lt;'
    case '>': return '&gt;'
    case '&': return '&amp;'
    }
  })
}

export function regexp_escape (s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}
