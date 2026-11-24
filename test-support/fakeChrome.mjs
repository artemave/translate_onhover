// An in-memory stand-in for chrome.storage.local and the chrome.runtime.lastError
// it reports failures through. Values round-trip through JSON, as
// chrome.storage serialises them.
export function createFakeStorage(initialItems = {}) {
  const items = JSON.parse(JSON.stringify(initialItems))
  const runtime = { lastError: undefined }
  let failure

  function respond(callback, result) {
    setTimeout(() => {
      runtime.lastError = failure && { message: failure }
      callback(result)
      runtime.lastError = undefined
    })
  }

  return {
    runtime,
    items,
    storage: {
      local: {
        get(keys, callback) {
          const result = {}
          for (const key of keys) {
            if (key in items) result[key] = JSON.parse(JSON.stringify(items[key]))
          }
          respond(callback, failure ? undefined : result)
        },
        set(values, callback) {
          if (!failure) Object.assign(items, JSON.parse(JSON.stringify(values)))
          respond(callback)
        },
      },
    },
    fail(message) {
      failure = message
    },
  }
}
