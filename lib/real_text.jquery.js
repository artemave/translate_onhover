(function($) {
  $.fn.realText = function() {
    var text = '';

    function reduce(initial, n) {
      var node = $(n);
      node.contents().each(function() {
        if (node.is(':visible')) {
          if (this.nodeType == Node.TEXT_NODE) {
            initial += ' ' + this.nodeValue;
          }
          else {
            initial = reduce(initial, this);
          }
        }
      });
      return initial;
    }

    this.each(function(i, n) {
      text += ' ' + reduce(text, n);
    });
    return text;
  };
})(jQuery);

