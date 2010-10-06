$(function() {
  var timer25;
  var mousemove_cnt = 0;

  $(document.body).mousemove(function(e){

    var onmousestop = function() {
      //TODO skip entirely if users is selecting text (so that selection is not dropped)

      function ContentSnapshot(element) {
        var original_html = $(element).html();
        var original_input_vals = $('input', element)
          .map(function(idx, input) { $(input).val(); })
          .get();

        this.restore = function() {
          $(element).html(original_html);

          $('input', element).each(function(idx, input) {
            console.log('restoring: '+original_html[idx]);
            $(input).val(original_input_vals[idx]);
          });
        }
        return this;
      }

      function getHitWord(hit_elem) {
        var hit_word = '';
        hit_elem = $(hit_elem);

        //text contents of hit element
        var text_nodes = hit_elem.contents().filter(function(){
          return this.nodeType == Node.TEXT_NODE && this.nodeValue.match(/[a-zA-Z]{2,}/)
        });

        //bunch of text under cursor? break it into words
        if (text_nodes.length > 0) {

          var original_content = new ContentSnapshot(hit_elem);

          //wrap every word in every node in a dom element
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

          original_content.restore();
        }

        return hit_word;
      }

      var last_related_mousemove = mousemove_cnt;
      var hit_word = getHitWord(document.elementFromPoint(e.clientX, e.clientY));

      //call google translation through background page
      chrome.extension.sendRequest({word: hit_word}, function(response){
        if (last_related_mousemove == mousemove_cnt && hit_word != '') {
          console.log('response: '+response.translation);
        }
      });
    }

    //hide result
    mousemove_cnt++;

    clearTimeout(timer25);
    timer25 = setTimeout(onmousestop, 25);
  });
})
