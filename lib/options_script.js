import { init } from './options_page'
import { createLocalStorage } from './storage'
import { createOptions } from './options'

init({
  options: createOptions(createLocalStorage(chrome)),
  isFirefox: typeof InstallTrigger !== 'undefined',
  tabs: chrome.tabs,
})
