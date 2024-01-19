import { localStorage } from './storage.js'

export default {
  except_urls: async function(urls) {
    if (urls instanceof Array) {
      return await localStorage.set('except_urls', urls)
    }

    const except_urls = await localStorage.get('except_urls')
    return except_urls || []
  },

  only_urls: async function(urls) {
    if (urls instanceof Array) {
      return await localStorage.set('only_urls', urls)
    }

    const only_urls = await localStorage.get('only_urls')
    return only_urls || []
  },

  target_lang: async function(lang) {
    if (lang) {
      return await localStorage.set('target_lang', lang)
    }
    return await localStorage.get('target_lang')
  },

  from_lang: async function(lang) {
    if (lang) {
      return await localStorage.set('from_lang', lang)
    }
    const from_lang = await localStorage.get('from_lang')
    return from_lang || 'auto'
  },

  reverse_lang: async function(lang) {
    if (arguments.length > 0) {
      return await localStorage.set('reverse_lang', lang)
    }
    return await localStorage.get('reverse_lang')
  },

  word_key_only: async function(arg) {
    if (arg != undefined) {
      return await localStorage.set('word_key_only', arg)
    }
    return parseInt( await localStorage.get('word_key_only') )
  },

  selection_key_only: async function(arg) {
    if (arg != undefined) {
      return await localStorage.set('selection_key_only', arg)
    }
    return parseInt( await localStorage.get('selection_key_only') )
  },

  tts: async function(arg) {
    if (arg != undefined) {
      return await localStorage.set('tts', arg)
    }
    return parseInt( await localStorage.get('tts') )
  },

  tts_key: async function(arg) {
    if (arg != undefined) {
      return await localStorage.set('tts_key', arg)
    }
    const tts_key = await localStorage.get('tts_key')
    return tts_key || 'shift'
  },

  translate_by: async function(arg) {
    if (arg == 'click' || arg == 'point') {
      return await localStorage.set('translate_by', arg)
    }
    const translate_by = await localStorage.get('translate_by')
    return translate_by || 'click'
  },

  delay: async function(ms) {
    if (ms != undefined && !isNaN(parseFloat(ms)) && isFinite(ms)) {
      return await localStorage.set('delay', ms)
    }
    const delay = await localStorage.get('delay')
    return delay == undefined ? 700 : parseInt(delay)
  },

  do_not_show_oops: async function(arg) {
    if (arg != undefined) {
      return await localStorage.set('do_not_show_oops', arg)
    }
    return parseInt( await localStorage.get('do_not_show_oops') )
  },

  popup_show_trigger: async function(arg) {
    if (arg != undefined) {
      return await localStorage.set('popup_show_trigger', arg)
    }
    const popup_show_trigger = await localStorage.get('popup_show_trigger')
    return popup_show_trigger || 'alt'
  },

  show_from_lang: async function(arg) {
    if (arg !== undefined) {
      return await localStorage.set('show_from_lang', arg)
    }
    const show_from_lang = await localStorage.get('show_from_lang')
    return show_from_lang === undefined
      ? true
      : !!parseInt(show_from_lang)
  },

  fontSize: async function(arg) {
    if (arg != undefined) {
      return await localStorage.set('fontSize', arg)
    }
    const fontSize = await localStorage.get('fontSize')
    return parseInt(fontSize || 14)
  },

  disable_everywhere: async function(arg) {
    if (arg != undefined) {
      return await localStorage.set('disable_everywhere', arg)
    }
    return parseInt( await localStorage.get('disable_everywhere') ) || 0
  },
}
