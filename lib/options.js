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
        return localStorage['source_lang'] || 'autodetect';
      },
      shift_only: function(arg) {
        if (arg != undefined) {
          localStorage['shift_only'] = arg;
        }
        return parseInt( localStorage['shift_only'] );
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
      }
    };
})();
