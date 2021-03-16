module.exports = function buildManifest(content) {
  const manifest = JSON.parse(content)

  if (process.env.USE_GA === 'false') {
    manifest.content_security_policy = manifest.content_security_policy.replace(' https://ssl.google-analytics.com', '')
  }

  return JSON.stringify(manifest, null, 2)
}
