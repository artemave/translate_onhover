(function($){
  Tooltip = function() {
    function calculatePosition(x, y, tt) {
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

    function create_container() {
      $('.transover-tooltip').remove();

      var tt = $('<div>', {
          css: {
            background: '#fcf7d9',
            color: '#333',
            'text-align': 'left',
            'border-style': 'solid',
            'border-width': '1px',
            'border-color': '#ccc',
            'box-shadow': 'rgba(0,0,0,0.2) 0px 2px 5px',
            padding: '5px',
            font: 'normal normal normal 13px Arial, Helmet, Freesans, sans-serif',
            position: 'fixed',
            'border-radius': '5px',
            'z-index': 2147483638,
            display: 'none'
          },
          class: 'transover-tooltip'
      })
      .appendTo('body');

      return tt;
    }

    var tt = create_container();

    this.show = function(x, y, content) {
      tt = create_container();
      tt.html(content);

      var pos = calculatePosition(x, y, tt);

      tt
        .css({ top: pos.y, left: pos.x })
        .fadeIn(100);
    };

    this.hide = function() {
      tt.fadeOut(100);
    };

    this.is = function(arg) {
      return tt.is(arg);
    };

    return this;
  }
})(jQuery);
