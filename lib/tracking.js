const trackingId = process.env.TRACKING_ID
// FIXME: work out how to get @extension_id before switching to v3 on Firefox
const clientId = process.env.MANIFEST_V3 === 'true' ? chrome.runtime.id : chrome.i18n.getMessage('@@extension_id')

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

  return fetch(url, {
    method: 'POST',
    body: new URLSearchParams(formData)
  })
}
