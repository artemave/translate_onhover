(function($){
    TypeAndTranslate = function(chrome, popup, options, logger) {
      function sendTranslate() {
        var word = popup.find('#tat_input').val();
        var sl   = popup.find('#tat_from_lang').val();
        var tl   = popup.find('#tat_to_lang').val();

        if (!word || !sl || !tl) { return }

        chrome.extension.sendRequest({handler: 'translate_with_explicit_languages', word: word, sl: sl, tl: tl}, show_result);
      };

      function show_result(response) {
        logger('tat response: ', response.translation);

        var translation = TransOver.deserialize(response.translation);

        if (popup.find('#tat_result').length == 0) {
          $('<div id="tat_result">').appendTo(popup.find('#tat_popup'));
        }
        popup.find('#tat_result').css({direction: getLangDirection(response.tl)}).html(TransOver.formatTranslation(translation));
        popup.resize();
      };

      var hotkey = options.type_and_translate_hotkey;

      if (hotkey === undefined) {
        return;
      }

      from_language_options = TransOverLanguages;
      from_language_options.unshift(['autodetected_from_word', 'Autodetect']);

      to_language_options = TransOverLanguages;

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
              label({for: 'tat_to_lang'}, 'to'),
              select({id: 'tat_to_lang'}, Jaml.render('lang_option', to_language_options)),
              input({type: 'submit', value: 'go'})
            )
          )
      });
      var popup_html = Jaml.render('popup_content');

      popup.bindFutureEvent('click', '#tat_popup input:submit', sendTranslate);

      popup.bindFutureEvent('keydown', '#tat_popup', function(e) {
          if (e.keyCode == 13) {
            sendTranslate();
          }
      });

      $(document).bind('keydown', hotkey.toLowerCase(), function() {
          if (popup.is_hidden()) {
            popup.show(10, 10, popup_html);
            popup.find('#tat_input').focus();
            popup.find('#tat_to_lang').val(options.target_lang);
          }
          else {
            popup.hide();
          }
      });
    };
})(jQuery);
