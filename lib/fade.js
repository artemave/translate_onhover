const fadingOut = new WeakSet()

export function fadeIn(element, duration) {
  element.animate([{ opacity: 0 }, { opacity: 1 }], duration)
}

// Callers fade the same element out repeatedly (the popup on every
// mousemove); restarting would flash it back to full opacity each time.
export function fadeOut(element, duration, done) {
  if (fadingOut.has(element)) return
  fadingOut.add(element)

  const { opacity } = window.getComputedStyle(element)
  element.animate([{ opacity }, { opacity: 0 }], { duration, fill: 'forwards' }).onfinish = done
}
