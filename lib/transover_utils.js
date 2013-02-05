TransOver = {};

TransOver.deserialize = function(text) {
  var res;

  try {
    res = JSON.parse(text);
  }
  catch (e) {
    // that means text is string as opposed to serialized object
    if (e.toString() == 'SyntaxError: Unexpected token ILLEGAL') {
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
    _.each(translation, function(pos_block) {
        var formatted_pos = pos_block.pos ? '<strong>'+pos_block.pos+'</strong>: ' : '';
        var formatted_meanings = pos_block.meanings.slice(0,5).join(', ') + ( pos_block.meanings.length > 5 ? '...' : '' );
        formatted_translation = formatted_translation + '<div class="pos_translation">' + formatted_pos + formatted_meanings + '</div>';
    });
  }
  else {
    formatted_translation = '<div class="pos_translation">' + translation + '</div>';
  }

  return formatted_translation;
}
