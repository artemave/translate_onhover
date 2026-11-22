class PopupTransover extends HTMLElement {
  static get observedAttributes() {
    return ['top', 'left', 'options']
  }

  constructor() {
    super()
    const t = document.querySelector('#transover-popup-template').content.cloneNode(true)
    this.attachShadow({mode: 'open'}).appendChild(t)
  }

  attributeChangedCallback(attribute, oldVal, newVal) {
    const main = this.shadowRoot.querySelector('main')

    if (attribute == 'options') {
      const {fontSize} = JSON.parse(newVal)
      main.style['font-size'] = fontSize + 'px'
    } else if (attribute == 'top') {
      main.style.top = newVal + 'px'
    } else {
      main.style.left = newVal + 'px'
    }
  }
}

window.customElements.define('transover-popup', PopupTransover)
