Options = (function(){
    return {
      except_urls: function(urls) {
        if (urls instanceof Array) {
          localStorage['except_urls'] = urls.join(',');
        }
        return localStorage['except_urls'] ? localStorage['except_urls'].split(',') : [];
      },
      source_lang: function(lang) {
        if (lang) {
          localStorage['source_lang'] = lang;
        }
        return localStorage['source_lang'] || 'autodetect';
      },
      target_lang: function(lang) {
        if (lang) {
          localStorage['target_lang'] = lang;
        }
        return localStorage['target_lang'];
      },
      shift_only: function(arg) {
        if (arg != undefined) {
          localStorage['shift_only'] = arg;
        }
        return parseInt( localStorage['shift_only'] );
      },
      delay: function(ms) {
        if (ms != undefined && !isNaN(parseFloat(ms)) && isFinite(ms)) {
          localStorage['delay'] = ms;
        }
        return localStorage['delay'] == undefined ? 700 : parseInt(localStorage['delay']);
      }
    };
})();
