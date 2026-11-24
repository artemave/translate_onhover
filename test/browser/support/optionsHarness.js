import { init } from '../../../lib/options_page'
import { createLocalStorage } from '../../../lib/storage'
import { createOptions } from '../../../lib/options'
import { createFakeStorage } from '../../../test-support/fakeChrome.mjs'
import { carryOverOnHide } from './carryOverOnHide'

const { items, isFirefox } = window.transoverHarnessConfig
const chrome = createFakeStorage(items)

window.transoverHarness = {
  items: chrome.items,
  createdTabs: [],
}

init({
  options: createOptions(createLocalStorage(chrome)),
  isFirefox,
  tabs: { create: properties => window.transoverHarness.createdTabs.push(properties) },
})

carryOverOnHide(() => ({ transoverCoverage: window.__coverage__ }))
