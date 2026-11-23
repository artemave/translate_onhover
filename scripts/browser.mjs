// Opens Chromium (default) or Firefox with the extension loaded, rebuilding on
// every source change and reloading the extension after each rebuild.
// Usage: node scripts/browser.mjs [chrome|firefox] [url...] (example.com by default)
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [browser = 'chrome', ...args] = process.argv.slice(2)
const urls = args.length ? args : ['https://example.com']

if (!['chrome', 'firefox'].includes(browser)) {
  throw new Error(`Unknown browser "${browser}" - expected chrome or firefox`)
}

const buildPath = path.join(root, '.dev-build', browser)
const profilePath = path.join(root, '.browser-profile', browser)

// Firefox gets the MV2 build (that's what's published to AMO); Chrome MV3.
process.env.MANIFEST_V3 = String(browser === 'chrome')
process.env.DEV_OPTIONS = JSON.stringify({ target_lang: 'fr' })
// Firefox keys extension storage by add-on id, and web-ext would otherwise
// install a temporary add-on with a fresh random id on every run.
process.env.GECKO_ID = 'transover-dev@localhost'
const require = createRequire(import.meta.url)
const webpack = require('webpack')
const config = require(path.join(root, 'webpack.config.js'))
config.output.path = buildPath

let onRebuild
// The config's '*.png' copy pattern makes webpack watch the whole repo root.
const ignored = ['**/.browser-profile/**', '**/.dev-build/**', '**/dist/**', '**/node_modules/**']
const watching = webpack(config).watch({ ignored }, (err, stats) => {
  if (err) throw err
  console.log(stats.toString({ preset: 'minimal', colors: true }))
  if (!stats.hasErrors()) onRebuild()
})
await new Promise(resolve => { onRebuild = resolve })

if (browser === 'chrome') {
  // Not --load-extension: Chromium disables an extension loaded that way as
  // soon as it's reloaded. CDP's Extensions.loadUnpacked can be called again
  // to reload, but only from a browser-level CDP session, which a persistent
  // context doesn't expose - hence the extra debugging port to connect to.
  const context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chromium',
    headless: false,
    viewport: null,
    // Playwright's own handlers kill the browser, which leaves the profile
    // marked as crashed; Ctrl-C closes it properly below instead.
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--enable-unsafe-extension-debugging',
      '--remote-debugging-port=0',
      '--ozone-platform-hint=auto',
      '--hide-crash-restore-bubble',
    ],
  })
  context.on('close', () => watching.close(() => {}))
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => context.close())
  }

  const [port] = (await readFile(path.join(profilePath, 'DevToolsActivePort'), 'utf8')).split('\n')
  const cdp = await (await chromium.connectOverCDP(`http://127.0.0.1:${port}`)).newBrowserCDPSession()

  onRebuild = async () => {
    await cdp.send('Extensions.loadUnpacked', { path: buildPath })
    console.log('Extension (re)loaded - reload open tabs to pick up content script changes.')
  }
  await onRebuild()

  const [page] = context.pages()
  for (const [i, url] of urls.entries()) {
    await (i === 0 ? page : await context.newPage()).goto(url, { waitUntil: 'commit' })
  }
} else {
  // web-ext watches the build directory and reloads the extension itself.
  onRebuild = () => {}
  const webExt = spawn('npx', [
    'web-ext', 'run',
    '--source-dir', buildPath,
    '--firefox-profile', profilePath,
    '--profile-create-if-missing',
    '--keep-profile-changes',
    ...urls.flatMap(url => ['--start-url', url]),
  ], { stdio: 'inherit', cwd: root })
  webExt.on('exit', () => watching.close(() => {}))
  // Ctrl-C reaches web-ext too (same process group); it shuts Firefox down
  // and exits, which ends this process via the handler above.
  process.on('SIGINT', () => {})
}
