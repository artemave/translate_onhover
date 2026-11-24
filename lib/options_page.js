import {modifierKeys} from './transover_utils'
import { languages } from './languages'
import { fadeIn, fadeOut } from './fade'

const field = id => document.getElementById(id)

function setEnabled(input, enabled) {
  input.disabled = !enabled
  input.parentElement.classList.toggle('disabled', !enabled)
}

function appendLanguages(select, selectedLang) {
  for (const l in languages) {
    select.append(new Option(languages[l].label, l, selectedLang == l, selectedLang == l))
  }
}

function appendPlaceholder(select, label, value) {
  const separator = document.createElement('optgroup')
  separator.label = '----------'
  select.append(new Option(label, value, true, true), separator)
}

function flashSaved() {
  document.querySelectorAll('.flash').forEach(flash => {
    flash.getAnimations().forEach(animation => animation.cancel())
    flash.style.display = 'block'
    flash.animate([
      { opacity: 0 },
      { opacity: 1, offset: 0.1 },
      { opacity: 1, offset: 0.9 },
      { opacity: 0 },
    ], 3800).onfinish = () => { flash.style.display = '' }
  })
}

// A row per saved url, then a blank one whose "+" commits it and adds the
// next blank row.
function addUrlRow(table, inputClass, url) {
  const input = document.createElement('input')
  input.type = 'text'
  input.className = inputClass
  input.size = 50
  input.value = url || ''

  const button = document.createElement('button')
  const row = table.insertRow()
  const remove = () => fadeOut(row, 200, () => row.remove())

  if (url) {
    button.textContent = 'X'
    button.onclick = remove
  } else {
    button.textContent = '+'
    button.onclick = () => {
      if (input.value) {
        button.textContent = 'X'
        button.onclick = remove
        addUrlRow(table, inputClass)
      }
    }
  }

  row.insertCell().append(input)
  row.insertCell().append(button)
  fadeIn(row, 400)
}

function populateUrls(table, inputClass, urls) {
  urls.forEach(url => addUrlRow(table, inputClass, url))
  addUrlRow(table, inputClass)
}

function enteredUrls(inputClass) {
  return [...document.querySelectorAll(`.${inputClass}`)].map(input => input.value).filter(Boolean)
}

export function init({ options, isFirefox, tabs }) {
  async function save_options() {
    // A real completion signal for tests to wait on: the click/keydown
    // handlers below call this without awaiting it, so there's nothing else
    // for a caller to hook into between "Save was clicked" and "every
    // chrome.storage.local write has actually landed".
    document.documentElement.dataset.transoverOptionsSaved = 'false'

    await options.except_urls(enteredUrls('except_url_input'))
    await options.only_urls(enteredUrls('only_url_input'))
    await options.target_lang(field('target_lang').value)
    await options.from_lang(field('from_lang').value)
    await options.reverse_lang(field('reverse_lang').value)
    await options.word_key_only(field('word_key_only').checked ? 1 : 0)
    await options.selection_key_only(field('selection_key_only').checked ? 1 : 0)
    await options.tts(field('tts').checked ? 1 : 0)
    await options.tts_key(field('tts_key').value)
    await options.translate_by(field('translate_by').value)
    await options.delay(field('delay').value)
    await options.fontSize(field('fontSize').value)
    await options.theme(field('theme').value)
    await options.do_not_show_oops(field('do_not_show_oops').checked ? 1 : 0)
    await options.popup_show_trigger(field('word_key_only_key').value)
    await options.show_from_lang(field('show_from_lang').checked ? 1 : 0)

    flashSaved()
    document.documentElement.dataset.transoverOptionsSaved = 'true'
  }

  async function fill_target_lang() {
    const saved_target_lang = await options.target_lang()
    const select = field('target_lang')

    if (!saved_target_lang) {
      appendPlaceholder(select, 'Choose...', '')
      select.classList.add('pulse')
    }

    select.addEventListener('change', () => {
      select.classList.toggle('pulse', !select.value)
    })

    appendLanguages(select, saved_target_lang)
  }

  async function fill_from_lang() {
    const select = field('from_lang')
    appendPlaceholder(select, 'Autodetect', 'auto')
    appendLanguages(select, await options.from_lang())
  }

  async function fill_reverse_lang() {
    const select = field('reverse_lang')
    appendPlaceholder(select, 'Choose...', '')
    appendLanguages(select, await options.reverse_lang())
  }

  async function populate_popup_show_trigger() {
    const saved_popup_show_trigger = await options.popup_show_trigger()
    const selects = [field('word_key_only_key'), field('selection_key_only_key')]

    selects.forEach(select => {
      modifierKeys.forEach(key => {
        select.append(new Option(key, key, false, saved_popup_show_trigger == key))
      })
      select.addEventListener('change', () => {
        selects.forEach(other => { other.value = select.value })
      })
    })
  }

  async function load() {
    await fill_target_lang()
    await fill_from_lang()
    await fill_reverse_lang()
    populateUrls(field('exc_urls_table'), 'except_url_input', await options.except_urls())
    populateUrls(field('only_urls_table'), 'only_url_input', await options.only_urls())
    await populate_popup_show_trigger()

    document.querySelectorAll(isFirefox ? '.firefox-option' : '.chrome-option').forEach(option => {
      option.classList.remove('u-hidden')
    })

    const delay = field('delay')
    const translateBy = field('translate_by')
    const wordKeyOnly = field('word_key_only')
    const fromLang = field('from_lang')
    const reverseLang = field('reverse_lang')

    if (await options.translate_by() == 'point') {
      setEnabled(delay, true)
    }

    if (await options.from_lang() == 'auto') {
      setEnabled(reverseLang, true)
    }

    if (await options.word_key_only()) {
      setEnabled(delay, false)
    }

    const updateDelay = () => setEnabled(delay, translateBy.value == 'point' && !wordKeyOnly.checked)

    translateBy.value = await options.translate_by()
    translateBy.addEventListener('change', updateDelay)

    fromLang.addEventListener('change', () => {
      if (fromLang.value == 'auto') {
        setEnabled(reverseLang, true)
      } else {
        reverseLang.value = fromLang.value
        setEnabled(reverseLang, false)
      }
    })

    wordKeyOnly.checked = Boolean(await options.word_key_only())
    wordKeyOnly.addEventListener('change', updateDelay)

    field('selection_key_only').checked = Boolean(await options.selection_key_only())

    delay.value = await options.delay()
    field('fontSize').value = await options.fontSize()

    field('theme').value = await options.theme()

    field('tts').checked = Boolean(await options.tts())
    const saved_tts_key = await options.tts_key()
    modifierKeys.forEach(key => {
      field('tts_key').append(new Option(key, key, false, saved_tts_key == key))
    })

    field('do_not_show_oops').checked = Boolean(await options.do_not_show_oops())
    field('show_from_lang').checked = Boolean(await options.show_from_lang())

    field('save_button').addEventListener('click', save_options)
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        save_options()
      }
    })

    field('more_options_link').addEventListener('click', e => {
      e.preventDefault()
      field('more_options_link').style.display = 'none'
      field('more_options').style.display = ''
      fadeIn(field('more_options'), 400)
    })

    document.querySelectorAll('.set_hotkey').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault()
        tabs.create({url:'chrome://extensions/configureCommands'})
      })
    })
  }

  // A real completion signal for tests: load() sequentially awaits ~9
  // chrome.storage.local reads before it's actually safe to interact with the
  // page (e.g. Save can otherwise race a late `field.value = await ...`
  // assignment and lose).
  load().then(() => { document.documentElement.dataset.transoverOptionsPageReady = 'true' })
}
