(function($){
    TypeAndTranslate = function(chrome, popup, hotkey) {
      console.log(hotkey.toLowerCase());
      $(document).bind('keydown', hotkey.toLowerCase(), function() {
          popup.show(40, 40, "WAT");
      })
    };
})(jQuery);
