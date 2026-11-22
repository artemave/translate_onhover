import { describe, it } from 'node:test'
import assert from 'node:assert'
import { languages } from '../lib/languages.js'

// ICU doesn't know 'ber' (Google's code for Tamazight in Tifinagh script).
const scriptDirectionOverrides = { ber: 'ltr' }

describe('languages', () => {
  it('gives each language the direction of its script', () => {
    const wrong = Object.entries(languages)
      .filter(([code, { direction }]) => direction !== (scriptDirectionOverrides[code] || new Intl.Locale(code).maximize().getTextInfo().direction))
      .map(([code]) => code)

    assert.deepStrictEqual(wrong, [])
  })

  it('has no two languages with the same label', () => {
    const labels = Object.values(languages).map(({ label }) => label)

    assert.deepStrictEqual(labels.filter((label, i) => labels.indexOf(label) !== i), [])
  })
})
