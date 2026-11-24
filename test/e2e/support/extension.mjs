import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { stubTranslateApi } from './googleStub.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../../../dist')

// channel: 'chromium' opts into Chromium's new headless mode (the full
// browser binary, not the stripped-down "headless shell" that plain
// headless: true gets by default) - only the new mode starts an MV3
// extension's service worker at all.
export async function launchExtension() {
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'transover-e2e-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    ignoreHTTPSErrors: true, // the fixture server uses a throwaway self-signed cert
    args: [
      `--disable-extensions-except=${distPath}`,
      `--load-extension=${distPath}`,
    ],
  })
  // Every e2e test replays a captured Google response rather than calling
  // the real API - see googleStub.mjs. A test after this one that needs a
  // specific real failure mode (429, malformed response, etc.) registers
  // its own context.route() for the same pattern, which takes priority.
  await stubTranslateApi(context)

  const serviceWorker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker')
  const extensionId = serviceWorker.url().split('/')[2]

  return {
    context,
    serviceWorker,
    extensionId,
    optionsUrl: `chrome-extension://${extensionId}/options.html`,
    async close() {
      await context.close()
      await rm(userDataDir, { recursive: true, force: true })
    }
  }
}

// Waits for contentscript.js's own (async) options load to actually finish -
// it only arms its mousestop-scheduling timer once `options` has loaded, so
// a mousemove/click fired earlier can race ahead of it and be silently
// dropped. loadOptions() sets this real completion marker itself (see
// contentscript.js) since the `options` variable it populates lives in the
// content script's isolated world, invisible to a main-world page.evaluate().
export async function waitForOptionsLoaded(page) {
  await page.waitForFunction(() => document.documentElement.dataset.transoverOptionsLoaded === 'true')
}

// Navigates to a fixture page and waits for the content script's options
// load to finish before returning.
export async function gotoFixture(page, url) {
  await page.goto(url)
  await waitForOptionsLoaded(page)
}

// Each of the functions below finds the popup's shadow-root <main> by
// grabbing the *last* 'transover-popup' element, not the first: showPopup()
// in lib/content.js appends the new popup at the end of <body> while the
// previous one is still fading out, so both can briefly coexist in the DOM.

// Removes any leftover translation popup from an earlier action on this
// page: contentscript.js only clears it as a side effect of a real
// mousemove or a new translation, and callers of this generally don't want
// to depend on that mechanism to get to a clean starting point.
export async function removeStalePopup(page) {
  await page.evaluate(() => {
    document.querySelectorAll('transover-popup').forEach(el => el.remove())
  })
}

// Reads the current translation popup's text out of its shadow DOM.
export async function getPopupText(page) {
  return page.evaluate(() => {
    const popups = document.querySelectorAll('transover-popup')
    const popup = popups[popups.length - 1]
    const main = popup && popup.shadowRoot && popup.shadowRoot.querySelector('main')
    return main ? main.innerText.trim() : null
  })
}

// Whether the popup's translation block has the rtl styling class
// (formatTranslation adds it when translating into an rtl language).
export async function popupHasRtlClass(page) {
  return page.evaluate(() => {
    const popups = document.querySelectorAll('transover-popup')
    const popup = popups[popups.length - 1]
    const main = popup && popup.shadowRoot && popup.shadowRoot.querySelector('main')
    const div = main && main.querySelector('.pos_translation')
    return !!(div && div.classList.contains('rtl'))
  })
}

// Waits for a (non-empty) translation popup to appear and returns its text.
export async function waitForPopupText(page, { timeout = 15000 } = {}) {
  await page.waitForFunction(() => {
    const popups = document.querySelectorAll('transover-popup')
    const popup = popups[popups.length - 1]
    const main = popup && popup.shadowRoot && popup.shadowRoot.querySelector('main')
    return !!(main && main.innerText.trim())
  }, undefined, { timeout })
  return getPopupText(page)
}

// Opens the type-and-translate popup on `page`. In real usage this is
// triggered by clicking the toolbar icon, which Playwright can't do (that's
// browser chrome, not page content) - background.js's
// browserAction.onClicked listener is just one line
// (`chrome.tabs.sendMessage(tab.id, 'open_type_and_translate')`), so this
// calls that same line directly from the service worker instead. `page`
// must be the focused tab (manifest.json has no host permission for the
// fixture server's origin, so tabs.query can't filter by url - it has to
// find it via activeTab instead). Also clears any translation popup left
// over from an earlier action on this page: contentscript.js only clears
// it as a side effect of a real mousemove or a new translation, so without
// this a still-showing stale popup can make waitForPopupText() resolve
// immediately with old content instead of waiting for the translation this
// call is about to produce.
export async function openTypeAndTranslate(extension, page) {
  await removeStalePopup(page)
  await sendTabMessage(extension, page, 'open_type_and_translate')
}

// Same trick, for the copy-translation-to-clipboard keyboard command:
// background.js's chrome.commands.onCommand listener just does
// `chrome.tabs.sendMessage(activeTab.id, 'copy-translation-to-clipboard')`,
// which real OS-level keyboard shortcuts aren't reachable from Playwright
// to trigger, but that one line is.
export async function copyTranslationToClipboard(extension, page) {
  await sendTabMessage(extension, page, 'copy-translation-to-clipboard')
}

async function sendTabMessage(extension, page, message) {
  await page.bringToFront()
  await extension.serviceWorker.evaluate(async (message) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    chrome.tabs.sendMessage(tab.id, message)
  }, message)
}

// Test-isolation helper: resets the except_urls/only_urls lists directly via
// the background service worker's real chrome.storage API, so each options
// scenario starts from a clean slate without needing to reopen the options
// UI just to clear rows it didn't add.
export async function resetUrlLists(extension) {
  await extension.serviceWorker.evaluate(
    () => chrome.storage.local.set({ except_urls: [], only_urls: [] })
  )
}

// Asserts no popup shows up within `wait` ms - used for negative cases
// (except_urls, disabled everywhere, etc.) where we expect nothing to
// happen. Every translate response is a stubbed, same-process
// route.fulfill() now (see googleStub.mjs), not a real network round trip,
// so a translation that WAS going to happen shows up in well under this.
export async function popupStaysEmpty(page, { wait = 300 } = {}) {
  await removeStalePopup(page)
  await page.waitForTimeout(wait)
  return (await getPopupText(page)) === null
}
