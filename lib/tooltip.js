Tooltip = (function () {
  function Tooltip(args) {
    var opts = $.extend({dismiss_on: 'mousemove'}, args)

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
        $('.pos_translation::shadow').css('white-space', 'normal');

        tt.height(tt.height() + 4);

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

    this.show = function(x, y, content) {
      var $tooltipHost = $('<div>', {
          id: 'transover-popup',
          class: 'dismiss_on_' + opts.dismiss_on,
          css: { position: 'fixed', 'z-index': 2147483647, top: '-1500px' }
        }
      ).appendTo('body');

      var tooltipShadow = $tooltipHost.get(0).createShadowRoot();
      var $layout = $(layout);
      $layout.find('main').append(content);
      tooltipShadow.innerHTML = $layout.html();

      var pos = position(x, y, $tooltipHost);

      $tooltipHost
        .hide()
        .css({ top: pos.y, left: pos.x })
        .fadeIn(100, function() {
            // TODO move to render
            // $('#tat_input::shadow').focus();
        });
    };

    this.hide = function() {
      hidePopup();
    }
  }

  Tooltip.isVisible = function() {
    return $('#transover-popup').length > 0
  }

  var layout;
  $.get(chrome.extension.getURL('popup.html'), function(t) {
      layout = t;
  });

  var hidePopup = function() {
    $('#transover-popup').fadeOut(100, function() {
        $(this).remove();
    });
  }

  $(document).on('mousemove_without_noise', '.dismiss_on_mousemove', hidePopup);
  $(window).on('scroll', '.dismiss_on_mousemove', hidePopup);
  $(document).on('keydown', '.dismiss_on_escape', function(e) {
      if (e.keyCode == 27) {
        hidePopup();
      }
  });

  return Tooltip;
})();
