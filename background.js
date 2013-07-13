RegExp.quote = function(str) {
  return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

function translate(word, sl, tl, last_translation, onresponse, sendResponse) {
  $.ajax({
      url: "http://www.google.com/translate_a/t",
      dataType: 'json',
      data: {
        client: 'ig',
        text: word,
        sl: sl,
        tl: tl,
        ie: 'UTF8',
        oe: 'UTF8'
      },
      success: function(data) {
        onresponse(data, word, sl, tl, last_translation, sendResponse);
      },
      error: function(xrh, status, e) {
        console.log(e);
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
  else {
    sl = Options.source_lang();
    tl = Options.target_lang();
    console.log('normal translate:', sl, '->', tl);
  }

  return { sl: sl, tl: tl };
}

// Sometimes (e.g. french->russian) Google API returns translation in capitals
function normalizeCase(text) {
  function is_all_upper_case(t) {
    return XRegExp('^[\\p{Lu} ]+$').test(t);
  };

  if (text instanceof Array) {
    if (_.all(text, is_all_upper_case)) {
      return _.map(text, function(t) { return t.toLowerCase() });
    }
  }
  else {
    if (is_all_upper_case(text)) {
      return text.toLowerCase();
    }
  }
  return text;
};

function translateHappened(text, result) {
  if (typeof result == "string") {
    //Google API may return original word if failed to translate
    return !result.match(new RegExp('^('+RegExp.quote(text)+')?$', 'i'));
  }
  return true;
};

function on_translation_response(data, word, sl, tl, last_translation, sendResponse) {
  var output, translation = {tl: tl};

  //If all goes well, Google API returns something like this:
  // with source language 'autodetect'
  //   ['book', 'ru', [['noun', 'book', 'blah blah', 'lorem'], ['verb', 'to book', 'to blah blah', 'lorem']]]
  // with source language set
  //   ['book', [['noun', 'book', 'blah blah', 'lorem'], ['verb', 'to book', 'to blah blah', 'lorem']]]
  if (data[data.length - 1] instanceof Array) {
    output                = [];
    translation.succeeded = true;
    var raw_translation   = data.pop();
    translation.word      = word;

    raw_translation.forEach(function(t) {
        var part_of_speech = t.shift();
        output.push({pos: part_of_speech, meanings: normalizeCase(t)});
    });

    if (sl == 'autodetected_from_word') {
      translation.sl = data.pop();
    }
    else {
      translation.sl = sl;
    }
  }
  // Google dictionary API falls back to Google translate API if unsuccessful. Hence we receive something like this:
  // with source language 'autodetect'
  //   ['book', 'ru']
  // with source language set
  //   'book'
  else  {
    if (sl == 'autodetected_from_word' && data instanceof Array) {
      sl = data.pop();
    }
    translation.sl = sl;

    var raw_translation = normalizeCase(data.toString());

    if (sl == tl) { // don't translate into the same language
      translation.succeeded = false;
      output                = '';
    }
    else if (!translateHappened(word, raw_translation)) {
      translation.succeeded = false;
      if (Options.do_not_show_oops()) {
        output = ''
      }
      else {
        output = no_translation_found;
      }
    }
    else {
      translation.succeeded = true;
      output                = raw_translation;
      translation.word      = word;
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
        var audio = $("<audio src='http://translate.google.com/translate_tts?q="+last_translation.word+"&tl="+last_translation.sl+"'></audio>");
        // I would use autoplay instead, if only it wasn't echoing
        audio.on('canplaythrough', function () {
            audio.get(0).play();
        })
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
