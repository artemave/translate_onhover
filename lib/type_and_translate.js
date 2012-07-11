(function($){
    TypeAndTranslate = function(chrome, popup, options) {
      function show_result(response) {
        function deserialize(text) {
          var res;

          try {
            res = JSON.parse(text);
          }
          catch (e) {
            // that means text is string as opposed to serialized object
            if (e.toString() == 'SyntaxError: Unexpected token ILLEGAL') {
              res = text;
            }
            else {
              throw e;
            }
          }
          return res;
        };

        console.log('tat response: ', response.translation);

        var translation = deserialize(response.translation);

        if (!translation) {
          console.log('skipping empty translation');
          return;
        }

        var formatted_translation = '';

        if (translation instanceof Array) {
          _.each(translation, function(pos_block) {
              var formatted_pos = pos_block.pos ? '<bolds>'+pos_block.pos+'</bolds>: ' : '';
              var formatted_meanings = pos_block.meanings.join(', ');
              formatted_translation = formatted_translation + formatted_pos + formatted_meanings + '<br/>';
          });
        }
        else {
          formatted_translation = translation;
        }

        $('#tat_result').html(formatted_translation);
      };

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
          div({id: 'tat_popup'},
            div(
              input({id: 'tat_input', type: 'text'})
            ),
            div(
              label({for: 'tat_from_lang'}, 'from'),
              select({id: 'tat_from_lang'}, Jaml.render('lang_option', language_options)),
              label({for: 'tat_to_lang'}, 'to'),
              select({id: 'tat_to_lang'}, Jaml.render('lang_option', language_options)),
              input({type: 'submit', value: 'go'}),
              div({id: 'tat_result'})
            )
          )
      });

      $(document).on('click', '#tat_popup input:submit', function() {
          var word = $('#tat_input').val();
          var sl   = $('#tat_from_lang').val();
          var tl   = $('#tat_to_lang').val();

          if (!word || !sl || !tl) { return }

          chrome.extension.sendRequest({handler: 'translate_with_explicit_languages', word: word, sl: sl, tl: tl}, show_result);
      });

      $(document).bind('keydown', hotkey.toLowerCase(), function() {
          popup.show(20, 20, Jaml.render('popup_content'));
      });
    };
})(jQuery);
