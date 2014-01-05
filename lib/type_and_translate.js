TypeAndTranslate = function(chrome, popup, options, logger) {
  function sendTranslate() {
    var word = popup.find('#tat_input').val();
    var sl   = popup.find('#tat_from_lang').val();
    var tl   = popup.find('#tat_to_lang').val();

    if (!word || !sl || !tl) { return }

    chrome.extension.sendRequest({handler: 'translate_with_explicit_languages', word: word, sl: sl, tl: tl}, show_result);
  };

  function open_popup() {
    if (popup.is_hidden()) {
      popup.show($(window).width(), 5, popup_html);

      chrome.extension.sendRequest({handler: 'get_last_tat_to_and_from_languages'}, function(response) {
          if (response.from_lang) {
            popup.find('#tat_from_lang').val(response.from_lang);
          }
          popup.find('#tat_to_lang').val(response.to_lang || options.target_lang);
      })
    }
  }

  function show_result(response) {
    logger('tat response: ', response.translation);

    var translation = TransOver.deserialize(response.translation);
    translation = TransOver.formatTranslation(translation);
    translation = '<div id="tat_result">' + translation + '</div>';

    popup.show($(window).width(), 5, translation);
  };

  from_language_options = TransOverLanguages.slice(0);
  from_language_options.unshift(['autodetected_from_word', 'Autodetect']);

  to_language_options = TransOverLanguages.slice(0);

  Jaml.register('lang_option', function(lang) {
      option({value: lang[0]}, lang[1]);
  });

  Jaml.register('popup_content', function() {
      div({id: 'tat_popup'},
        div(
          input({id: 'tat_input', type: 'text'})
        ),
        div(
          label({for: 'tat_from_lang'}, 'from'),
          select({id: 'tat_from_lang'}, Jaml.render('lang_option', from_language_options)),
          img({id: 'swap_languages', src: chrome.extension.getURL('refresh_blue.png')}),
          select({id: 'tat_to_lang'}, Jaml.render('lang_option', to_language_options)),
          input({id: 'tat_submit', type: 'submit', value: 'go'})
        )
      )
  });
  var popup_html = Jaml.render('popup_content');

  popup.bindFutureEvent('click', '#tat_submit', sendTranslate);

  popup.bindFutureEvent('keydown', '#tat_popup', function(e) {
      if (e.keyCode == 13) {
        sendTranslate();
      }
  });

  popup.bindFutureEvent('click', '#swap_languages', function() {
      var from_lang = popup.find('#tat_from_lang').val();
      var to_lang   = popup.find('#tat_to_lang').val();

      popup.find('#tat_from_lang').val(to_lang);
      popup.find('#tat_to_lang').val(from_lang);
  });

  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      if (request == 'open_type_and_translate') {
        if (popup.is_hidden()) {
          open_popup();
        }
        else {
          popup.hide();
        }
      }
    }
  );

  popup.on_open = function() {
    this.find('#tat_input').focus();
  };

  var hotkey = options.type_and_translate_hotkey;

  if (hotkey) {
    $(document).on('keypress', null, hotkey.toLowerCase(), function() {
        open_popup();
    });
  }
};
