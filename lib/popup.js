(function() {
  var owner = document.currentScript.ownerDocument;

  var PopupProto = Object.create(HTMLElement.prototype);

  PopupProto.createdCallback = function() {
    var t = owner.querySelector('#transover-popup-template').content.cloneNode(true);
    this.createShadowRoot().appendChild(t);
  };

  PopupProto.attributeChangedCallback = function(attribute, oldVal, newVal) {
    var main = this.shadowRoot.querySelector('main');

    if (attribute == "content") {
      main.innerHTML = newVal;

      setTimeout(function() {
          var main = this.shadowRoot.querySelector('main');
          var style = window.getComputedStyle(main);

          this.setAttribute('content-width', parseFloat(style.width));
          this.setAttribute('content-height', parseFloat(style.height));

          this.setAttribute('outer-width', main.offsetWidth);
          this.setAttribute('outer-height', main.offsetHeight);

          var e = new CustomEvent("transover-popup_content_updated");
          this.dispatchEvent(e);
      }.bind(this), 0);

    } else if (attribute == "top") {
      main.style.top = newVal + 'px';
    } else if (attribute == "left") {
      main.style.left = newVal + 'px';
    } else if (attribute == "width") {
      main.style.width = newVal + 'px';
    } else if (attribute == "height") {
      main.style.height = newVal + 'px';
    }
  };

  document.registerElement('transover-popup', { prototype: PopupProto });
})();