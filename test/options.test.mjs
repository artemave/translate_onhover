import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createOptions } from '../lib/options.js'
import { createLocalStorage } from '../lib/storage.js'
import { createFakeStorage } from '../test-support/fakeChrome.mjs'

function optionsWith(items = {}) {
  const chrome = createFakeStorage(items)
  return { options: createOptions(createLocalStorage(chrome)), items: chrome.items }
}

describe('options', () => {
  describe('defaults', () => {
    const defaults = {
      except_urls: [],
      only_urls: [],
      target_lang: undefined,
      from_lang: 'auto',
      reverse_lang: undefined,
      word_key_only: NaN,
      selection_key_only: NaN,
      tts: NaN,
      tts_key: 'Shift',
      translate_by: 'click',
      delay: 700,
      do_not_show_oops: NaN,
      popup_show_trigger: 'Alt',
      show_from_lang: true,
      fontSize: 14,
      theme: 'light',
      disable_everywhere: 0,
    }

    it('covers every option', () => {
      assert.deepStrictEqual(Object.keys(optionsWith().options).sort(), Object.keys(defaults).sort())
    })

    for (const [name, value] of Object.entries(defaults)) {
      it(name, async () => {
        assert.deepStrictEqual(await optionsWith().options[name](), value)
      })
    }
  })

  describe('saved values', () => {
    for (const [name, value, expected = value] of [
      ['except_urls', ['a.com']],
      ['only_urls', ['b.com']],
      ['target_lang', 'fr'],
      ['from_lang', 'de'],
      ['reverse_lang', 'es'],
      ['word_key_only', 1],
      ['selection_key_only', 1],
      ['tts', 1],
      ['tts_key', 'Control'],
      ['translate_by', 'point'],
      ['delay', 300],
      ['do_not_show_oops', 1],
      ['popup_show_trigger', 'Meta'],
      ['show_from_lang', 0, false],
      ['fontSize', 20],
      ['theme', 'dark'],
      ['disable_everywhere', 1],
    ]) {
      it(name, async () => {
        const { options } = optionsWith()
        await options[name](value)

        assert.deepStrictEqual(await options[name](), expected)
      })
    }
  })

  it('reverse_lang can be cleared', async () => {
    const { options } = optionsWith({ reverse_lang: 'es' })
    await options.reverse_lang('')

    assert.strictEqual(await options.reverse_lang(), '')
  })

  it('show_from_lang reads a saved 1 as true', async () => {
    assert.strictEqual(await optionsWith({ show_from_lang: '1' }).options.show_from_lang(), true)
  })

  describe('invalid values are not saved', () => {
    for (const [name, value] of [
      ['except_urls', 'a.com'],
      ['only_urls', 'b.com'],
      ['target_lang', ''],
      ['from_lang', ''],
      ['translate_by', 'hover'],
      ['delay', 'soon'],
      ['delay', Infinity],
    ]) {
      it(`${name}(${JSON.stringify(value)})`, async () => {
        const { options, items } = optionsWith()
        await options[name](value)

        assert.deepStrictEqual(items, {})
      })
    }
  })
})
