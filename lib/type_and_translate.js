(function($){
    TypeAndTranslate = function(chrome, popup, options) {
      var hotkey = options.type_and_translate_hotkey;

      if (hotkey === undefined) {
        return;
      }

      Jaml.register('lang_option', function(lang) {
          option({value: lang[0]}, lang[1]);
      });

      language_options = TransOverLanguages;
      language_options.unshift([null, 'Select']);

      Jaml.register('popup_content', function() {
          div(
            div(
              input({type: 'text'})
            ),
            div(
              label({for: 'tat_from_lang'}, 'from'),
              select({id: 'tat_from_lang'}, Jaml.render('lang_option', language_options)),
              label({for: 'tat_to_lang'}, 'to'),
              select({id: 'tat_to_lang'}, Jaml.render('lang_option', language_options)),
              input({type: 'submit', value: 'go'})
            )
          )
      });

      $(document).bind('keydown', hotkey.toLowerCase(), function() {
          popup.show(20, 20, Jaml.render('popup_content'));
      })
    };
})(jQuery);
