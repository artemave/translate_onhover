
var tooltip = new Tooltip();

$(document).bind('mousestop', function(e) {

  //TODO option to show translation in a growl type popup (in the corner)

  function getHitWord(e) {
    var hit_word = '';
    var hit_elem = $(document.elementFromPoint(e.clientX, e.clientY));

    //don't mess with html inputs
    if (/INPUT|TEXTAREA/.test( hit_elem.get(0).nodeName )) {
      return '';
    }

    //text contents of hit element
    var text_nodes = hit_elem.contents().filter(function(){
      return this.nodeType == Node.TEXT_NODE && XRegExp("\\p{L}{2,}").test( this.nodeValue )
    });

    //bunch of text under cursor? break it into words
    if (text_nodes.length > 0) {
      var original_content = hit_elem.clone();

      //wrap every word in every node in a dom element (real magic happens here)
      text_nodes.replaceWith(function(i) {
        return $(this).text().replace(XRegExp("(\\p{L}*)", 'g'), "<transover>$1</transover>")
      });

      //get the exact word under cursor (and here)
      var hit_word_elem = document.elementFromPoint(e.clientX, e.clientY);

      //no word under cursor? we are done
      if (hit_word_elem.nodeName != 'TRANSOVER') {
        console.log("missed!");
      }
      else  {
        hit_word = $(hit_word_elem).text();
        console.log("got it: "+hit_word);
      }

      hit_elem.replaceWith(original_content);
    }
    else { console.log("no text")}

    return hit_word;
  }

  function translate_and_show(word, e) {
    chrome.extension.sendRequest({handler: 'translate', word: word}, function(response){
      console.log('response: '+response.translation);
      if (response.translation && response.translation != '') {
        tooltip.show(e.clientX, e.clientY, response.translation);
      }
    });
  }

  //skip entirely if user is selecting text (so that selection is not dropped)
  //TODO make it translate the selection
  if (window.getSelection() != '') { return }

  //don't bother translating into the same language
  if (source_lang == options.target_lang) { return }

  //respect 'don't translate into these languages' option
  if ((new RegExp(source_lang).test(options.except_langs))) { return }

  //respect 'translate only when shift pressed' option
  if (options.shift_only == 1 && !shift_pressed) { return }

  var word = getHitWord(e);

  if (word != '') { translate_and_show(word, e); }
});

var shift_pressed = false;
$(document)
  .keydown(function(event) {
    if (event.keyCode == 16) {
      shift_pressed = true;
    }
  }).keyup(function(event) {
    if (event.keyCode == 16) {
      shift_pressed = false;
    }
  });

var timer25;
// setup mousestop event
// mousestop triggers the entire thing - it is an entry point
$(document).mousemove(function(e){
  clearTimeout(timer25);

  timer25 = setTimeout(function() {
    if (last_x != e.clientX && last_y != e.clientY) { return }

    var mousestop = new $.Event("mousestop");
    mousestop.clientX = e.clientX;
    mousestop.clientY = e.clientY;
    $(document).trigger(mousestop);
  }, 1000);
});

var last_x, last_y;

// hide translation on any move
$(document).mousemove(function(e) {
  if (last_x != e.clientX || last_y != e.clientY) {
    tooltip.hide();
  }
  last_x = e.clientX;
  last_y = e.clientY;
});

//chrome.extension.sendRequest({handler: 'set_encoding', encoding: document.charset});

var options = {};
chrome.extension.sendRequest({handler: 'get_options'}, function(response) {
  options = response.options;
});

var source_lang;
chrome.extension.sendRequest({handler: 'detect_lang', detection_method: 'google_ext'}, function(response) {
  if (response.source_lang) {
    source_lang = response.source_lang;
  }
  else {
    chrome.extension.sendRequest({handler: 'detect_lang', detection_method: 'manual', content: $('body').realText().replace(/\s{2,}/g, ' ').slice(0,200)}, function(response) {
      if (response.source_lang) {
        source_lang = response.source_lang;
      }
      else {
        console.log("failed to detect source language");
      }
    });
  }
});
