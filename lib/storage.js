// TODO: migrate options to storage.sync
export const syncStorage = {
  async get(key) {
    const { [key]: thing } = new Promise((resolve, reject) => {
      chrome.storage.sync.get([key], result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      })
    })
    return thing
  },
  async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({[key]: value}, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }
}

export const localStorage = {
  async get(key) {
    let { [key]: thing } = await new Promise((resolve, reject) => {
      chrome.storage.local.get([key], result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      })
    })

    try {
      // Old localStorage API stores stringified objects.
      thing = JSON.parse(thing)
    } catch {
      // so this wasn't json, ignore
    }

    return thing
  },
  async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({[key]: value}, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }
}
