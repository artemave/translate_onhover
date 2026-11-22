const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID
const GA_API_SECRET = process.env.GA_API_SECRET
// FIXME: work out how to get @extension_id before switching to v3 on Firefox
const CLIENT_ID = process.env.MANIFEST_V3 === 'true' ? chrome.runtime.id : chrome.i18n.getMessage('@@extension_id')

export default function trackEvent(event) {
  // Use 'https://www.google-analytics.com/debug/mp/collect' to see ga validation errors
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`

  return fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      client_id: CLIENT_ID,
      events: [event]
    })
  })
}
