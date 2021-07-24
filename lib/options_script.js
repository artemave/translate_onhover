import $ from 'jquery'
import Options from './options'
import {modifierKeys} from './transover_utils'
import TransOverLanguages from './languages'

const isFirefox = typeof InstallTrigger !== 'undefined'

function save_options() {
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

  Options.except_urls(get_except_urls())
  Options.only_urls(get_only_urls())
  Options.target_lang($('#target_lang').val())
  Options.from_lang($('#from_lang').val())
  Options.reverse_lang($('#reverse_lang').val())
  Options.word_key_only($('#word_key_only:checked').val() ? 1 : 0)
  Options.selection_key_only($('#selection_key_only:checked').val() ? 1 : 0)
  Options.tts($('#tts:checked').val() ? 1 : 0)
  Options.tts_key($('#tts_key').val())
  Options.translate_by($('#translate_by').val())
  Options.delay($('#delay').val())
  Options.fontSize($('#fontSize').val())
  Options.do_not_show_oops($('#do_not_show_oops:checked').val() ? 1 : 0)
  Options.popup_show_trigger($('#word_key_only_key').val())
  Options.show_from_lang($('#show_from_lang:checked').val() ? 1 : 0)

  $('.flash').fadeIn().delay(3000).fadeOut()
}

function populate_except_urls() {
  function add_exc_url(url) {
    let button
    const input = $('<input type="text" class="except_url_input">').attr('size', 50).val(url)
    const rm_callback = function() { $(this).closest('tr').fadeOut('fast', function() {$(this).remove()}) }

    if (url) {
      button = $('<button>', {text: 'X'}).click(rm_callback)
    }
    else {
      button = $('<button>', {text: '+'}).click(function() {
        if ($('.except_url_input', $(this).closest('tr') ).val() > '') {
          $(this).text('X').off('click').click(rm_callback)
          add_exc_url()
        }
      })
    }
    $('<tr>', {css: {display: 'none'}}).fadeIn()
      .append($('<td>').append(input))
      .append($('<td>').append(button))
      .appendTo($('#exc_urls_table'))
  }

  const saved_except_urls = Options.except_urls()

  saved_except_urls.forEach(function(url) {
    add_exc_url(url)
  })
  add_exc_url()
}


function populate_only_urls() {
  function add_only_url(url) {
    let button
    const input = $('<input type="text" class="only_url_input">').attr('size', 50).val(url)

    const rm_callback = function() { $(this).closest('tr').fadeOut('fast', function() {$(this).remove()}) }

    if (url) {
      button = $('<button>', {text: 'X'}).click(rm_callback)
    }
    else {
      button = $('<button>', {text: '+'}).click(function() {
        if ($('.only_url_input', $(this).closest('tr') ).val() > '') {
          $(this).text('X').off('click').click(rm_callback)
          add_only_url()
        }
      })
    }
    $('<tr>', {css: {display: 'none'}}).fadeIn()
      .append($('<td>').append(input))
      .append($('<td>').append(button))
      .appendTo($('#only_urls_table'))
  }

  const saved_only_urls = Options.only_urls()

  saved_only_urls.forEach(function(url) {
    add_only_url(url)
  })
  add_only_url()
}

function fill_target_lang() {
  const saved_target_lang = Options.target_lang()

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

  for (const l in TransOverLanguages) {
    $('#target_lang').append('<option value="'+l+'"'+(saved_target_lang == l ? ' selected' : '')+'>'+TransOverLanguages[l].label+'</option>')
  }
}

function fill_from_lang() {
  const saved_from_lang = Options.from_lang()

  $('#from_lang').append('<option selected value="auto">Autodetect</option>').append('<optgroup label="----------"></optgroup>')

  for (const l in TransOverLanguages) {
    $('#from_lang').append('<option value="'+l+'"'+(saved_from_lang == l ? ' selected' : '')+'>'+TransOverLanguages[l].label+'</option>')
  }
}

function fill_reverse_lang() {
  const saved_reverse_lang = Options.reverse_lang()
  const target_lang = Options.target_lang()

  $('#reverse_lang').append('<option selected value="">Choose...</option>').append('<optgroup label="----------"></optgroup>')

  for (const l in TransOverLanguages) {
    if (target_lang != l) {
      $('#reverse_lang').append('<option value="'+l+'"'+(saved_reverse_lang == l ? ' selected' : '')+'>'+TransOverLanguages[l].label+'</option>')
    }
  }
}

function populate_popup_show_trigger() {
  const saved_popup_show_trigger = Options.popup_show_trigger()

  ;[...new Set(Object.values(modifierKeys))].forEach(function(key) {
    $('#word_key_only_key, #selection_key_only_key').each(function() {
      $(this).append($('<option>', {value: key}).text(key).prop('selected', saved_popup_show_trigger == key))
    })
  })

  $('#word_key_only_key, #selection_key_only_key').change(function() {
    $('#word_key_only_key, #selection_key_only_key').val(this.value)
  })
}

$(function() {
  fill_target_lang()
  fill_from_lang()
  fill_reverse_lang()
  populate_except_urls()
  populate_only_urls()
  populate_popup_show_trigger()

  if (isFirefox) {
    $('.firefox-option').removeClass('u-hidden')
  } else {
    $('.chrome-option').removeClass('u-hidden')
  }

  if (Options.translate_by() == 'point') {
    $('#delay').attr('disabled', false).parent().removeClass('disabled')
  }

  if (Options.word_key_only()) {
    $('#delay').attr('disabled', true).parent().addClass('disabled')
  }

  $('#translate_by').val(Options.translate_by()).change(function() {
    if ($(this).val() == 'point' && !$('#word_key_only').attr('checked')) {
      $('#delay').attr('disabled', false).parent().removeClass('disabled')
    }
    else {
      $('#delay').attr('disabled', true).parent().addClass('disabled')
    }
  })

  $('#word_key_only').attr('checked', Options.word_key_only() ? true : false).click(function() {
    if ($('#translate_by').val() == 'point' && !$(this).attr('checked')) {
      $('#delay').attr('disabled', false).parent().removeClass('disabled')
    }
    else {
      $('#delay').attr('disabled', true).parent().addClass('disabled')
    }
  })

  $('#selection_key_only').attr('checked', Options.selection_key_only() ? true : false)

  $('#delay').val(Options.delay())
  $('#fontSize').val(Options.fontSize())

  $('#tts').attr('checked', Options.tts() ? true : false)
  ;[...new Set(Object.values(modifierKeys))].forEach(function(key) {
    $('#tts_key').append($('<option>', {value: key}).text(key).prop('selected', Options.tts_key() == key))
  })

  $('#do_not_show_oops').attr('checked', Options.do_not_show_oops() ? true : false)
  $('#show_from_lang').attr('checked', !!Options.show_from_lang())

  $('#save_button').click(function() { save_options() })
  $(document).on('keydown', function(e) {
    if (e.keyCode == 13) {
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
})
