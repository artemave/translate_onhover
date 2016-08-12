var debug = false;

function log() {
  if (debug) {
    console.log(arguments);
  }
}

function ignoreThisPage(options) {
  return $.grep(options.except_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0;
}

function registerTransoverComponent(component) {
  var html = 'lib/' + component + '.html';
  var script = 'lib/' + component + '.js';

  var xhr = new XMLHttpRequest();
  xhr.open('GET', chrome.extension.getURL(html), true);
  xhr.responseType = 'document';
  xhr.onload = function(e) {
    var doc = e.target.response;
    document.documentElement.appendChild(doc.querySelector('template'));

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = chrome.extension.getURL(script);
    s.async = true;
    document.head.appendChild(s);
  }
  xhr.send();
}

function fadeOut(elementType) {
  $(elementType).each(function() {
    var self = this;
    $(this.shadowRoot.querySelector('main')).fadeOut('fast', function() { self.remove() });
  })
}

function showPopup(e, content) {
  fadeOut('transover-type-and-translate-popup');

  var $popup = $('<transover-popup>');
  $('body').append($popup);

  $popup.on("transover-popup_content_updated", function() {
      var pos = calculatePosition(e.clientX, e.clientY, $popup);
      $popup
        .each(function() {
          $(this.shadowRoot.querySelector('main')).hide();
        })
        .attr({ top: pos.y, left: pos.x })
        .each(function() {
          $(this.shadowRoot.querySelector('main')).fadeIn('fast');
        })
  });
  $popup.attr('content', content);
}

function calculatePosition(x, y, $popup) {
  var pos = {};
  var margin = 5;
  var anchor = 10;
  var outerWidth = Number($popup.attr('outer-width'));
  var outerHeight = Number($popup.attr('outer-height'));

  // show popup to the right of the word if it fits into window this way
  if (x + anchor + outerWidth + margin < $(window).width()) {
    pos.x = x + anchor;
  }
  // show popup to the left of the word if it fits into window this way
  else if (x - anchor - outerWidth - margin > 0) {
    pos.x = x - anchor - outerWidth;
  }
  // show popup at the very left if it is not wider than window
  else if (outerWidth + margin*2 < $(window).width()) {
    pos.x = margin;
  }
  // resize popup width to fit into window and position it the very left of the window
  else {
    var non_content_x = outerWidth - Number($popup.attr('content-width'));

    $popup.attr('content-width', $(window).width() - margin*2 - non_content_x );
    $popup.attr('content-height', Number($popup.attr('content-height')) + 4);

    pos.x = margin;
  }

  // show popup above the word if it fits into window this way
  if (y - anchor - outerHeight - margin > 0) {
    pos.y = y - anchor - outerHeight;
  }
  // show popup below the word if it fits into window this way
  else if (y + anchor + outerHeight + margin < $(window).height()) {
    pos.y = y + anchor;
  }
  // show popup at the very top of the window
  else {
    pos.y = margin;
  }

  return pos;
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

      //skip inputs and editable divs
      if (/INPUT|TEXTAREA/.test( hit_elem.nodeName ) || hit_elem.isContentEditable
        || $(hit_elem).parents().filter(function() { return this.isContentEditable }).length > 0) {

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

            showPopup(e, TransOver.formatTranslation(translation, TransOverLanguages[response.tl].direction));
        });
      }
    }

    function withOptionsSatisfied(e, do_stuff) {
      if (options.target_lang) {
        //respect 'translate only when alt pressed' option
        if (options.word_key_only && !show_popup_key_pressed) { return }

        //respect "don't translate these sites"
        if (ignoreThisPage(options)) { return }

        do_stuff();
      }
    }

    var options = JSON.parse( response.options );

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
    $(document).keydown(function(e) {
        if (TransOver.modifierKeys[e.keyCode] == options.popup_show_trigger) {
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

                var xy = { clientX: last_mouse_stop.x, clientY: last_mouse_stop.y };
                showPopup(xy, TransOver.formatTranslation(translation, TransOverLanguages[response.tl].direction));
            });
          }
        }
        // text-to-speech on ctrl press
        if (TransOver.modifierKeys[e.keyCode] == options.tts_key && options.tts && $('transover-popup').length > 0) {
          log("tts");
          chrome.extension.sendRequest({handler: 'tts'});
        }

        // Hide tat popup on escape
        if (e.keyCode == 27) {
          fadeOut('transover-type-and-translate-popup');
        }
    }).keyup(function(e) {
        if (TransOver.modifierKeys[e.keyCode] == options.popup_show_trigger) {
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

    $(document).scroll(function() {
      fadeOut('transover-popup');
    });

    // setup mousestop event
    $(document).on('mousemove_without_noise', function(e){
        fadeOut('transover-popup');

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

    chrome.extension.onRequest.addListener(
      function(request, sender, sendResponse) {
        if (window != window.top) return
        if (ignoreThisPage(options)) { return }

        if (request == 'open_type_and_translate') {
          if ($('transover-type-and-translate-popup').length == 0) {
            chrome.extension.sendRequest({handler: 'get_last_tat_sl_tl'}, function(response) {
                var $popup = $('<transover-type-and-translate-popup>');
                var languages = $.extend({}, TransOverLanguages);

                if (response.sl) {
                  languages[response.sl].selected_sl = true;
                }
                languages[response.tast_tl || options.target_lang].selected_tl = true;

                $popup.attr('data-languages', JSON.stringify(languages));
                $('body').append($popup);
                $popup.each(function() {
                  $(this.shadowRoot.querySelector('main')).hide().fadeIn('fast');
                });
            })
          }
          else {
            fadeOut('transover-type-and-translate-popup');
          }
        }
      }
    );

    $(function() {
      if (ignoreThisPage(options)) { return }
      registerTransoverComponent('popup');
      registerTransoverComponent('tat_popup');
    });
});

window.addEventListener('message', function(e) {
    // We only accept messages from ourselves
    if (e.source != window)
      return;

    if (e.data.type == 'transoverTranslate') {
      chrome.extension.sendRequest({handler: 'translate', word: e.data.text, sl: e.data.sl, tl: e.data.tl}, function(response) {
          log('tat response: ', response);

          var translation = TransOver.deserialize(response.translation);

          if (!translation) {
            log('tat skipping empty translation');
            return;
          }

          var e = { clientX: $(window).width(), clientY: 0 };
          showPopup(e, TransOver.formatTranslation(translation, TransOverLanguages[response.tl].direction));
      });
    }
});
