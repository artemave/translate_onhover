class TatPopupTransover extends HTMLElement {
  static get observedAttributes() {
    return ['data-languages', 'data-disable_on_this_page', 'data-disable_everywhere']
  }

  constructor() {
    super()
    const t = document.querySelector('#transover-tat-popup-template').content.cloneNode(true)
    this.attachShadow({mode: 'open'}).appendChild(t)

    const sendTranslate = () => {
      const text = this.q('#tat_input').value

      window.postMessage({
        type: 'transoverTrackEvent',
        event: {
          name: 'translate',
          params: {
            action: 'popup',
            characters: text.length
          }
        }
      }, '*')

      window.postMessage({
        type: 'transoverTranslate',
        text,
        tl: this.q('#tat_to_lang').value,
        sl: this.q('#tat_from_lang').value
      }, '*')
    }

    this.q('#swap_languages').onclick = () => {
      if (this.q('#swap_languages').classList.contains('disabled'))
        return

      const to_select = this.q('#tat_to_lang')
      const from_select = this.q('#tat_from_lang')
      const to_value = to_select.value

      to_select.value = from_select.value
      from_select.value = to_value
    }

    this.q('#tat_from_lang').onchange = () => {
      if (this.q('#tat_from_lang').value == 'auto') {
        this.q('#swap_languages').classList.add('disabled')
      } else {
        this.q('#swap_languages').classList.remove('disabled')
      }
    }

    this.q('#tat_history_export').onclick = (e) => {
      window.postMessage({type: 'exportTranslationHistory'}, '*')
      e.preventDefault()
    }

    this.q('main').onkeydown = (e) => {
      if (e.key == 'Enter') {
        sendTranslate()
      }
      // let 'escape' be handled in the host context (by content script)
      if (e.key == 'Escape') {
        return
      }
      e.stopPropagation()
    }

    this.q('#disable_on_this_page').onchange = (e) => {
      window.postMessage({
        type: 'toggle_disable_on_this_page',
        disable_on_this_page: e.target.checked
      }, '*')
    }

    this.q('#disable_everywhere').onchange = (e) => {
      window.postMessage({
        type: 'toggle_disable_everywhere',
        disable_everywhere: e.target.checked
      }, '*')
    }

    this.q('#tat_close').onclick = (e) => {
      window.postMessage({type: 'tat_close'})
      e.preventDefault()
    }

    this.q('#tat_submit').onclick = sendTranslate
  }

  connectedCallback() {
    this.q('#tat_input').focus()
  }

  attributeChangedCallback(attribute, oldVal, newVal) {
    if (attribute == 'data-languages') {
      const from_select = this.q('#tat_from_lang')
      const to_select = this.q('#tat_to_lang')
      const languages = JSON.parse(newVal)
      let select_auto = true

      for (const key in languages) {
        const from_option = new Option(languages[key].label, key)
        const to_option = new Option(languages[key].label, key)

        if (languages[key].selected_sl) {
          select_auto = false
          from_option.setAttribute('selected', true)
        }
        if (languages[key].selected_tl) {
          to_option.setAttribute('selected', true)
        }

        from_select.appendChild(from_option)
        to_select.appendChild(to_option)
      }

      const separator = document.createElement('optgroup')
      separator.label = '----------'
      from_select.insertBefore(separator, from_select.firstChild)

      const auto_option = new Option('Autodetect', 'auto')
      from_select.insertBefore(auto_option, from_select.firstChild)

      if (select_auto) {
        auto_option.setAttribute('selected', true)
        this.q('#swap_languages').classList.add('disabled')
      }
    } else if (attribute === 'data-disable_on_this_page') {
      this.q('#disable_on_this_page').checked = JSON.parse(newVal)
    } else if (attribute === 'data-disable_everywhere') {
      this.q('#disable_everywhere').checked = JSON.parse(newVal)
    }
  }

  q(selector) {
    return this.shadowRoot.querySelector(selector)
  }
}

window.customElements.define('transover-type-and-translate-popup', TatPopupTransover)
