TransOver = {};

TransOver.modifierKeys = {
  16: "shift", 17: "ctrl", 18: "alt", 224: "meta", 91: "command", 93: "command", 13: "Return"
};

TransOver.deserialize = function(text) {
  var res;

  try {
    res = JSON.parse(text);
  }
  catch (e) {
    // that means text is a string (including "") as opposed to a serialized object
    if (e.toString().match(/SyntaxError: Unexpected (token|end of input)/)) {
      res = text;
    }
    else {
      throw e;
    }
  }
  return res;
};

TransOver.formatTranslation = function(translation) {
  var formatted_translation = '';

  if (translation instanceof Array) {
    translation.forEach(function(pos_block) {
        var formatted_pos = pos_block.pos ? '<strong>'+pos_block.pos+'</strong>: ' : '';
        var formatted_meanings = pos_block.meanings.slice(0,5).join(', ') + ( pos_block.meanings.length > 5 ? '...' : '' );
        formatted_translation = formatted_translation + '<div class="pos_translation">' + formatted_pos + formatted_meanings + '</div></br>';
    });
  }
  else {
    formatted_translation = '<div class="pos_translation">' + TransOver.escape_html(translation) + '</div>';
  }

  return formatted_translation;
}

TransOver.escape_html = function(text) {
  return text.replace(XRegExp("(<|>|&)", 'g'), function ($0, $1) {
      switch ($1) {
        case '<': return "&lt;";
        case '>': return "&gt;";
        case '&': return "&amp;";
      }
  });
}

TransOver.regexp_escape = function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
