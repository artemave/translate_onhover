import { describe, it } from 'node:test'
import assert from 'node:assert'
import { escape_html, renderError, formatTranslation } from '../lib/transover_utils.js'

describe('escape_html', () => {
  it('escapes <, > and &', () => {
    assert.strictEqual(
      escape_html('<b>Tom & Jerry</b>'),
      '&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;'
    )
  })

  it('leaves text without special characters untouched', () => {
    assert.strictEqual(escape_html('cadeau'), 'cadeau')
  })
})

// Popup content is a list of nodes: a string, or {tag, cls, children}.
const textOf = node => typeof node === 'string' ? node : node.children.map(textOf).join('')
const allText = nodes => nodes.map(textOf).join('')

describe('renderError', () => {
  it('embeds the message into the error markup', () => {
    assert.deepStrictEqual(renderError('Something broke'), [
      {
        tag: 'div',
        cls: 'pos_translation',
        children: [
          { tag: 'strong', cls: 'red', children: ['Error!'] },
          ' Something broke'
        ]
      }
    ])
  })

  it('keeps markup in the message as text', () => {
    assert.match(allText(renderError('<b>boom</b>')), /<b>boom<\/b>/)
  })
})

describe('formatTranslation', () => {
  const options = { show_from_lang: true }

  it('renders a single translated string as text, not markup', () => {
    const blocks = formatTranslation('<script>evil</script>', { sl: 'fr', tl: 'en' }, options)
    assert.deepStrictEqual(blocks[0], {
      tag: 'div',
      cls: 'pos_translation',
      children: ['<script>evil</script>']
    })
  })

  it('renders pos/meanings blocks for dictionary translations', () => {
    const translation = [
      { pos: 'noun', meanings: ['le cadeau', 'le don'] }
    ]
    const blocks = formatTranslation(translation, { sl: 'en', tl: 'fr' }, options)
    assert.deepStrictEqual(blocks[0], {
      tag: 'div',
      cls: 'pos_translation',
      children: [
        { tag: 'strong', cls: '', children: ['noun'] },
        ': ',
        'le cadeau, le don'
      ]
    })
  })

  it('truncates meanings to 5 and appends an ellipsis', () => {
    const translation = [
      { pos: 'noun', meanings: ['one', 'two', 'three', 'four', 'five', 'six'] }
    ]
    const text = allText(formatTranslation(translation, { sl: 'en', tl: 'fr' }, options))
    assert.match(text, /one, two, three, four, five\.\.\./)
    assert.doesNotMatch(text, /six/)
  })

  it('does not add an ellipsis when there are 5 or fewer meanings', () => {
    const translation = [
      { pos: 'noun', meanings: ['one', 'two'] }
    ]
    const text = allText(formatTranslation(translation, { sl: 'en', tl: 'fr' }, options))
    assert.doesNotMatch(text, /\.\.\./)
  })

  it('omits the pos label when a block has none', () => {
    const translation = [{ pos: undefined, meanings: ['foo'] }]
    const blocks = formatTranslation(translation, { sl: 'en', tl: 'fr' }, { show_from_lang: false })
    assert.deepStrictEqual(blocks, [
      { tag: 'div', cls: 'pos_translation', children: ['foo'] }
    ])
  })

  it('adds the rtl class when translating into an rtl language', () => {
    const blocks = formatTranslation('hello', { sl: 'en', tl: 'ar' }, options)
    assert.strictEqual(blocks[0].cls, 'pos_translation rtl')
  })

  it('does not add the rtl class when translating into an ltr language', () => {
    const blocks = formatTranslation('bonjour', { sl: 'en', tl: 'fr' }, options)
    assert.doesNotMatch(JSON.stringify(blocks), /rtl/)
  })

  it('appends the source language when show_from_lang is true', () => {
    const blocks = formatTranslation('bonjour', { sl: 'fr', tl: 'en' }, { show_from_lang: true })
    assert.strictEqual(blocks.length, 2)
    assert.strictEqual(blocks[1].cls, 'from_lang')
    assert.match(textOf(blocks[1]), /translated from:\s*French/)
  })

  it('omits the source language block when show_from_lang is false', () => {
    const blocks = formatTranslation('bonjour', { sl: 'fr', tl: 'en' }, { show_from_lang: false })
    assert.doesNotMatch(allText(blocks), /translated from/)
  })

  it('omits the source language block when sl is not a known language code', () => {
    const blocks = formatTranslation('bonjour', { sl: 'auto', tl: 'en' }, { show_from_lang: true })
    assert.doesNotMatch(allText(blocks), /translated from/)
  })
})
