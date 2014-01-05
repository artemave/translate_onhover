(function($) {
  $.fn.hotkeyInput = function() {
    var self = this;

    var specialKeys = {
      20: "Capslock", 27: "Esc", 32: "Space", 33: "Pageup", 34: "Pagedown", 35: "End", 36: "Home",
      37: "Left", 38: "Up", 39: "Right", 40: "Down", 45: "Insert", 46: "Del", 186: ";", 187: "=",
      96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7", 188: ",", 189: "-",
      104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/", 190: ".", 192: "`",
      112: "F1", 113: "F2", 114: "F3", 115: "F4", 116: "F5", 117: "F6", 118: "F7", 119: "F8", 
      120: "F9", 121: "F10", 122: "F11", 123: "F12", 144: "Numlock", 145: "Scroll", 191: "/",
      9: "Tab", 13: "Return", 19: "Pause", 219: "[", 220: "\\", 221: "]", 222: "'"
    };

    var modifierKeys = {
      16: "shift", 17: "ctrl", 18: "alt", 224: "meta", 91: "command", 93: "command", 13: "Return"
    };

    return this.on('keydown', function(e) {
        var keys = [];

        // don't insert just modifier keys
        for (var key in modifierKeys) {
          if (e.keyCode == key) {
            return true;
          }
        }

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

        var key_label = String.fromCharCode(e.keyCode);
        for (var key in specialKeys) {
          if (e.keyCode == key) {
            key_label = specialKeys[key];
          }
        }
        keys.push(key_label);

        self.val(keys.join('+'));

        return false;
    });
  };
})(jQuery);
