// Replays real, previously-captured Google Translate responses instead of
// e2e tests hitting Google's servers directly - test/endpoints.test.mjs
// already covers "did Google change its response format" as a dedicated,
// scheduled canary, so there's nothing left for the e2e suite to gain by
// also calling the real API on every run, and every real call is one more
// chance at getting IP/extension-flagged for volume.
//
// A test that needs a specific real API failure mode (a 429, a malformed
// primary-API response, both APIs down) registers its own context.route()
// for that - Playwright runs the most-recently-registered matching route
// first, so those still take priority over this file's fixture replay.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fixtureName } from './googleFixtureName.mjs'

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/google-responses')

export async function capturedTranslateResponse(requestUrl) {
  const url = new URL(requestUrl)
  const word = url.searchParams.get('q')
  const sl = url.searchParams.get('sl')
  const tl = url.searchParams.get('tl')
  const client = url.searchParams.get('client')
  const name = fixtureName(word, sl, tl, client)

  try {
    return await readFile(path.join(fixturesDir, `${name}.json`), 'utf8')
  } catch {
    throw new Error(
      `No captured Google response fixture for word=${word} sl=${sl} tl=${tl} client=${client} ` +
      `(looked for ${name}.json) - add this combo to scripts/capture-translate-fixtures.mjs and run it.`
    )
  }
}

export async function stubTranslateApi(context) {
  await context.route('**/translate_a/single**', async route => {
    const body = await capturedTranslateResponse(route.request().url())
    await route.fulfill({ contentType: 'application/json', body })
  })

  // Only ever checked for the outgoing request URL (see
  // keyboardTriggers.test.mjs's TTS test), never read from - a trivial
  // empty response is enough, and this keeps every e2e test off Google's
  // network entirely.
  await context.route('**/translate_tts**', route =>
    route.fulfill({ contentType: 'audio/mpeg', body: '' })
  )
}
