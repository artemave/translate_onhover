const trackingId = process.env.TRACKING_ID
const clientId = chrome.i18n.getMessage('@@extension_id')

export default function trackEvent(event) {
  // Use 'https://www.google-analytics.com/debug/collect' to see ga validation errors
  const url = 'https://www.google-analytics.com/collect'
  const formData = new FormData()

  event.cid = clientId
  event.tid = trackingId
  event.t = 'event'
  event.v = 1

  for (const param in event) {
    formData.append(param, event[param])
  }

  return window.fetch(url, {
    method: 'POST',
    body: new URLSearchParams(formData)
  })
}
