$.noConflict();
(function($) {
  var debug = false;

  function log(arg) {
    if (debug) {
      console.log(arg);
    }
  }

  chrome.extension.sendRequest({handler: 'get_options'}, function(response) {
    function process(e) {

      //TODO option to show translation in a growl type popup (in the corner)

      function getHitWord(e) {

        function escape_html(text) {
          return text.replace(XRegExp("(<|>|&)", 'g'), function ($0, $1) {
              switch ($1) {
                case '<': return "&lt;";
                case '>': return "&gt;";
                case '&': return "&amp;";
              }
          });
        }

        function restorable(node, do_stuff) {
          $(node).wrap('<transwrapper />');
          var res = do_stuff(node);
          $('transwrapper').replaceWith(escape_html( $('transwrapper').text() ));
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
        var word_re = "\\p{L}{2,}";
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
                  return this.textContent.replace(XRegExp("^(.{"+Math.round( node.textContent.length/2 )+"}\\p{L}*)(.*)", 's'), function($0, $1, $2) {
                      return '<transblock>'+escape_html($1)+'</transblock><transblock>'+escape_html($2)+'</transblock>';
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
                return this.textContent.replace(XRegExp("(<|>|&|\\p{L}+)", 'g'), function ($0, $1) {
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
              log("got it: "+hw);
            }
          }

          return hw;
        });

        return hit_word;
      }

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

        log('response: "'+response.source_lang+'" '+response.translation);

        if (options.target_lang == response.source_lang) {
          log('skipping translation into the same language');
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
      if (selection.toString() != '') {
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
        chrome.extension.sendRequest({handler: 'translate', word: word}, show_result);
      }
    }

    function hasMouseReallyMoved(e) { //or is it a tremor?
      var left_boundry = parseInt(last_mouse_stop.x) - 5,
        right_boundry  = parseInt(last_mouse_stop.x) + 5,
        top_boundry    = parseInt(last_mouse_stop.y) - 5,
        bottom_boundry = parseInt(last_mouse_stop.y) + 5;

      return e.clientX > right_boundry || e.clientX < left_boundry || e.clientY > bottom_boundry || e.clientY < top_boundry;
    }

    function withOptionsSatisfied(e, do_stuff) {
      if (options.target_lang) {
        //respect 'translate only when shift pressed' option
        if (options.shift_only && !shift_pressed) { return }

        //respect "don't translate these sites"
        if ($.grep(options.except_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0) { return }

        do_stuff();
      }
      else {
        if (start_tip.is(':hidden')) {
          start_tip.show(e.clientX, e.clientY, 'Please, <a href="'+chrome.extension.getURL('options.html')+'">choose language</a> to translate into.');
        }
      }
    }

    var options = JSON.parse( response.options );

    var tooltip = new Tooltip();
    var start_tip = new Tooltip();

    $(document).bind('mousestop', function(e) {
        withOptionsSatisfied(e, function() {
            //translate selection on hover regardless
            if (options.translate_by == 'point' || window.getSelection().toString() != '') {
              process(e);
            }
        });
    });
    $(document).click(function(e) {
        withOptionsSatisfied(e, function() {
            if (options.translate_by == 'click') {
              process(e);
            }
        });
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
    var last_mouse_stop = {x: 0, y: 0};

    // setup mousestop event
    $(document).mousemove(function(e){
      clearTimeout(timer25);

      timer25 = setTimeout(function() {
        if (!hasMouseReallyMoved(e)) { return }

        var mousestop = new $.Event("mousestop");
        last_mouse_stop.x = mousestop.clientX = e.clientX;
        last_mouse_stop.y = mousestop.clientY = e.clientY;

        $(document).trigger(mousestop);
      }, options.shift_only ? 200 : options.delay);
    });

    // hide translation on any move
    $(document).mousemove(function(e) {
      if (hasMouseReallyMoved(e)) {
        tooltip.hide();
      }
    });
    $(window).scroll(function() { tooltip.hide() });

    // hide start_tip on escape
    $(document).keydown(function(e) {
        if (e.keyCode == 27) {
          start_tip.hide();
        }
    });

    //chrome.extension.sendRequest({handler: 'set_encoding', encoding: document.charset});
  });
})(jQuery);

