import { languages } from './languages'

export const modifierKeys = new Set([
  'Alt',
  'Control',
  'Enter',
  'Escape',
  'Meta',
  'Shift'])


// Popup content is described as plain data - a node is either a string (text)
// or {tag, cls, children} - rather than as an HTML string. popup.js builds DOM
// from it with createElement(), because pages that enforce Trusted Types (e.g.
// Gmail) throw on `element.innerHTML = '<string>'`.
function node (tag, cls, ...children) {
  return { tag, cls, children }
}

function classes (...names) {
  return names.filter(Boolean).join(' ')
}

export function renderError (message) {
  return [
    node('div', 'pos_translation',
      node('strong', 'red', 'Error!'),
      ` ${message}`)
  ]
}

export function formatTranslation (translation, {sl, tl}, options) {
  const rtl = languages[tl].direction == 'rtl' ? 'rtl' : ''
  const blocks = []

  if (translation instanceof Array) {
    translation.forEach(function(pos_block) {
      const meanings = pos_block.meanings.slice(0,5).join(', ') + ( pos_block.meanings.length > 5 ? '...' : '' )
      const pos = pos_block.pos ? [node('strong', '', pos_block.pos), ': '] : []

      blocks.push(node('div', classes('pos_translation', rtl), ...pos, meanings))
    })
  }
  else {
    blocks.push(node('div', classes('pos_translation', rtl), translation))
  }

  const fromLang = languages[sl]
  if (fromLang && options.show_from_lang) {
    blocks.push(node('div', classes('from_lang', rtl),
      node('strong', '', 'translated from:'),
      node('span', '', ` ${fromLang.label}`)))
  }

  return blocks
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
