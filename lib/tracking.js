export function createTracker({ url, clientId }) {
  return function trackEvent(event) {
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        events: [event]
      })
    })
  }
}
