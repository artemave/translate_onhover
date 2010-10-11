
function Tooltip() {
  var tt = $('<div></div>')
    .css({
        position: 'absolute',
        display: 'none',
        opacity: 0.8,
      })
    .addClass('site-tooltip')
    .appendTo("body")

  this.show = function(x, y, content) {
    if (tt.is(':hidden')) {
      tt
        .css({
          top: y + 5,
          left: x + 15
        })
        .text(content)
        .show();
    }
  }
  this.hide = function() { tt.hide() }

  return this;
}
