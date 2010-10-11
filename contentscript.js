$(function() {
  var timer25, last_x, last_y;
  var tooltip = new Tooltip();

  $(document.body).mousemove(function(e){

    var onmousestop = function() {
      //TODO skip entirely if users is selecting text (so that selection is not dropped)

      function translate() {
        function getHitWord(hit_elem) {
          var hit_word = '';
          hit_elem = $(hit_elem);

          //text contents of hit element
          var text_nodes = hit_elem.contents().filter(function(){
            return this.nodeType == Node.TEXT_NODE && this.nodeValue.match(/[a-zA-Z]{2,}/)
          });

          //bunch of text under cursor? break it into words
          if (text_nodes.length > 0) {
            var original_content = hit_elem.clone();

            //wrap every word in every node in a dom element (real magic happens here)
            text_nodes.replaceWith(function(i) {
              return $(this).text().replace(/([a-zA-Z-]*)/g, "<transover>$1</transover>")
            });

            //get the exact word under cursor
            var hit_word_elem = document.elementFromPoint(e.clientX, e.clientY);

            //no word under cursor? we are done
            if (hit_word_elem.nodeName != 'TRANSOVER') {
              console.log("missed!");
            }
            else  {
              hit_word = $(hit_word_elem).text();
              console.log("got it: "+hit_word);
            }

            hit_elem.replaceWith(original_content);
          }

          return hit_word;
        }

        if (last_x != e.clientX && last_y != e.clientY) { return }

        var hit_word = getHitWord(document.elementFromPoint(e.clientX, e.clientY));

        if (last_x == e.clientX && last_y == e.clientY && hit_word != '') {
          //call google translation through background page
          chrome.extension.sendRequest({word: hit_word}, function(response){
            console.log('response: '+response.translation);
            tooltip.show(e.clientX, e.clientY, response.translation);
            setTimeout(function() { tooltip.hide() }, 5000);
          });
        }
      }

      setTimeout(translate, 1000);
    }

    if (last_x != e.clientX || last_y != e.clientY) {
      tooltip.hide();
    }

    last_x = e.clientX;
    last_y = e.clientY;

    clearTimeout(timer25);
    timer25 = setTimeout(onmousestop, 25);
  });
})
