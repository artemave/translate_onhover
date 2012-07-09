(function($) {
  $.fn.hotkeyInput = function() {
    var self = this;

    var specialKeys = {
      20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
      37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 186: ";", 187: "=",
      96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7", 188: ",", 189: "-",
      104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/", 190: ".", 192: "`",
      112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8", 
      120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/",
      9: "tab", 13: "return", 19: "pause", 219: "[", 220: "\\", 221: "]", 222: "'"
    };

    var modifierKeys = {
      16: "shift", 17: "ctrl", 18: "alt", 224: "meta", 91: "command", 93: "command"
    };

    return this.on('keydown', function(e) {
        var keys = [];

        // don't insert just modifier keys
        for (var key in modifierKeys) {
          if (e.keyCode == key) {
            return false;
          }
        }

        if (e.altKey) { 
          keys.push('alt');
        };
        if (e.ctrlKey) { 
          keys.push('ctrl');
        };
        if (e.metaKey) { 
          keys.push('meta');
        };
        if (e.shiftKey) { 
          keys.push('shift');
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
