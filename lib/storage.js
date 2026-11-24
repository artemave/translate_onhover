export function createLocalStorage({ storage, runtime }) {
  function settle(resolve, reject, value) {
    if (runtime.lastError) {
      reject(runtime.lastError)
    } else {
      resolve(value)
    }
  }

  return {
    async get(key) {
      let { [key]: thing } = await new Promise((resolve, reject) => {
        storage.local.get([key], result => settle(resolve, reject, result))
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
        storage.local.set({[key]: value}, () => settle(resolve, reject))
      })
    }
  }
}
