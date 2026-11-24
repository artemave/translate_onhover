import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createServer } from 'node:http'
import { createTracker } from '../lib/tracking.js'

describe('trackEvent', () => {
  it('posts the event with the client id', async () => {
    const received = []
    const server = createServer(async (req, res) => {
      let body = ''
      for await (const chunk of req) body += chunk
      received.push({ method: req.method, url: req.url, body: JSON.parse(body) })
      res.end()
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))

    const trackEvent = createTracker({ url: `http://127.0.0.1:${server.address().port}/mp/collect?measurement_id=G-1`, clientId: 'client-1' })
    await trackEvent({ name: 'translate', params: { action: 'click' } })
    server.close()

    assert.deepStrictEqual(received, [{
      method: 'POST',
      url: '/mp/collect?measurement_id=G-1',
      body: { client_id: 'client-1', events: [{ name: 'translate', params: { action: 'click' } }] },
    }])
  })
})
