import { init } from './lib/background'
import { createLocalStorage } from './lib/storage'
import { createOptions } from './lib/options'
import { createTracker } from './lib/tracking'

const manifestV3 = process.env.MANIFEST_V3 === 'true'
const localStorage = createLocalStorage(chrome)

init({
  runtime: chrome.runtime,
  action: manifestV3 ? chrome.action : chrome.browserAction,
  tabs: chrome.tabs,
  commands: chrome.commands,
  localStorage,
  options: createOptions(localStorage),
  trackEvent: createTracker({
    url: `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`,
    // FIXME: work out how to get @extension_id before switching to v3 on Firefox
    clientId: manifestV3 ? chrome.runtime.id : chrome.i18n.getMessage('@@extension_id'),
  }),
  devOptions: JSON.parse(process.env.DEV_OPTIONS),
})
