$.noConflict();
(function($) {
  var $debug = false;

  var original_console_log = console.log;
  console.log = function(arg) {
    if ($debug) {
      original_console_log.call(this, arg);
    }
  }

  var tooltip = new Tooltip();
  var start_tip = new Tooltip();

  $(document).bind('mousestop', function(e) {

    //TODO option to show translation in a growl type popup (in the corner)
    //TODO 'no style' class for transover element

    function getHitWord(e) {
      var hit_word = '';
      var hit_elem = $(document.elementFromPoint(e.clientX, e.clientY));

      //get text contents of hit element
      var text_nodes = hit_elem.contents().filter(function(){
        return this.nodeType == Node.TEXT_NODE && XRegExp("\\p{L}{2,}").test( this.nodeValue )
      });

      if (text_nodes.length == 0) {
        console.log('no text');
        return '';
      }

      //wrap every word in every node in a dom element (real magic happens here)
      text_nodes.each(function(i) {
          $(this).replaceWith(function() {
              return '<transblock id="transblock_'+i+'">' + $(this).text().replace(XRegExp("(<|>|&|\\p{L}+)", 'g'), function ($0, $1) {
                  switch ($1) {
                    case '<': return "&lt;";
                    case '>': return "&gt;";
                    case '&': return "&amp;";
                    default: return '<transover>'+$1+'</transover>';
                  }
              }) + '</transblock>';
          });
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

      //cleanup
      text_nodes.each(function(i) {
          $('#transblock_' + i).replaceWith( this.nodeValue.replace(XRegExp("(<|>|&|\\p{L}+)", 'g'), function ($0, $1) {
              switch ($1) {
                case '<': return "&lt;";
                case '>': return "&gt;";
                case '&': return "&amp;";
                default: return $1;
              }
          }));
      });

      return hit_word;
    }

    //respect 'translate only when shift pressed' option
    if (options.shift_only && !shift_pressed) { return }

    //respect "don't translate these sites"
    if ($.grep(options.except_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0) { return }

    if (!options.target_lang) {
      if (start_tip.is(':hidden')) {
        start_tip.show(e.clientX, e.clientY, 'Please, choose language to translate into in TransOver <a href="'+chrome.extension.getURL('options.html')+'">options</a>');
      }
    }
    else {
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

        console.log('response: "'+response.source_lang+'" '+response.translation);

        if (options.target_lang == response.source_lang) {
          console.log('skipping translation into the same language');
          return;
        }

        var translation = deserialize(response.translation);
        var formatted_translation = '';

        if (translation instanceof Array) {
          _.each(translation, function(pos_block) {
              var formatted_pos = pos_block.pos ? '<bolds>'+pos_block.pos+'</bolds>: ' : '';
              var formatted_meanings = pos_block.meanings.slice(0,5).join(', ') + ( pos_block.meanings.length > 5 ? '...' : '' );
              formatted_translation = formatted_translation + formatted_pos + formatted_meanings + '<br/>';
          });
        }
        else {
          formatted_translation = translation;
        }

        tooltip.show(e.clientX, e.clientY, formatted_translation);
      };

      var selection = window.getSelection();
      var hit_elem = document.elementFromPoint(e.clientX, e.clientY);

      //don't mess with html inputs
      if (/INPUT|TEXTAREA/.test( hit_elem.nodeName )) {
        return;
      }

      var word = '';
      if (selection.toString() != '' && selection.containsNode(hit_elem, true)) {
        word = selection.toString();
      }
      else {
        word = getHitWord(e);
      }
      if (word != '') {
        chrome.extension.sendRequest({handler: 'translate', word: word}, show_result);
      }
    }
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
    }, options.shift_only ? 200 : options.delay);
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
  $(window).scroll(function() { tooltip.hide() });

  // hide start_tip on click outside and escape
  $(document)
    .click(function(e) {
      var hit_elem = document.elementFromPoint(e.clientX, e.clientY);
      if (!$(hit_elem).hasClass('transover-tooltip')) {
        start_tip.hide();
      }
    }).keydown(function(e) {
      if (e.keyCode == 27) {
        start_tip.hide();
      }
    });

  //chrome.extension.sendRequest({handler: 'set_encoding', encoding: document.charset});

  var options = {};
  chrome.extension.sendRequest({handler: 'get_options'}, function(response) {
    options = response.options;
  });

})(jQuery);

