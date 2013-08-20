RegExp.quote = function(str) {
  return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

function translate(word, sl, tl, last_translation, onresponse, sendResponse) {
  $.ajax({
      url: "http://translate.google.com/translate_a/t",
      data: {
        client: 'blah', // atm api returns json of everything if random client specified
        q: word,
        sl: sl,
        tl: tl,
        ie: 'UTF8',
        oe: 'UTF8'
      },
      dataType: 'json',
      success: function(data) {
        onresponse(data, word, sl, tl, last_translation, sendResponse);
      },
      error: function(xhr, status, e) {
        console.log({e: e, xhr: xhr});
      }
  });
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

  if (data.dict) {
    translation.succeeded = true;
    translation.word = data.sentences[0].orig;

    output = [];

    data.dict.forEach(function(t) {
        output.push({pos: t.pos, meanings: t.terms});
    });

    // FIXME possibly no longer relevant - simply always sl = data.src INVESTIGATE
    if (sl == 'autodetected_from_word') {
      translation.sl = data.src;
    }
    else {
      translation.sl = sl;
    }
  } else {
    translation.succeeded = false;

    if (sl == tl || Options.do_not_show_oops()) {
      output = '';
    }
    else {
      output = no_translation_found;
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

      translate(request.word, request.sl, request.tl, last_translation, on_translation_response, sendResponse);
      break;
      case 'translate':
      console.log("received to translate: " + request.word);

      chrome.tabs.detectLanguage(null, function(tab_lang) {
          console.log('tab language', tab_lang);
          var langs = figureOutLangs(tab_lang);

          translate(request.word, langs.sl, langs.tl, last_translation, on_translation_response, sendResponse);
      });
      break;
      case 'tts':
      if (last_translation.succeeded) {
        console.log("tts: " + last_translation.word + ", sl: " + last_translation.sl);
        chrome.tts.speak(last_translation.word, {'lang': last_translation.sl});
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
