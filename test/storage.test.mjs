import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createLocalStorage } from '../lib/storage.js'
import { createFakeStorage } from '../test-support/fakeChrome.mjs'

describe('localStorage', () => {
  it('reads back what was written', async () => {
    const localStorage = createLocalStorage(createFakeStorage())
    await localStorage.set('urls', ['a', 'b'])

    assert.deepStrictEqual(await localStorage.get('urls'), ['a', 'b'])
  })

  it('reads a missing key as undefined', async () => {
    const localStorage = createLocalStorage(createFakeStorage())

    assert.strictEqual(await localStorage.get('missing'), undefined)
  })

  it('parses JSON strings left by the old localStorage API', async () => {
    const localStorage = createLocalStorage(createFakeStorage({ except_urls: '["a"]', delay: '700' }))

    assert.deepStrictEqual(await localStorage.get('except_urls'), ['a'])
    assert.strictEqual(await localStorage.get('delay'), 700)
  })

  it('returns strings that are not JSON as they are', async () => {
    const localStorage = createLocalStorage(createFakeStorage({ target_lang: 'fr' }))

    assert.strictEqual(await localStorage.get('target_lang'), 'fr')
  })

  it('rejects when reading fails', async () => {
    const chrome = createFakeStorage()
    chrome.fail('broken')

    await assert.rejects(createLocalStorage(chrome).get('key'), { message: 'broken' })
  })

  it('rejects when writing fails', async () => {
    const chrome = createFakeStorage()
    chrome.fail('QUOTA_BYTES quota exceeded')

    await assert.rejects(createLocalStorage(chrome).set('key', 'value'), { message: 'QUOTA_BYTES quota exceeded' })
    assert.deepStrictEqual(chrome.items, {})
  })
})
