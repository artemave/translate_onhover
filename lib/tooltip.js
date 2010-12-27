
function Tooltip() {
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
