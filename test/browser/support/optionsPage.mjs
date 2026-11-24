import { openHarnessPage, origin } from './harnessPage.mjs'

export { launchBrowser, closeOpenPages } from './harnessPage.mjs'

// Opens the real options.html with chrome.storage.local holding `items`
// (see optionsHarness.js).
export async function openOptionsPage(browser, { items = {}, isFirefox = false } = {}) {
  const harnessPage = await openHarnessPage(browser, { items, isFirefox })
  const { page } = harnessPage

  const optionsPage = {
    ...harnessPage,

    async reload() {
      await page.goto(`${origin}/options.html`)
      await page.waitForFunction(() => document.documentElement.dataset.transoverOptionsPageReady === 'true')
    },

    items() {
      return page.evaluate(() => window.transoverHarness.items)
    },

    createdTabs() {
      return page.evaluate(() => window.transoverHarness.createdTabs)
    },

    async showMoreOptions() {
      await page.click('#more_options_link')
      await page.locator('#more_options').waitFor()
    },

    async save() {
      await page.click('#save_button')
      await optionsPage.waitForSaved()
    },

    async waitForSaved() {
      await page.waitForFunction(() => document.documentElement.dataset.transoverOptionsSaved === 'true')
    },

    urlInputs(table) {
      return page.locator(`#${table} input`).evaluateAll(inputs => inputs.map(input => input.value))
    },
  }

  await optionsPage.reload()
  return optionsPage
}
