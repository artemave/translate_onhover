TypeAndTranslate = function(chrome, popup, options, logger) {
  function sendTranslate() {
    var word = popup.find('#tat_input').val();
    var tl   = popup.find('#tat_to_lang').val();

    if (!word || !tl) { return }

    chrome.extension.sendRequest({handler: 'translate', word: word, tl: tl}, show_result);
  };

  function open_popup() {
    if (popup.is_hidden()) {
      popup.show($(window).width(), 5, popup_html);

      chrome.extension.sendRequest({handler: 'get_last_tat_tl'}, function(response) {
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

  to_language_options = TransOverLanguages.slice(0);

  Jaml.register('lang_option', function(lang) {
      option({value: lang[0]}, lang[1]);
  });

  Jaml.register('popup_content', function() {
      div({id: 'tat_popup'},
        div({id: 'tat_input_container'},
          label({for: 'tat_input'}, 'Translate'),
          input({id: 'tat_input', type: 'text'})
        ),
        div({id: 'tat_submit_container'},
          label({for: 'tat_to_lang'}, 'into'),
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
};
