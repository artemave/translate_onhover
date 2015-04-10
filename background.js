RegExp.quote = function(str) {
  return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-46863240-1']);
_gaq.push(['_trackPageview']);

var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
ga.src = 'https://ssl.google-analytics.com/ga.js';
var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);

function translate(word, tl, last_translation, onresponse, sendResponse, ga_event_name) {
  var options = {
    url: "https://translate.googleapis.com/translate_a/single?dt=t&dt=bd",
    data: {
      client: 'gtx',
      q: word,
      sl: 'auto',
      tl: tl,
      dj: 1,
      source: 'bubble'
    },
    dataType: 'json',
    success: function on_success(data) {
      onresponse(data, word, tl, last_translation, sendResponse, ga_event_name);
    },
    error: function(xhr, status, e) {
      console.log({e: e, xhr: xhr});
    }
  };

  $.ajax(options);
}

function figureOutTl(tab_lang) {
  var tl;

  if (Options.target_lang() == tab_lang && Options.reverse_lang()) {
    tl = Options.reverse_lang();
    console.log('reverse translate into: ', tl);
  }
  else {
    tl = Options.target_lang();
    console.log('normal translate into:', tl);
  }

  return tl;
}

function on_translation_response(data, word, tl, last_translation, sendResponse, ga_event_name) {
  var output, translation = {tl: tl};

  console.log('raw_translation: ', data);

  if (!data.dict && !data.sentences ||
    (data.sentences && data.sentences[0].trans.match(new RegExp(TransOver.regexp_escape(word), 'i')))) {

    translation.succeeded = false;

    if (data.src == tl || Options.do_not_show_oops()) {
      output = '';
    }
    else {
      output = 'Oops.. No translation found.';
    }
  }
  else {
    translation.succeeded = true;
    translation.word = word;

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

  if (! output instanceof String) {
    output = JSON.stringify(output);
  }

  translation.translation = output;

  $.extend(last_translation, translation);

  _gaq.push(['_trackEvent', ga_event_name, translation.sl, translation.tl]);

  console.log('response: ', translation);
  sendResponse(translation);
}

var last_translation = {};

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    switch (request.handler) {
      case 'get_last_tat_tl':
      console.log('get_last_tat_tl');
      sendResponse({to_lang: localStorage['last_tat_to_language']});
      break;
      case 'get_options':
      sendResponse({
          options: JSON.stringify({
              except_urls: Options.except_urls(),
              target_lang: Options.target_lang(),
              reverse_lang: Options.reverse_lang(),
              delay: Options.delay(),
              word_key_only: Options.word_key_only(),
              selection_key_only: Options.selection_key_only(),
              tts: Options.tts(),
              tts_key: Options.tts_key(),
              popup_show_trigger: Options.popup_show_trigger(),
              translate_by: Options.translate_by()
          })
      });
      break;
      case 'translate':
      console.log("received to translate: " + request.word);

      chrome.tabs.detectLanguage(null, function(tab_lang) {
          console.log('tab language ', tab_lang);
          if (request.tl) {
            localStorage['last_tat_to_language'] = request.tl;
          }
          var tl = request.tl || figureOutTl(tab_lang);
          console.log('tl: ', tl)
          translate(request.word, tl, last_translation, on_translation_response, sendResponse, Options.translate_by());
      });
      break;
      case 'tts':
      if (last_translation.succeeded) {
        console.log("tts: " + last_translation.word + ", sl: " + last_translation.sl);
        _gaq.push(['_trackEvent', 'tts', last_translation.sl, last_translation.tl]);
        $('<audio autoplay src="http://translate.google.com/translate_tts?q='+last_translation.word+'&tl='+last_translation.sl+'"></audio>');
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

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == 'install') {
      chrome.tabs.create({url: chrome.extension.getURL('options.html')});
    }
});
