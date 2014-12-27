var debug = false;

function log() {
  if (debug) {
    console.log(arguments);
  }
}

chrome.extension.sendRequest({handler: 'get_options'}, function(response) {

  function process(e) {

    function getHitWord(e) {

      function restorable(node, do_stuff) {
        $(node).wrap('<transwrapper />');
        var res = do_stuff(node);
        $('transwrapper').replaceWith(TransOver.escape_html( $('transwrapper').text() ));
        return res;
      }

      function getExactTextNode(nodes, e) {
        $(text_nodes).wrap('<transblock />');
        var hit_text_node = document.elementFromPoint(e.clientX, e.clientY);

        //means we hit between the lines
        if (hit_text_node.nodeName != 'TRANSBLOCK') {
          $(text_nodes).unwrap();
          return null;
        }

        hit_text_node = hit_text_node.childNodes[0];

        $(text_nodes).unwrap();

        return hit_text_node;
      }

      var hit_elem = $(document.elementFromPoint(e.clientX, e.clientY));
      var word_re = "\\p{L}+(?:['’]\\p{L}+)*"
      var parent_font_style = {
        'line-height': hit_elem.css('line-height'),
        'font-size': '1em',
        'font-family': hit_elem.css('font-family')
      };

      var text_nodes = hit_elem.contents().filter(function(){
        return this.nodeType == Node.TEXT_NODE && XRegExp(word_re).test( this.nodeValue )
      });

      if (text_nodes.length == 0) {
        log('no text');
        return '';
      }

      var hit_text_node = getExactTextNode(text_nodes, e);
      if (!hit_text_node) {
        log('hit between lines');
        return '';
      }

      var hit_word = restorable(hit_text_node, function(node) {
        var hw = '';

        function getHitText(node, parent_font_style) {
          log("getHitText: '" + node.textContent + "'");

          if (XRegExp(word_re).test( node.textContent )) {
            $(node).replaceWith(function() {
                return this.textContent.replace(XRegExp("^(.{"+Math.round( node.textContent.length/2 )+"}(?:\\p{L}|['’](?=\\p{L}))*)(.*)", 's'), function($0, $1, $2) {
                    return '<transblock>'+TransOver.escape_html($1)+'</transblock><transblock>'+TransOver.escape_html($2)+'</transblock>';
                });
            });

            $('transblock').css(parent_font_style);

            var next_node = document.elementFromPoint(e.clientX, e.clientY).childNodes[0];

            if (next_node.textContent == node.textContent) {
              return next_node;
            }
            else {
              return getHitText(next_node, parent_font_style);
            }
          }
          else {
            return null;
          }
        }

        var minimal_text_node = getHitText(hit_text_node, parent_font_style);

        if (minimal_text_node) {
          //wrap words inside text node into <transover> element
          $(minimal_text_node).replaceWith(function() {
              return this.textContent.replace(XRegExp("(<|>|&|"+word_re+")", 'gs'), function ($0, $1) {
                  switch ($1) {
                    case '<': return "&lt;";
                    case '>': return "&gt;";
                    case '&': return "&amp;";
                    default: return '<transover>'+$1+'</transover>';
                  }
              });
          });

          $('transover').css(parent_font_style);

          //get the exact word under cursor
          var hit_word_elem = document.elementFromPoint(e.clientX, e.clientY);

          //no word under cursor? we are done
          if (hit_word_elem.nodeName != 'TRANSOVER') {
            log("missed!");
          }
          else  {
            hw = $(hit_word_elem).text();
            log("got it: '"+hw+"'");
          }
        }

        return hw;
      });

      return hit_word;
    }

    var selection = window.getSelection();
    var hit_elem = document.elementFromPoint(e.clientX, e.clientY);

    // happens sometimes on page resize (I think)
    if (!hit_elem) {
      return;
    }

    //skip inputs
    if (/INPUT|TEXTAREA/.test( hit_elem.nodeName ) || hit_elem.isContentEditable) {
      return;
    }

    //and editable divs
    if (hit_elem.getAttribute('contenteditable') == 'true' || $(hit_elem).parents('[contenteditable=true]').length > 0) {
      return;
    }

    var word = '';
    if (selection.toString()) {

      if (options.selection_key_only) {
        log('Skip because "selection_key_only"');
        return;
      }

      log('Got selection: ' + selection.toString());

      var sel_container = selection.getRangeAt(0).commonAncestorContainer;

      while (sel_container.nodeType != Node.ELEMENT_NODE) {
        sel_container = sel_container.parentNode;
      }

      if (
        // only choose selection if mouse stopped within immediate parent of selection
        ( $(hit_elem).is(sel_container) || $.contains(sel_container, hit_elem) )
        // and since it can still be quite a large area
        // narrow it down by only choosing selection if mouse points at the element that is (partially) inside selection
        && selection.containsNode(hit_elem, true)
          // But what is the point for the first part of condition? Well, without it, pointing at body for instance would also satisfy the second part
          // resulting in selection translation showing up in random places
      ) {
        word = selection.toString();
      }
      else if (options.translate_by == 'point') {
        word = getHitWord(e);
      }
    }
    else {
      word = getHitWord(e);
    }
    if (word != '') {
      chrome.extension.sendRequest({handler: 'translate', word: word}, function(response) {
          log('response: ', response);

          var translation = TransOver.deserialize(response.translation);

          if (!translation) {
            log('skipping empty translation');
            return;
          }

          tooltip.show(e.clientX, e.clientY, TransOver.formatTranslation(translation), getLangDirection(response.tl));
      });
    }
  }

  function withOptionsSatisfied(e, do_stuff) {
    if (options.target_lang) {
      //respect 'translate only when alt pressed' option
      if (options.word_key_only && !show_popup_key_pressed) { return }

      //respect "don't translate these sites"
      if ($.grep(options.except_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0) { return }

      do_stuff();
    }
  }

  var options = JSON.parse( response.options );

  var tooltip = new Tooltip({dismiss_on: 'mousemove'});

  $(document).on('mousestop', function(e) {
      withOptionsSatisfied(e, function() {
          // translate selection unless 'translate selection on alt only' is set
          if (window.getSelection().toString()) {
            if (!options.selection_key_only) {
              process(e);
            }
          } else {
            if (options.translate_by == 'point') {
              process(e);
            }
          }
      });
  });
  $(document).click(function(e) {
      withOptionsSatisfied(e, function() {
          if (options.translate_by != 'click')
            return
          if ($(e.target).closest('a').length > 0)
            return

          process(e);
      });
      return true;
  });

  var show_popup_key_pressed = false;
  $(document)
    .keydown(function(e) {
      if (TransOver.modifierKeys[event.keyCode] == options.popup_show_trigger) {
        show_popup_key_pressed = true;

        var selection = window.getSelection().toString();

        if (options.selection_key_only && selection) {
          log('Got selection_key_only');

          chrome.extension.sendRequest({handler: 'translate', word: selection}, function(response) {
              log('response: ', response);

              var translation = TransOver.deserialize(response.translation);

              if (!translation) {
                log('skipping empty translation');
                return;
              }

              tooltip.show(last_mouse_stop.x, last_mouse_stop.y, TransOver.formatTranslation(translation), getLangDirection(response.tl));
          });
        }
      }
      // text-to-speech on ctrl press
      if (e.keyCode == 17 && options.tts && (tooltip.is_visible() || type_and_translate_tooltip.is_visible())) {
        log("tts");
        chrome.extension.sendRequest({handler: 'tts'});
      }
    }).keyup(function(event) {
      if (TransOver.modifierKeys[event.keyCode] == options.popup_show_trigger) {
        show_popup_key_pressed = false;
      }
    });

  function hasMouseReallyMoved(e) { //or is it a tremor?
    var left_boundry = parseInt(last_mouse_stop.x) - 5,
      right_boundry  = parseInt(last_mouse_stop.x) + 5,
      top_boundry    = parseInt(last_mouse_stop.y) - 5,
      bottom_boundry = parseInt(last_mouse_stop.y) + 5;

    return e.clientX > right_boundry || e.clientX < left_boundry || e.clientY > bottom_boundry || e.clientY < top_boundry;
  }

  $(document).mousemove(function(e) {
      if (hasMouseReallyMoved(e)) {
        var mousemove_without_noise = new $.Event('mousemove_without_noise');
        mousemove_without_noise.clientX = e.clientX;
        mousemove_without_noise.clientY = e.clientY;

        $(document).trigger(mousemove_without_noise);
      }
  })

  var timer25;
  var last_mouse_stop = {x: 0, y: 0};

  // setup mousestop event
  $(document).on('mousemove_without_noise', function(e){
    clearTimeout(timer25);

    var delay = options.delay;

    if (window.getSelection().toString()) {
      if (options.selection_key_only) {
        delay = 200;
      }
    } else {
      if (options.word_key_only) {
        delay = 200;
      }
    }

    timer25 = setTimeout(function() {
      var mousestop = new $.Event("mousestop");
      last_mouse_stop.x = mousestop.clientX = e.clientX;
      last_mouse_stop.y = mousestop.clientY = e.clientY;

      $(document).trigger(mousestop);
    }, delay);
  });

  if (window == window.top) {
    var type_and_translate_tooltip = new Tooltip({dismiss_on: 'escape'});
    new TypeAndTranslate(chrome, type_and_translate_tooltip, options, log);
  }
});
