import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchExtension, resetUrlLists } from './support/extension.mjs'
import {
  openOptions,
  showMoreOptions,
  setTargetLang,
  setFromLang,
  setTranslateBy,
  setWordKeyOnly,
  setSelectionKeyOnly,
  setTts,
  setDoNotShowOops,
  setShowFromLang,
  setModifierKey,
  addExceptUrl,
  addOnlyUrl,
  commitLastUrlRow,
  removeFirstUrlRow,
  saveOptions,
  waitForOptionsSaved
} from './support/optionsPage.mjs'

describe('options page UI', () => {
  let extension

  before(async () => {
    extension = await launchExtension()
  })

  after(async () => {
    await extension.close()
  })

  beforeEach(async () => {
    await resetUrlLists(extension)
  })

  // Only a handful of tests below change these, but resetting them
  // unconditionally here keeps that reset out of the tests themselves.
  afterEach(async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(page, 'fr')
    await setWordKeyOnly(page, false)
    await setSelectionKeyOnly(page, false)
    await setTts(page, false)
    await setDoNotShowOops(page, false)
    await setShowFromLang(page, true)
    await saveOptions(page)
    await page.close()
  })

  // Has to run before target_lang is ever set (the "Choose..." option and
  // the pulse it starts with are only added by fill_target_lang() when
  // there's no saved value yet), so it's first.
  it('target_lang pulses until a real language is picked', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    assert.ok(await page.locator('#target_lang').evaluate(el => el.classList.contains('pulse')))

    await setTargetLang(page, 'fr')
    assert.ok(!(await page.locator('#target_lang').evaluate(el => el.classList.contains('pulse'))))

    await setTargetLang(page, '')
    assert.ok(await page.locator('#target_lang').evaluate(el => el.classList.contains('pulse')))

    await setTargetLang(page, 'fr')
    await saveOptions(page)
    await page.close()
  })

  it('changing from_lang away from "auto" disables reverse_lang, live and after reload', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await setFromLang(page, 'de')
    assert.strictEqual(await page.locator('#reverse_lang').isDisabled(), true)
    await saveOptions(page)
    await page.close()

    const reopened = await openOptions(extension.context, extension.optionsUrl)
    await showMoreOptions(reopened)
    assert.strictEqual(await reopened.locator('#reverse_lang').isDisabled(), true)

    await setFromLang(reopened, 'auto')
    assert.strictEqual(await reopened.locator('#reverse_lang').isDisabled(), false)
    await saveOptions(reopened)
    await reopened.close()
  })

  it('checking word_key_only disables delay, live and after reload', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await setWordKeyOnly(page, true)
    assert.strictEqual(await page.locator('#delay').isDisabled(), true)
    await saveOptions(page)
    await page.close()

    const reopened = await openOptions(extension.context, extension.optionsUrl)
    await showMoreOptions(reopened)
    assert.strictEqual(await reopened.locator('#delay').isDisabled(), true)
    await reopened.close()
  })

  it('word_key_only\'s own click handler also runs when translate_by is "point"', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await setTranslateBy(page, 'point')
    await setWordKeyOnly(page, true)
    await setWordKeyOnly(page, false)
    await setTranslateBy(page, 'click')
    await saveOptions(page)
    await page.close()
  })

  it('selection_key_only, tts, do_not_show_oops and show_from_lang all persist across reload', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await setSelectionKeyOnly(page, true)
    await setTts(page, true)
    await setDoNotShowOops(page, true)
    await setShowFromLang(page, false)
    await saveOptions(page)
    await page.close()

    const reopened = await openOptions(extension.context, extension.optionsUrl)
    await showMoreOptions(reopened)
    assert.strictEqual(await reopened.locator('#selection_key_only').isChecked(), true)
    assert.strictEqual(await reopened.locator('#tts').isChecked(), true)
    assert.strictEqual(await reopened.locator('#do_not_show_oops').isChecked(), true)
    assert.strictEqual(await reopened.locator('#show_from_lang').isChecked(), false)
    await reopened.close()
  })

  it('the word/selection modifier-key dropdowns stay in sync', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await setModifierKey(page, '#word_key_only_key', 'Shift')
    assert.strictEqual(await page.locator('#selection_key_only_key').inputValue(), 'Shift')
    await page.close()
  })

  it('clicking + without filling the row first is a no-op', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await showMoreOptions(page)
    assert.strictEqual(await page.locator('#exc_urls_table tr').count(), 1)

    await page.locator('#exc_urls_table tr').last().locator('button').click()
    assert.strictEqual(await page.locator('#exc_urls_table tr').count(), 1, 'no row should be added for an empty input')

    await page.close()
  })

  it('an already-saved only_url can be removed via its "X" button', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await addOnlyUrl(page, 'https://example.com')
    await saveOptions(page)
    await page.close()

    const reopened = await openOptions(extension.context, extension.optionsUrl)
    await showMoreOptions(reopened)
    assert.strictEqual(await reopened.locator('#only_urls_table tr').count(), 2, 'saved row + blank row')

    await removeFirstUrlRow(reopened, '#only_urls_table')
    assert.strictEqual(await reopened.locator('#only_urls_table tr').count(), 1)

    await reopened.close()
  })

  it('an already-saved except_url can be removed via its "X" button', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await addExceptUrl(page, 'https://example.com')
    await saveOptions(page)
    await page.close()

    const reopened = await openOptions(extension.context, extension.optionsUrl)
    await showMoreOptions(reopened)
    assert.strictEqual(await reopened.locator('#exc_urls_table tr').count(), 2, 'saved row + blank row')

    await removeFirstUrlRow(reopened, '#exc_urls_table')
    assert.strictEqual(await reopened.locator('#exc_urls_table tr').count(), 1)

    await reopened.close()
  })

  it('clicking + on a filled row commits it and adds a new blank row - except_urls and only_urls alike', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await addExceptUrl(page, 'https://example.org')
    assert.strictEqual(await page.locator('#exc_urls_table tr').count(), 1)

    await commitLastUrlRow(page, '#exc_urls_table')
    assert.strictEqual(await page.locator('#exc_urls_table tr').count(), 2)
    assert.strictEqual(await page.locator('#exc_urls_table tr').first().locator('button').innerText(), 'X')

    await addOnlyUrl(page, 'https://example.net')
    assert.strictEqual(await page.locator('#only_urls_table tr').count(), 1)

    await commitLastUrlRow(page, '#only_urls_table')
    assert.strictEqual(await page.locator('#only_urls_table tr').count(), 2)
    assert.strictEqual(await page.locator('#only_urls_table tr').first().locator('button').innerText(), 'X')

    await page.close()
  })

  it('pressing Enter anywhere on the page saves, same as clicking Save', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await setTargetLang(page, 'es')
    await page.keyboard.press('Enter')
    await waitForOptionsSaved(page)
    await page.close()

    const reopened = await openOptions(extension.context, extension.optionsUrl)
    assert.strictEqual(await reopened.locator('#target_lang').inputValue(), 'es')
    await reopened.close()
  })

  it('the hotkey configuration link opens chrome://extensions/configureCommands', async () => {
    const page = await openOptions(extension.context, extension.optionsUrl)
    await showMoreOptions(page)

    const [newPage] = await Promise.all([
      extension.context.waitForEvent('page'),
      page.click('.set_hotkey')
    ])
    await newPage.waitForLoadState()
    // chrome://extensions/configureCommands (the URL the code requests)
    // redirects to chrome://extensions/shortcuts, its current name
    assert.strictEqual(newPage.url(), 'chrome://extensions/shortcuts')

    await newPage.close()
    await page.close()
  })
})
