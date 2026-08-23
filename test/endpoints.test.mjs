import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateUrls, parseResponse } from '../lib/apiClient.mjs'

describe('parsing google responses', () => {
  it('parses full translation response', async () => {
    await assertParsesFullTranslationResponse()
  })

  it('joins article and word', async function() {
    await assertJoinsArticleAndWord()
  })

  it('parses sentences', async function() {
    await assertParsesSentences()
  })
})

async function assertParsesSentences() {
  const data = await fetchFromFirstOkResponse('gifts are yellow', { sl: 'en', tl: 'fr' })
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

async function assertJoinsArticleAndWord() {
  const data = await fetchFromFirstOkResponse('gift', { sl: 'en', tl: 'fr' })
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

async function assertParsesFullTranslationResponse() {
  const data = await fetchFromFirstOkResponse('cadeau', { sl: 'fr', tl: 'en' })
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

async function fetchFromFirstOkResponse(word, { sl, tl }) {
  const urls = generateUrls(word, { sl, tl })
  const failureDetails = []

  for (const url of urls) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        return await response.json()
      }

      failureDetails.push(`${url} (${response.status} ${response.statusText})`)
    } catch (error) {
      failureDetails.push(`${url} (${error.message})`)
    }
  }

  assert.fail(`All translation endpoints failed: ${failureDetails.join(', ')}`)
}
