import { describe, it } from 'node:test'
import assert from 'node:assert'
import { languages } from '../lib/languages.js'

// ICU doesn't know 'ber' (Google's code for Tamazight in Tifinagh script).
const scriptDirectionOverrides = { ber: 'ltr' }

// Node 22 only has the textInfo getter, Node 26 only getTextInfo().
const scriptDirection = code => {
  const locale = new Intl.Locale(code).maximize()
  return (locale.textInfo ?? locale.getTextInfo()).direction
}

describe('languages', () => {
  it('gives each language the direction of its script', () => {
    const wrong = Object.entries(languages)
      .filter(([code, { direction }]) => direction !== (scriptDirectionOverrides[code] || scriptDirection(code)))
      .map(([code]) => code)

    assert.deepStrictEqual(wrong, [])
  })

  it('has no two languages with the same label', () => {
    const labels = Object.values(languages).map(({ label }) => label)

    assert.deepStrictEqual(labels.filter((label, i) => labels.indexOf(label) !== i), [])
  })
})
