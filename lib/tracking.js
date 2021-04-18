const trackingId = process.env.TRACKING_ID
const clientId = chrome.i18n.getMessage('@@extension_id')

export default function trackEvent(event) {
  const url = 'https://www.google-analytics.com/collect'
  const formData = new FormData()

  event.cid = clientId
  event.tid = trackingId

  for (const param in event) {
    formData.append(param, event[param])
  }

  return window.fetch(url, {
    method: 'POST',
    body: formData
  })
}
