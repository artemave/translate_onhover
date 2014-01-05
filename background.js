RegExp.quote = function(str) {
  return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-46863240-1']);
_gaq.push(['_trackPageview']);

var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
ga.src = 'https://ssl.google-analytics.com/ga.js';
var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);

function translate(word, sl, tl, last_translation, onresponse, sendResponse) {
  var options = {
    url: "https://translate.google.com/translate_a/t",
    data: {
      q: word,
      sl: sl,
      tl: tl,
      ie: 'UTF8',
      oe: 'UTF8'
    },
    error: function(xhr, status, e) {
      console.log({e: e, xhr: xhr});
    }
  };

  if (/\s/.test(word)) {
    $.extend(options, {
        accepts: '*/*',
        dataType: 'text',
        success: function on_success(data) {
          onresponse(eval(data), word, sl, tl, last_translation, sendResponse);
        }
    });
    options.data.client = 't'
  }
  else {
    $.extend(options, {
        dataType: 'json',
        success: function on_success(data) {
          onresponse(data, word, sl, tl, last_translation, sendResponse);
        }
    });
    options.data.client = 'blah'; // atm api returns json of everything if random client specified
  }
  $.ajax(options);
}

function figureOutLangs(tab_lang) {
  var sl;
  var tl;

  if (Options.target_lang() == tab_lang && Options.reverse_lang()) {
    sl = tab_lang;
    tl = Options.reverse_lang();
    console.log('reverse translate:', sl, '->', tl);
  }
  else if (Options.source_lang() == 'autodetected_from_locale') {
    sl = tab_lang;
    tl = Options.target_lang();
    console.log('normal (autodetected_from_locale) translate:', sl, '->', tl);
  }
  else {
    sl = Options.source_lang();
    tl = Options.target_lang();
    console.log('normal translate:', sl, '->', tl);
  }

  return { sl: sl, tl: tl };
}

function on_translation_response(data, word, sl, tl, last_translation, sendResponse) {
  var output, translation = {tl: tl};

  console.log('raw_translation: ', data);

  if (data instanceof Array) { // multiword
    translation.succeeded = true;
    translation.sl = data[2];

    output = ''
    data[0].forEach(function(t) {
        output += t[0];
    });
  } else { // single word
    if (data.sentences[0].orig == data.sentences[0].trans) {
      translation.succeeded = false;

      if (sl == tl || Options.do_not_show_oops()) {
        output = '';
      }
      else {
        output = no_translation_found;
      }
    }
    else {
      translation.succeeded = true;
      translation.word = data.sentences[0].orig;

      if (data.dict) { // full translation
        output = [];
        data.dict.forEach(function(t) {
            output.push({pos: t.pos, meanings: t.terms});
        });
      } else { // single word translation
        output = data.sentences[0].trans;
      }

      translation.sl = data.src;
    }
  }

  translation.translation = JSON.stringify(output);

  $.extend(last_translation, translation);

  console.log('response: ', translation);
  sendResponse(translation);
}

var last_translation = {};
var no_translation_found = '<div class="pos_translation">Oops.. No translation found.</div>';

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    switch (request.handler) {
      case 'get_last_tat_to_and_from_languages':
      console.log('get_last_tat_to_and_from_languages');
      sendResponse({from_lang: localStorage['last_tat_from_language'], to_lang: localStorage['last_tat_to_language']});
      break;
      case 'get_options':
      sendResponse({
          options: JSON.stringify({
              except_urls: Options.except_urls(),
              target_lang: Options.target_lang(),
              reverse_lang: Options.reverse_lang(),
              delay: Options.delay(),
              word_alt_only: Options.word_alt_only(),
              selection_alt_only: Options.selection_alt_only(),
              tts: Options.tts(),
              type_and_translate_hotkey: Options.type_and_translate_hotkey(),
              translate_by: Options.translate_by()
          })
      });
      break;
      case 'translate_with_explicit_languages':
      console.log("type_and_translate", request.word, request.sl, request.tl);

      localStorage['last_tat_from_language'] = request.sl;
      localStorage['last_tat_to_language'] = request.tl;

      _gaq.push(['_trackEvent', 'popup' , request.sl, request.tl]);
      translate(request.word, request.sl, request.tl, last_translation, on_translation_response, sendResponse);
      break;
      case 'translate':
      console.log("received to translate: " + request.word);

      chrome.tabs.detectLanguage(null, function(tab_lang) {
          console.log('tab language', tab_lang);
          var langs = figureOutLangs(tab_lang);

          _gaq.push(['_trackEvent', Options.translate_by() , langs.sl, langs.tl]);
          translate(request.word, langs.sl, langs.tl, last_translation, on_translation_response, sendResponse);
      });
      break;
      case 'tts':
      if (last_translation.succeeded) {
        console.log("tts: " + last_translation.word + ", sl: " + last_translation.sl);
        _gaq.push(['_trackEvent', 'tts', last_translation.sl, last_translation.tl]);
        $("<audio autoplay src='http://translate.google.com/translate_tts?q="+last_translation.word+"&tl="+last_translation.sl+"'></audio>");
      }
      sendResponse({});
      break;
      default:
      console.log("Error! Unknown handler");
      sendResponse({});
    }
});

chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendRequest(tab.id, 'open_type_and_translate');
});
