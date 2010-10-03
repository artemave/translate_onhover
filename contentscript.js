$(function() {
  var timer25;

  $(document.body).mousemove(function(e){
    var onmousestop = function() {
      alert("x: "+ e.pageX + "y: "+ e.pageY);
    };

    clearTimeout(timer25);
    timer25 = setTimeout(onmousestop, 250);
  });
  //1. onmousestop get the underneath element
  //2. split elem.text() into words
  //3. wrap every word into invisible element
  //4. find the word element that matches mouse coordinates
  //5. translate the word
  //6. show the result
})
