$(function() {
  var timer25;
  var mousemove_cnt = 0;

  $(document.body).mousemove(function(e){

    var onmousestop = function() {
      //get element under cursor
      var hit_element = $(document.elementFromPoint(e.clientX, e.clientY));

      function getHitWord(hit_elem) {
        var hit_word = '';

        //text contents of hit element
        var text_nodes = hit_elem.contents()
          .filter(function(){ return this.nodeType == Node.TEXT_NODE && this.nodeValue != "" });

        if (text_nodes.length > 0) {

          var old_contents = hit_elem.html();//TODO discard form inputs

          //wrap every word in every node in a dom element
          text_nodes.replaceWith(function(i) {
            return $(this).text().replace(/([a-zA-Z-]*)/, "<transover>$1</transover>")
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

          hit_element.html(old_contents);
        }

        return hit_word;
      }

      var last_related_mousemove = mousemove_cnt;
      var hit_word = getHitWord(hit_element);

      //call api

      if (last_related_mousemove == mousemove_cnt && hit_word != '') {
        //draw result
        console.log('hit word: '+hit_word);
      }

    };

    //hide result
    mousemove_cnt++;

    clearTimeout(timer25);
    timer25 = setTimeout(onmousestop, 25);
  });
})
