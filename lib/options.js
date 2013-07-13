Options = (function(){
    return {
      except_urls: function(urls) {
        if (urls instanceof Array) {
          localStorage['except_urls'] = urls.join(',');
        }
        return localStorage['except_urls'] ? localStorage['except_urls'].split(',') : [];
      },
      target_lang: function(lang) {
        if (lang) {
          localStorage['target_lang'] = lang;
        }
        return localStorage['target_lang'];
      },
      source_lang: function(lang) {
        if (lang) {
          localStorage['source_lang'] = lang;
        }
        return localStorage['source_lang'] || 'autodetected_from_word';
      },
      reverse_lang: function(lang) {
        if (arguments.length > 0) {
          localStorage['reverse_lang'] = lang;
        }
        return localStorage['reverse_lang'];
      },
      word_alt_only: function(arg) {
        if (arg != undefined) {
          localStorage['word_alt_only'] = arg;
        }
        return parseInt( localStorage['word_alt_only'] );
      },
      tts: function(arg) {
        if (arg != undefined) {
          localStorage['tts'] = arg;
        }
        return parseInt( localStorage['tts'] );
      },
      translate_by: function(arg) {
        if (arg == 'click' || arg == 'point') {
          localStorage.translate_by = arg;
        }
        return localStorage.translate_by || 'click';
      },
      delay: function(ms) {
        if (ms != undefined && !isNaN(parseFloat(ms)) && isFinite(ms)) {
          localStorage['delay'] = ms;
        }
        return localStorage['delay'] == undefined ? 700 : parseInt(localStorage['delay']);
      },
      type_and_translate_hotkey: function(arg) {
        if (arguments.length > 0) {
          localStorage['type_and_translate_hotkey'] = arg;
        }
        return localStorage['type_and_translate_hotkey'];
      },
      do_not_show_oops: function(arg) {
        if (arg != undefined) {
          localStorage['do_not_show_oops'] = arg;
        }
        return parseInt( localStorage['do_not_show_oops'] );
      }
    };
})();
