function save_options() {
  function get_except_urls() {
    var except_urls = [];
    except_urls = $('.except_url_input').filter(function() {
        return this.value;
    }).map(function() {
        return this.value;
    }).get();

    return except_urls;
  }

  Options.except_urls(get_except_urls());
  Options.target_lang($('#target_lang').val());
  Options.source_lang($('#source_lang').val());
  Options.reverse_lang($('#reverse_lang').val());
  Options.word_key_only($('#word_key_only:checked').val() ? 1 : 0);
  Options.selection_key_only($('#selection_key_only:checked').val() ? 1 : 0);
  Options.tts($('#tts:checked').val() ? 1 : 0);
  Options.translate_by($('#translate_by').val());
  Options.delay($('#delay').val());
  Options.type_and_translate_hotkey($('#type_and_translate_hotkey').val());
  Options.do_not_show_oops($('#do_not_show_oops:checked').val() ? 1 : 0);
  Options.popup_show_trigger($('#word_key_only_key').val())

  $('#status').fadeIn().delay(3000).fadeOut();
}

function populate_except_urls() {
  function add_exc_url(url) {
    var input = $('<input type="text" class="except_url_input">').attr('size', 100).val(url),
    button,
    rm_callback = function() { $(this).closest('tr').fadeOut('fast', function() {$(this).remove()}) };

    if (url) {
      button = $('<button>', {text: 'X'}).click(rm_callback);
    }
    else {
      button = $('<button>', {text: "+"}).click(function() {
          if ($('.except_url_input', $(this).closest('tr') ).val() > '') {
            $(this).text('X').off('click').click(rm_callback);
            add_exc_url();
          }
      });
    }
    $('<tr>', {css: {display: 'none'}}).fadeIn()
      .append($('<td>').append(input))
      .append($('<td>').append(button))
      .appendTo($('#exc_urls_table'));
  }

  var saved_except_urls = Options.except_urls();

  saved_except_urls.forEach(function(url) {
      add_exc_url(url);
  });
  add_exc_url();
}

function populate_except_langs() {
  var saved_except_langs = Options.except_langs();

  TransOverLanguages.forEach(function(lang, i) {
      var inp = $('<input id="ex'+lang[0]+'" type="checkbox" value="'+lang[0]+'"/>');
      if (saved_except_langs.some(function(lang_code) { return lang_code == lang[0] }))  {
        inp.attr('checked', true);
      }

      if (i % 5 == 0) {
        $('#exc_lang_table').append('<tr></tr>');
      }
      $('tr:last', $('#exc_lang_table'))
      .append($('<td></td>')
        .append('<label for="ex'+lang[0]+'">'+lang[1]+'</label>')
        .append(inp)
      );
  });

  $('#except_langs').append($('#exc_lang_table'));
}

function fill_target_lang() {
  var saved_target_lang = Options.target_lang();

  if (!saved_target_lang) {
    $('#target_lang').append('<option selected value="">Choose...</option>').append('<optgroup label="----------"></optgroup>');
  }

  TransOverLanguages.forEach(function(lang, i) {
      $('#target_lang').append('<option value="'+lang[0]+'"'+(saved_target_lang == lang[0] ? ' selected' : '')+'>'+lang[1]+'</option>');
  });
}

function fill_source_lang() {
  var saved_source_lang = Options.source_lang();
  var help_baloon = new Tooltip();
  var help = '\
  <b>Autodetect from page locale</b> is a very accurate one. Except it totally fails \
  <br/>\
  when locale does not match page language (e.g, russian version of french website).\
  <br/>\
  <br/>\
  <b>Autodetect from word</b> being translated is not as accurate.\
  <br/>\
  It may decide for instance that "bonjour" is english word and would therefor\
  <br/>\
  show single word translation as opposed to full french version.\
  <br/>\
  Also, for that reason, Text-To-Speech is a lot less useful.\
  <br/>\
  Still, it mostly works and does so everywhere.\
  <br/>\
  <br/>\
  <b>Locking to specific language</b> will make it so that every word you translate\
  <br/>\
  will be treated as being in that language. 100% accuracy, but only for that language.\
  <br/>\
  <br/>\
  All in all, no best option. Experiment till you find the one that suits you best.\
  ';

  $('#source_lang').parent().find('.help').hover(function(e) {
      help_baloon.show(e.clientX, e.clientY, help);
      var tt = $('iframe');
      tt.width(500);
      tt.height(260);
    }, function() {
      help_baloon.hide();
  });

  $('#source_lang').change(function() {
      var source_lang = $(this).val();
      if (!source_lang.match(/autodetected_from_/)) {
        $('#reverse_lang').val($('#source_lang').val());
      }
  });

  $('#source_lang')
    .append('<option value="autodetected_from_word">Autodetect (word)</option>')
    .append('<option value="autodetected_from_locale">Autodetect (page locale)</option>')
    .append('<optgroup label="----------"></optgroup>');

  TransOverLanguages.forEach(function(lang, i) {
      $('#source_lang').append('<option value="'+lang[0]+'">'+lang[1]+'</option>');
  });

  $('#source_lang').val(saved_source_lang).trigger('change');
}

function fill_reverse_lang() {
  var saved_reverse_lang = Options.reverse_lang();
  var target_lang = Options.target_lang();

  $('#reverse_lang').append('<option selected value="">Choose...</option>').append('<optgroup label="----------"></optgroup>');

  TransOverLanguages.forEach(function(lang, i) {
      if (target_lang == lang[0]) { return }
      $('#reverse_lang').append('<option value="'+lang[0]+'"'+(saved_reverse_lang == lang[0] ? ' selected' : '')+'>'+lang[1]+'</option>');
  });
}

function setup_hotkey_input() {
  $('#type_and_translate_hotkey')
    .hotkeyInput()
    .val(Options.type_and_translate_hotkey());
}

function populate_popup_show_trigger() {
  var saved_popup_show_trigger = Options.popup_show_trigger()

  _(TransOver.modifierKeys).values().uniq().forEach(function(key) {
    $('#word_key_only_key, #selection_key_only_key').each(function() {
      $(this).append($('<option>', {value: key}).text(key).prop('selected', saved_popup_show_trigger == key))
    })
  })

  $('#word_key_only_key, #selection_key_only_key').change(function() {
    $('#word_key_only_key, #selection_key_only_key').val(this.value)
  })
}

$(function() {
    fill_target_lang();
    fill_source_lang();
    fill_reverse_lang();
    populate_except_urls();
    setup_hotkey_input();
    populate_popup_show_trigger()

    if (Options.translate_by() == 'point') { 
      $('#delay').attr('disabled', false).parent().removeClass('disabled');
    }

    if (Options.word_key_only()) {
      $('#delay').attr('disabled', true).parent().addClass('disabled');
    }

    $('#translate_by').val(Options.translate_by()).change(function() {
        if ($(this).val() == 'point' && !$('#word_key_only').attr('checked')) {
          $('#delay').attr('disabled', false).parent().removeClass('disabled');
        }
        else {
          $('#delay').attr('disabled', true).parent().addClass('disabled');
        }
    });

    $('#word_key_only').attr('checked', Options.word_key_only() ? true : false).click(function() {
        if ($('#translate_by').val() == 'point' && !$(this).attr('checked')) {
          $('#delay').attr('disabled', false).parent().removeClass('disabled');
        }
        else {
          $('#delay').attr('disabled', true).parent().addClass('disabled');
        }
    });

    $('#selection_key_only').attr('checked', Options.selection_key_only() ? true : false);

    $('#delay').val(Options.delay());

    $('#tts').attr('checked', Options.tts() ? true : false);
    $('#do_not_show_oops').attr('checked', Options.do_not_show_oops() ? true : false);

    $('#save_button').click(function() { save_options() });
    $(document).on('keydown', function(e) {
        if (e.keyCode == 13) {
          save_options();
        }
    });

    $('#more_options_link').on('click', function() {
        $('#more_options_link').hide();
        $('#more_options').fadeIn();
    })
});


