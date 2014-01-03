  Tooltip = function(args) {
    var opts = $.extend({dismiss_on: 'mousemove'}, args)
    var self = this;
    var tt;
    var future_events = [];

    function position(x, y, tt) {
      var pos = {};
      var margin = 5;
      var anchor = 10;

      // show popup to the right of the word if it fits into window this way
      if (x + anchor + tt.outerWidth(true) + margin < $(window).width()) {
        pos.x = x + anchor;
      }
      // show popup to the left of the word if it fits into window this way
      else if (x - anchor - tt.outerWidth(true) - margin > 0) {
        pos.x = x - anchor - tt.outerWidth(true);
      }
      // show popup at the very left if it is not wider than window
      else if (tt.outerWidth(true) + margin*2 < $(window).width()) {
        pos.x = margin;
      }
      // resize popup width to fit into window and position it the very left of the window
      else {
        var non_content_x = tt.outerWidth(true) - tt.width();

        tt.width( $(window).width() - margin*2 - non_content_x );
        tt.contents().find('.pos_translation').css('white-space', 'normal');

        tt.height(tt.contents().height() + 4);

        pos.x = margin;
      }

      // show popup above the word if it fits into window this way
      if (y - anchor - tt.outerHeight(true) - margin > 0) {
        pos.y = y - anchor - tt.outerHeight(true);
      }
      // show popup below the word if it fits into window this way
      else if (y + anchor + tt.outerHeight(true) + margin < $(window).height()) {
        pos.y = y + anchor;
      }
      // show popup at the very top of the window
      else {
        pos.y = margin;
      }

      return pos;
    }

    function recreate_container() {
      $('.transover-tooltip').remove();

      tt = $('<iframe>', {
          css: {
            background: '#fcf7d9',
            'text-align': 'left',
            'border-style': 'solid',
            'border-width': '1px',
            'border-color': '#ccc',
            'box-shadow': 'rgba(0,0,0,0.2) 0px 2px 5px',
            position: 'fixed',
            'border-radius': '5px',
            'z-index': 2147483647,
            width: 0,
            height: 0,
            display: 'none'
          },
          class: 'transover-tooltip'
      });
      tt.appendTo('body');

      var cssLink = document.createElement("link");
      cssLink.href = chrome.extension.getURL('iframe.css');
      cssLink.rel = "stylesheet";
      cssLink.type = "text/css";
      tt[0].contentDocument.head.appendChild(cssLink);
    }

    function setup_dismiss(tt) {
      if (opts.dismiss_on == 'mousemove') {
        $(document).on('mousemove_without_noise', self.hide);
        $(window).scroll(self.hide);
      }
      else {
        $(document).keydown(escape_hide_handler);
        tt.contents().keydown(escape_hide_handler);
      }
    }

    function escape_hide_handler(e) {
      if (e.keyCode == 27) {
        self.hide();
      }
    }

    function bind_future_events(tt) {
      future_events.forEach(function(event) {
          tt.contents().find(event.selector).on(event.event, event.action);
      })
    }

    function set_text_direction(text_direction, tt) {
      tt.contents().find('.pos_translation').css('direction', text_direction || 'ltr');
    }

    this.show = function(x, y, content, text_direction) {
      recreate_container();
      tt[0].contentDocument.body.innerHTML = content;

      // XXX hack: 'show it' (it won't be visible anyway because width and height are 0 by default)
      // so that resize() gets correct content width/height.
      // setTimeout below is for the same reason
      tt.show();

      setTimeout(function() {
          self.resize();

          var pos = position(x, y, tt);

          setup_dismiss(tt);

          bind_future_events(tt);

          set_text_direction(text_direction, tt);

          tt
            .hide()
            .css({ top: pos.y, left: pos.x })
            .fadeIn(100)
            .queue(function() {
                if (self.on_open) {
                  self.on_open()
                }
                $(this).dequeue();
            });
      }, 50);
    };

    function clear_dismiss_event_handlers() {
      $(window).off('scroll', self.hide);
      $(document)
        .off('mousemove_without_noise', self.hide)
        .off('keydown', escape_hide_handler);
    }

    this.hide = function() {
      clear_dismiss_event_handlers();
      tt.fadeOut(100);
    }

    this.is_hidden = function() {
      return !tt || tt.css('display') == 'none';
    }

    this.is_visible = function() {
      return tt && !this.is_hidden();
    }

    this.find = function(selector) {
      return tt.contents().find(selector);
    }

    this.bindFutureEvent = function(event, selector, action) {
      future_events.push({event: event, selector: selector, action: action});
    }

    this.resize = function() {
      tt.height(tt.contents().height());
      tt.width(tt.contents().width() + 10);
    }
  }
