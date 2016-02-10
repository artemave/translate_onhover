(function() {
  var owner = document.currentScript.ownerDocument;

  var PopupProto = Object.create(HTMLElement.prototype);

  PopupProto.q = function(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  PopupProto.createdCallback = function() {
    var t = owner.querySelector('#transover-tat-popup-template').content.cloneNode(true);
    this.createShadowRoot().appendChild(t);

    var sendTranslate = function() {
      window.postMessage({
        type: 'transoverTranslate',
        text: this.q('#tat_input').value,
        tl: this.q('#tat_to_lang').value,
        sl: this.q('#tat_from_lang').value
      }, '*');
    }.bind(this);

    this.q('#swap_languages').onclick = function() {
      if (this.q('#swap_languages').classList.contains('disabled'))
        return;

      var to_select = this.q('#tat_to_lang');
      var from_select = this.q('#tat_from_lang');
      var to_value = to_select.value;

      to_select.value = from_select.value;
      from_select.value = to_value;
    }.bind(this)

    this.q('#tat_from_lang').onchange = function() {
      if (this.q('#tat_from_lang').value == 'auto') {
        this.q('#swap_languages').classList.add('disabled');
      } else {
        this.q('#swap_languages').classList.remove('disabled');
      }
    }.bind(this)

    this.q('main').onkeydown = function(e) {
      if (e.keyCode == 13) {
        sendTranslate();
      }
      // let 'escape' be handled in the host context (by content script)
      if (e.keyCode == 27) {
        return;
      }
      e.stopPropagation();
    }

    this.q('#tat_submit').onclick = sendTranslate;
  };

  PopupProto.attachedCallback = function() {
    this.q('#tat_input').focus();
  }

  PopupProto.attributeChangedCallback = function(attribute, oldVal, newVal) {
    if (attribute == "data-languages") {
      var from_select = this.q('#tat_from_lang');
      var to_select = this.q('#tat_to_lang');
      var languages = JSON.parse(newVal);
      var select_auto = true;

      for (var key in languages) {
        var from_option = new Option(languages[key].label, key);
        var to_option = new Option(languages[key].label, key);

        if (languages[key].selected_sl) {
          select_auto = false;
          from_option.setAttribute('selected', true);
        }
        if (languages[key].selected_tl) {
          to_option.setAttribute('selected', true);
        }

        from_select.appendChild(from_option);
        to_select.appendChild(to_option);
      }

      var separator = document.createElement('optgroup');
      separator.label = '----------';
      var auto_option = new Option('Autodetect', 'auto');
      from_select.insertBefore(separator, from_select.firstChild);

      var auto_option = new Option('Autodetect', 'auto');
      from_select.insertBefore(auto_option, from_select.firstChild);
      if (select_auto) {
        auto_option.setAttribute('selected', true);
        this.q('#swap_languages').classList.add('disabled');
      }
    }
  };

  document.registerElement('transover-type-and-translate-popup', { prototype: PopupProto });
})();
