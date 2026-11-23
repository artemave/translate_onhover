import puppeteer from 'puppeteer'
import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { capturedTranslateResponse } from '../../e2e/support/googleStub.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../../../dist')
const e2eSupportDir = path.resolve(__dirname, '../../e2e/support')

// Must match the GECKO_ID test:e2e:mv2 builds with - Firefox only honours a
// preset moz-extension UUID for a known add-on id.
const addonId = 'transover-e2e@test'
const extensionUuid = '7a2b5c1e-4f3d-4e8a-9b6c-0d1e2f3a4b5c'

const stubbedHosts = ['clients5.google.com', 'translate.googleapis.com', 'www.google-analytics.com']

// BiDi network interception doesn't see requests made by an extension's
// background page, so Google is stubbed one level down instead: Firefox
// sends all https traffic through this CONNECT proxy, which terminates TLS
// for Google's hosts with the fixture server's self-signed cert (accepted
// via acceptInsecureCerts) and drops everything else.
async function startGoogleStub() {
  const [cert, key] = await Promise.all([
    readFile(path.join(e2eSupportDir, 'localhost-cert.pem')),
    readFile(path.join(e2eSupportDir, 'localhost-key.pem')),
  ])
  const analyticsRequests = []

  const google = createHttpsServer({ cert, key }, async (req, res) => {
    const url = `https://${req.headers.host}${req.url}`

    if (req.headers.host === 'www.google-analytics.com') {
      let body = ''
      for await (const chunk of req) body += chunk
      analyticsRequests.push(JSON.parse(body))
      res.end()
      return
    }

    res.setHeader('Content-Type', 'application/json')
    res.end(await capturedTranslateResponse(url))
  })

  const proxy = createHttpServer().on('connect', (req, socket) => {
    const [host] = req.url.split(':')
    if (!stubbedHosts.includes(host)) {
      socket.destroy()
      return
    }
    socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
    google.emit('connection', socket)
  })

  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve))

  return {
    port: proxy.address().port,
    analyticsRequests,
    close: () => new Promise(resolve => proxy.close(resolve))
  }
}

export async function launchFirefoxExtension() {
  const googleStub = await startGoogleStub()

  const browser = await puppeteer.launch({
    browser: 'firefox',
    headless: true,
    acceptInsecureCerts: true,
    // Without it BiDi refuses to touch moz-extension:// pages at all.
    env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
    extraPrefsFirefox: {
      'network.proxy.type': 1,
      'network.proxy.ssl': '127.0.0.1',
      'network.proxy.ssl_port': googleStub.port,
      'extensions.webextensions.uuids': JSON.stringify({ [addonId]: extensionUuid }),
    },
  })
  await browser.installExtension(distPath)

  return {
    browser,
    extensionUuid,
    analyticsRequests: googleStub.analyticsRequests,
    async openOptions() {
      const page = await browser.newPage()
      // Puppeteer's goto() never sees a moz-extension:// page finish loading,
      // so navigate without waiting and wait on the page's own ready marker.
      await browser.connection.send('browsingContext.navigate', {
        context: page.mainFrame()._id,
        url: `moz-extension://${extensionUuid}/options.html`,
        wait: 'none',
      })
      await page.waitForFunction(() => document.documentElement.dataset.transoverOptionsPageReady === 'true')
      return page
    },
    async close() {
      await browser.close()
      await googleStub.close()
    }
  }
}

export async function gotoFixture(page, url) {
  await page.goto(url)
  await page.waitForFunction(() => document.documentElement.dataset.transoverOptionsLoaded === 'true')
}

export async function waitForPopupText(page) {
  const handle = await page.waitForFunction(() => {
    const popups = document.querySelectorAll('transover-popup')
    const main = popups[popups.length - 1]?.shadowRoot?.querySelector('main')
    return main?.innerText.trim()
  })
  return handle.jsonValue()
}
