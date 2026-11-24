// Navigating away is the only way to make a headless Chromium page hidden,
// and the outgoing page's state would be lost with it, so `values()` is
// appended to sessionStorage, which the next page in the tab can read.
// Call this after the code under test has registered its own
// visibilitychange listeners, so this one runs after them.
export function carryOverOnHide(values) {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return
    for (const [key, value] of Object.entries(values())) {
      const saved = JSON.parse(sessionStorage.getItem(key) || '[]')
      sessionStorage.setItem(key, JSON.stringify([...saved, value]))
    }
  })
}
