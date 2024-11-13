import $ from 'jquery'
import Options from './options'
import {modifierKeys} from './transover_utils'
import { languages } from './languages'

const isFirefox = typeof InstallTrigger !== 'undefined'

async function save_options() {
  function get_except_urls() {
    let except_urls = []
    except_urls = $('.except_url_input').filter(function() {
      return this.value
    }).map(function() {
      return this.value
    }).get()

    return except_urls
  }

  function get_only_urls() {
    let only_urls = []
    only_urls = $('.only_url_input').filter(function() {
      return this.value
    }).map(function() {
      return this.value
    }).get()

    return only_urls
  }

  await Options.except_urls(get_except_urls())
  await Options.only_urls(get_only_urls())
  await Options.target_lang($('#target_lang').val())
  await Options.from_lang($('#from_lang').val())
  await Options.reverse_lang($('#reverse_lang').val())
  await Options.word_key_only($('#word_key_only:checked').val() ? 1 : 0)
  await Options.selection_key_only($('#selection_key_only:checked').val() ? 1 : 0)
  await Options.tts($('#tts:checked').val() ? 1 : 0)
  await Options.tts_key($('#tts_key').val())
  await Options.translate_by($('#translate_by').val())
  await Options.delay($('#delay').val())
  await Options.fontSize($('#fontSize').val())
  await Options.do_not_show_oops($('#do_not_show_oops:checked').val() ? 1 : 0)
  await Options.popup_show_trigger($('#word_key_only_key').val())
  await Options.show_from_lang($('#show_from_lang:checked').val() ? 1 : 0)
  await Options.store_translations($('#record:checked').val() ? 1 : 0)

  $('.flash').fadeIn().delay(3000).fadeOut()
}

async function add_exc_url(url) {
  let button
  const input = $('<input type="text" class="except_url_input">').attr('size', 50).val(url)
  const rm_callback = function() { $(this).closest('tr').fadeOut('fast', function() {$(this).remove()}) }

  if (url) {
    button = $('<button>', {text: 'X'}).click(rm_callback)
  }
  else {
    button = $('<button>', {text: '+'}).click(async function() {
      if ($('.except_url_input', $(this).closest('tr') ).val() > '') {
        $(this).text('X').off('click').click(rm_callback)
        await add_exc_url()
      }
    })
  }
  $('<tr>', {css: {display: 'none'}}).fadeIn()
    .append($('<td>').append(input))
    .append($('<td>').append(button))
    .appendTo($('#exc_urls_table'))
}

async function populate_except_urls() {
  const saved_except_urls = await Options.except_urls()

  saved_except_urls.forEach(async function(url) {
    await add_exc_url(url)
  })
  await add_exc_url()
}

async function add_only_url(url) {
  let button
  const input = $('<input type="text" class="only_url_input">').attr('size', 50).val(url)

  const rm_callback = function() { $(this).closest('tr').fadeOut('fast', function() {$(this).remove()}) }

  if (url) {
    button = $('<button>', {text: 'X'}).click(rm_callback)
  }
  else {
    button = $('<button>', {text: '+'}).click(async function() {
      if ($('.only_url_input', $(this).closest('tr') ).val() > '') {
        $(this).text('X').off('click').click(rm_callback)
        await add_only_url()
      }
    })
  }
  $('<tr>', {css: {display: 'none'}}).fadeIn()
    .append($('<td>').append(input))
    .append($('<td>').append(button))
    .appendTo($('#only_urls_table'))
}

async function populate_only_urls() {
  const saved_only_urls = await Options.only_urls()

  saved_only_urls.forEach(async function(url) {
    await add_only_url(url)
  })
  await add_only_url()
}

async function fill_target_lang() {
  const saved_target_lang = await Options.target_lang()

  if (!saved_target_lang) {
    $('#target_lang').append('<option selected value="">Choose...</option>').append('<optgroup label="----------"></optgroup>')
    $('#target_lang').addClass('pulse')
  }

  $('#target_lang').change(function() {
    if ($(this).val()) {
      $(this).removeClass('pulse')
    } else {
      $(this).addClass('pulse')
    }
  })

  for (const l in languages) {
    $('#target_lang').append('<option value="'+l+'"'+(saved_target_lang == l ? ' selected' : '')+'>'+languages[l].label+'</option>')
  }
}

async function fill_from_lang() {
  const saved_from_lang = await Options.from_lang()

  $('#from_lang').append('<option selected value="auto">Autodetect</option>').append('<optgroup label="----------"></optgroup>')

  for (const l in languages) {
    $('#from_lang').append('<option value="'+l+'"'+(saved_from_lang == l ? ' selected' : '')+'>'+languages[l].label+'</option>')
  }
}

async function fill_reverse_lang() {
  const saved_reverse_lang = await Options.reverse_lang()

  $('#reverse_lang').append('<option selected value="">Choose...</option>').append('<optgroup label="----------"></optgroup>')

  for (const l in languages) {
    $('#reverse_lang').append('<option value="'+l+'"'+(saved_reverse_lang == l ? ' selected' : '')+'>'+languages[l].label+'</option>')
  }
}

async function populate_popup_show_trigger() {
  const saved_popup_show_trigger = await Options.popup_show_trigger()

  modifierKeys.forEach(function(key) {
    $('#word_key_only_key, #selection_key_only_key').each(function() {
      $(this).append($('<option>', {value: key}).text(key).prop('selected', saved_popup_show_trigger == key))
    })
  })

  $('#word_key_only_key, #selection_key_only_key').change(function() {
    $('#word_key_only_key, #selection_key_only_key').val(this.value)
  })
}

async function load() {
  await fill_target_lang()
  await fill_from_lang()
  await fill_reverse_lang()
  await populate_except_urls()
  await populate_only_urls()
  await populate_popup_show_trigger()

  if (isFirefox) {
    $('.firefox-option').removeClass('u-hidden')
  } else {
    $('.chrome-option').removeClass('u-hidden')
  }

  if (await Options.translate_by() == 'point') {
    $('#delay').attr('disabled', false).parent().removeClass('disabled')
  }

  if (await Options.from_lang() == 'auto') {
    $('#reverse_lang').attr('disabled', false).parent().removeClass('disabled')
  }

  if (await Options.word_key_only()) {
    $('#delay').attr('disabled', true).parent().addClass('disabled')
  }

  $('#translate_by').val(await Options.translate_by()).change(function() {
    if ($(this).val() == 'point' && !$('#word_key_only').attr('checked')) {
      $('#delay').attr('disabled', false).parent().removeClass('disabled')
    }
    else {
      $('#delay').attr('disabled', true).parent().addClass('disabled')
    }
  })

  $('#from_lang').change(function() {
    if ($(this).val() == 'auto') {
      $('#reverse_lang').attr('disabled', false).parent().removeClass('disabled')
    } else {
      $('#reverse_lang').val($('#from_lang').val()).attr('disabled', true).parent().addClass('disabled')
    }
  })

  $('#word_key_only').attr('checked', await Options.word_key_only() ? true : false).click(function() {
    if ($('#translate_by').val() == 'point' && !$(this).attr('checked')) {
      $('#delay').attr('disabled', false).parent().removeClass('disabled')
    }
    else {
      $('#delay').attr('disabled', true).parent().addClass('disabled')
    }
  })

  $('#selection_key_only').attr('checked', await Options.selection_key_only() ? true : false)

  $('#delay').val(await Options.delay())
  $('#fontSize').val(await Options.fontSize())

  $('#tts').attr('checked', await Options.tts() ? true : false)
  modifierKeys.forEach(async function(key) {
    $('#tts_key').append($('<option>', {value: key}).text(key).prop('selected', await Options.tts_key() == key))
  })

  $('#do_not_show_oops').attr('checked', await Options.do_not_show_oops() ? true : false)
  $('#show_from_lang').attr('checked', !!await Options.show_from_lang())

  $('#save_button').click(function() { save_options() })
  $(document).on('keydown', function(e) {
    if (e.key === 'Enter') {
      save_options()
    }
  })

  $('#more_options_link').on('click', function() {
    $('#more_options_link').hide()
    $('#more_options').fadeIn()
    return false
  })

  $('.set_hotkey').on('click', function() {
    chrome.tabs.create({url:'chrome://extensions/configureCommands'})
    return false
  })
}

$(() => load().then())
