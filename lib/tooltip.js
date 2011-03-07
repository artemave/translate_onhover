(function($){
  Tooltip = function() {
    var tt = $('<span></span>')
      .css({
          background: 'white',
          color: '#4f4f4f',
          'text-align': 'left',
          'border-style': 'solid',
          'border-width': '1px',
          'border-color': '#ccc',
          padding: '0.5em',
          font: 'normal normal normal 12px Verdana, Tahoma, sans-serif',
          position: 'fixed',
          'border-radius': '5px',
          'z-index': 2147483638,
          display: 'none'
        })
      .addClass('site-tooltip')
      .appendTo("body");

    this.show = function(x, y, content) {
      if (tt.is(':hidden')) {
        tt.html(content);

        var tx = $(window).width() - (x + 25 + tt.width()) > 0 ? x + 15 : x - 25 - tt.width(),
            ty = y - 35 > 0 ? y - 35 : y + 15;

        tt
          .css({
            top: ty,
            left: tx
          })
          .fadeIn(100);
      }
    }
    this.hide = function() { tt.fadeOut(100) }

    return this;
  }
})(jQuery);
