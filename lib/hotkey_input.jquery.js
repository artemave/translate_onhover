(function($) {
  $.fn.hotkeyInput = function() {
    var self = this;

    return this.on('keydown', function(e) {
        var keys = [];

        if (e.altKey) { 
          keys.push('Alt');
        };
        if (e.ctrlKey) { 
          keys.push('Ctrl');
        };
        if (e.metaKey) { 
          keys.push('Meta');
        };
        if (e.shiftKey) { 
          keys.push('Shift');
        };
        keys.push(String.fromCharCode(e.keyCode));

        self.val(keys.join('+'));

        return false;
    });
  };
})(jQuery);
