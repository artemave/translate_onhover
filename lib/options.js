Options = (function(){
    return {
      except_urls: function(urls) {
        if (urls) {
          localStorage['except_urls'] = urls.join(',');
        }
        return localStorage['except_urls'] ? localStorage['except_urls'].split(',') : [];
      },
      except_langs: function(langs) {
        if (langs) {
          localStorage['except_langs'] = langs.join(',');
        }
        return localStorage['except_langs'] ? localStorage['except_langs'].split(',') : [];
      },
      target_lang: function(lang) {
        if (lang) {
          localStorage['target_lang'] = lang;
        }
        return localStorage['target_lang'];
      },
      shift_only: function(arg) {
        if (arg) {
          localStorage['shift_only'] = arg;
        }
        return parseInt( localStorage['shift_only'] );
      }
    };
})();
