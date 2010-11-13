
function Tooltip() {
  var tt = $('<span></span>')
    .css({
        background: 'white',
        color: 'black',
        padding: '0.5em',
        'font-size': '1.1em',
        position: 'fixed',
        display: 'none',
        opacity: 0.8
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
