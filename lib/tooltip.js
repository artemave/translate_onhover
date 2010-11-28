
function Tooltip() {
  var tt = $('<span></span>')
    .css({
        background: 'white',
        color: 'black',
        'border-style': 'dotted',
        'border-width': '1px',
        padding: '0.5em',
        font: 'normal normal normal 12px Verdana, Tahoma, sans-serif',
        position: 'fixed',
        'z-index': 10,
        display: 'none'
      })
    .addClass('site-tooltip')
    .appendTo("body")

  this.show = function(x, y, content) {
    if (tt.is(':hidden')) {
      tt
        .css({
          top: y - 35,
          left: x + 5
        })
        .html(content)
        .show();
    }
  }
  this.hide = function() { tt.hide() }

  return this;
}
