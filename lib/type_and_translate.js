(function($){
    TypeAndTranslate = function(chrome, popup, options) {
      var hotkey = options.type_and_translate_hotkey;

      if (hotkey === undefined) {
        return;
      }

      Jaml.register('popup_content', function() {
          div(
            div(
              input({type: 'text'})
            ),
            div(
              label({for: 'tat_from_lang'}, 'from'),
              select({id: 'tat_from_lang'}),
              label({for: 'tat_to_lang'}, 'to'),
              select({id: 'tat_to_lang'}),
              input({type: 'submit', value: 'go'})
            )
          )
      });

      $(document).bind('keydown', hotkey.toLowerCase(), function() {
          popup.show(20, 20, Jaml.render('popup_content'));
      })
    };
})(jQuery);
