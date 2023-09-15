import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateUrls, parseResponse } from '../lib/apiClient.mjs'

describe('parsing google responses', () => {
  describe('url 0', function() {
    it('parses full translation response', async () => {
      await assertParsesFullTranslationResponse(0)
    })

    it('joins article and word', async function() {
      await assertJoinsArticleAndWord(0)
    })

    it('parses sentences', async function() {
      await assertParsesSentences(0)
    })
  })

  describe('url 1', function() {
    it('parses full translation response', async () => {
      await assertParsesFullTranslationResponse(1)
    })

    it('joins article and word', async function() {
      await assertJoinsArticleAndWord(1)
    })

    it('parses sentences', async function() {
      await assertParsesSentences(1)
    })
  })
})

async function assertParsesSentences(index) {
  const urls = generateUrls('gifts are yellow', { sl: 'en', tl: 'fr' })

  const response = await fetch(urls[index])

  assert(response.ok)

  const data = await response.json()
  const translation = parseResponse(data, 'gift')
  const expected = {
    'succeeded': true,
    'sl': 'en',
    'parsed': 'les cadeaux sont jaunes'
  }
  assert.deepStrictEqual(
    // One of the APIs starts the sentence with a capital letter, but the other one doesn't...
    JSON.parse(JSON.stringify(translation).toLowerCase()),
    expected
  )
}

async function assertJoinsArticleAndWord(index) {
  const urls = generateUrls('gift', { sl: 'en', tl: 'fr' })

  const response = await fetch(urls[index])

  assert(response.ok)

  const data = await response.json()
  const translation = parseResponse(data, 'gift')
  const expected = {
    'succeeded': true,
    'sl': 'en',
    'parsed': [
      {
        'pos': 'noun',
        'meanings': [
          'le cadeau',
          'le don',
          'la donation',
          'le présent',
          'le talent',
          'la prime'
        ]
      }
    ]
  }
  assert.deepStrictEqual(translation, expected)
}

async function assertParsesFullTranslationResponse(index) {
  const urls = generateUrls('cadeau', { sl: 'fr', tl: 'en' })

  const response = await fetch(urls[index])

  assert(response.ok)

  const data = await response.json()
  const translation = parseResponse(data, 'cadeau')
  const expected = {
    'succeeded': true,
    'sl': 'fr',
    'parsed': [
      {
        'pos': 'noun',
        'meanings': [
          'gift',
          'present',
          'treat',
          'prezzie'
        ]
      }
    ]
  }
  assert.deepStrictEqual(translation, expected)
}

