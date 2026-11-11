import { createServer } from 'node:https'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(__dirname, '../fixtures')

const [cert, key] = await Promise.all([
  readFile(path.join(__dirname, 'localhost-cert.pem')),
  readFile(path.join(__dirname, 'localhost-key.pem')),
])

// A tiny static file server for the e2e fixture pages. Content scripts only
// run against real navigations matching manifest_v3.json's <all_urls>, so
// page.setContent()/about:blank isn't reliable here - we need real
// origins, including distinct origins (different ports) for the
// except_urls/only_urls tests.
//
// This has to be https: manifest_v3.json's web_accessible_resources (which
// popup.js/tat_popup.js need in order to load into the page) only matches
// `https://*/*` and `file://*/*`, not plain http. The cert is a throwaway
// self-signed localhost one checked in alongside this file; the extension
// launcher (support/extension.mjs) tells the browser to trust it.
export async function startFixtureServer() {
  const server = createServer({ cert, key }, async (req, res) => {
    const filePath = path.join(fixturesDir, req.url === '/' ? '/index.html' : req.url)

    if (!filePath.startsWith(fixturesDir)) {
      res.writeHead(403)
      res.end()
      return
    }

    const body = await readFile(filePath)
      const headers = { 'Content-Type': 'text/html; charset=utf-8' }
      // Pages like Gmail refuse plain strings for DOM sinks such as innerHTML
      // and script.src. Fixtures with this name stand in for them.
      if (path.basename(filePath).startsWith('trusted-types')) {
        headers['Content-Security-Policy'] = "require-trusted-types-for 'script'"
      }
      res.writeHead(200, headers)
      res.end(body)
    } catch {
      res.writeHead(404)
      res.end()
    }
  })

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()

  return {
    baseUrl: `https://127.0.0.1:${port}`,
    close: () => new Promise(resolve => server.close(resolve))
  }
}
