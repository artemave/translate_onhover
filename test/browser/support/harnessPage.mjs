import { chromium } from 'playwright'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const harnessDir = path.join(root, '.browser-harness')
const fixturesDir = path.join(root, 'test/browser/fixtures')
export const coverageDir = path.join(root, '.coverage-browser')

export const origin = 'https://transover.test'

// A silent 50ms WAV, so speak()'s Audio really loads and plays to the end.
function silentWav() {
  const rate = 8000
  const samples = rate / 20
  const wav = Buffer.alloc(44 + samples)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + samples, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(rate, 24)
  wav.writeUInt32LE(rate, 28)
  wav.writeUInt16LE(1, 32)
  wav.writeUInt16LE(8, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(samples, 40)
  wav.fill(128, 44)
  return wav
}

export async function launchBrowser() {
  return chromium.launch({ headless: true })
}

// The real options.html, with its script swapped for the harness.
async function optionsPage() {
  const html = await readFile(path.join(root, 'options.html'), 'utf8')
  return html.replace('src="options_script.js"', 'src="/optionsHarness.js"')
}

// Every fixture page gets the content script harness, as every page gets the
// content script.
async function fixturePage(pathname) {
  const fixture = await readFile(path.join(fixturesDir, pathname), 'utf8')
  return fixture.replace('</body>', '<script src="/contentHarness.js"></script></body>')
}

async function serve(route) {
  const url = new URL(route.request().url())

  if (url.hostname === 'translate.google.com') {
    return route.fulfill({ contentType: 'audio/wav', body: silentWav() })
  }
  if (url.pathname.endsWith('.js')) {
    return route.fulfill({ contentType: 'text/javascript', body: await readFile(path.join(harnessDir, url.pathname)) })
  }
  if (url.pathname === '/__done') {
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>done</title>' })
  }
  if (url.pathname === '/options.html') {
    return route.fulfill({ contentType: 'text/html', body: await optionsPage() })
  }
  return route.fulfill({ contentType: 'text/html', body: await fixturePage(url.pathname) })
}

const openPages = new Set()

// For afterEach: closes every harness page the test opened.
export async function closeOpenPages() {
  const results = await Promise.allSettled([...openPages].map(harnessPage => harnessPage.close()))
  const failure = results.find(result => result.status === 'rejected')
  if (failure) throw failure.reason
}

// A fresh browser context whose pages see `config` as
// window.transoverHarnessConfig. close() saves the coverage of every page
// this one showed (with COVERAGE=true), then fails on any uncaught error the
// page threw.
export async function openHarnessPage(browser, config, { viewport = { width: 1000, height: 700 } } = {}) {
  const context = await browser.newContext({ viewport })
  await context.route(`${origin}/**`, serve)
  await context.route('https://translate.google.com/**', serve)
  await context.addInitScript(config => { window.transoverHarnessConfig = config }, config)

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error))

  const harnessPage = {
    page,
    context,
    errors,
    async close() {
      openPages.delete(harnessPage)
      await page.goto(`${origin}/__done`)
      if (process.env.COVERAGE === 'true') {
        const coverage = await page.evaluate(() => JSON.parse(sessionStorage.getItem('transoverCoverage') || '[]'))
        await mkdir(coverageDir, { recursive: true })
        await writeFile(path.join(coverageDir, `${randomUUID()}.json`), JSON.stringify(coverage))
      }
      await context.close()
      assert.deepStrictEqual(errors.map(e => e.message), [])
    },
  }
  openPages.add(harnessPage)
  return harnessPage
}
