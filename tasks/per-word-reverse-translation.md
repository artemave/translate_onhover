# Decide reverse translation per word, not per page

## Problem

Reverse translation is chosen from the page language (`chrome.tabs.detectLanguage`
in `figureOutSlTl`, `background.js`), while the popup's "translated from" label
comes from Google's per-word detection. The two disagree, e.g. with target French
and reverse English:

- "réservé" on a non-French page is "translated" French → French and comes back unchanged.
- On a French page, an English word is reverse-translated as if it were French.

## Proposal

1. Translate with the source on Autodetect (or the configured "Translate from").
2. If Google detects the word as the target language and a reverse language is
   set, translate again into the reverse language.
3. Drop the page-language check from `figureOutSlTl`.

The second request only happens for words already in the target language.

## Out of scope

Single-word detection mislabels closely related languages (e.g. "предназначен"
→ Bulgarian on a Russian page). The translation is usually unaffected; fixing
the label (e.g. preferring the page language when Google picks a close sibling)
is a separate task.

## Tests

e2e with recorded Google responses (`test/e2e/fixtures/google-responses`,
`scripts/capture-translate-fixtures.mjs`):

- word detected as the target language → popup shows the reverse translation
- word in another language → normal translation, single request
- no reverse language set → current behaviour
