import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { launchExtension } from './support/extension.mjs'

describe('storage quota errors', () => {
  let extension, page

  before(async () => {
    extension = await launchExtension()
    page = await extension.context.newPage()
    await page.goto(extension.optionsUrl)
  })

  after(async () => {
    await page.close()
    await extension.close()
  })

  it('a chrome.storage.local write past quota surfaces an error instead of hanging', async () => {
    const hugeUrl = 'x'.repeat(20 * 1024 * 1024) // past chrome.storage.local's ~10MB default quota

    const response = await page.evaluate(url => chrome.runtime.sendMessage({
      handler: 'toggle_disable_on_this_page',
      disable_on_this_page: true,
      current_url: url
    }), hugeUrl)

    assert.strictEqual(response.error, true)
    assert.match(response.message, /quota/i)
  })
})
