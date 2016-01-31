function sendTranslate() {
  var word = document.getElementById('tat_input').value;
  var sl   = document.getElementById('tat_from_lang').value;
  var tl   = document.getElementById('tat_to_lang').value;

  if (!word || !tl || !sl) { return }

  chrome.extension.sendRequest({handler: 'tat_translate', word: word, tl: tl, sl: sl});
}

document.getElementById("tat_input").focus();

document.getElementById('swap_languages').onclick(function() {
  var from_lang = document.getElementById('tat_from_lang').value
  var to_lang   = document.getElementById('tat_to_lang').value

  document.getElementById('tat_from_lang').value = to_lang;
  document.getElementById('tat_to_lang').value = from_lang;
});

document.getElementById('tat_submit').onclick(sendTranslate);
document.getElementById('tat_popup').onkeydown(function(e) {
    if (e.keyCode == 13) {
      sendTranslate();
    }
});
