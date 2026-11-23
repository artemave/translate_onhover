// Small helpers for driving the real options.html UI (lib/options_script.js),
// so the e2e suite exercises that code too instead of poking chrome.storage
// directly.


export async function openOptions(context, optionsUrl) {
  const page = await context.newPage()
  await page.goto(optionsUrl)

  // load()'s completion sets this marker itself (see options_script.js) -
  // interacting before it's done is a real race, e.g. selecting a value and
  // clicking Save can lose to load()'s own late
  // `$('#field').val(await Options.x())` call landing after.
  await page.waitForFunction(() => document.documentElement.dataset.transoverOptionsPageReady === 'true')

  return page
}

// A real completion signal for save_options(), which the Save button's
// click handler and the page's Enter-to-save keydown handler both call
// without awaiting - see options_script.js.
export async function waitForOptionsSaved(page) {
  await page.waitForFunction(() => document.documentElement.dataset.transoverOptionsSaved === 'true')
}

export async function showMoreOptions(optionsPage) {
  if (await optionsPage.locator('#more_options').isHidden()) {
    await optionsPage.click('#more_options_link')
  }
}

export async function setTargetLang(optionsPage, code) {
  await optionsPage.selectOption('#target_lang', code)
}

export async function setTranslateBy(optionsPage, value) {
  await optionsPage.selectOption('#translate_by', value)
}

export async function setDelay(optionsPage, ms) {
  await showMoreOptions(optionsPage)
  await optionsPage.fill('#delay', String(ms))
}

export async function setTheme(optionsPage, theme) {
  await showMoreOptions(optionsPage)
  await optionsPage.selectOption('#theme', theme)
}

export async function setFromLang(optionsPage, code) {
  await showMoreOptions(optionsPage)
  await optionsPage.selectOption('#from_lang', code)
}

async function setCheckbox(optionsPage, selector, checked) {
  await showMoreOptions(optionsPage)
  const checkbox = optionsPage.locator(selector)
  if (checked) await checkbox.check()
  else await checkbox.uncheck()
}

export const setWordKeyOnly = (page, checked) => setCheckbox(page, '#word_key_only', checked)
export const setSelectionKeyOnly = (page, checked) => setCheckbox(page, '#selection_key_only', checked)
export const setTts = (page, checked) => setCheckbox(page, '#tts', checked)
export const setDoNotShowOops = (page, checked) => setCheckbox(page, '#do_not_show_oops', checked)
export const setShowFromLang = (page, checked) => setCheckbox(page, '#show_from_lang', checked)

export async function setModifierKey(optionsPage, selector, key) {
  await showMoreOptions(optionsPage)
  await optionsPage.selectOption(selector, key)
}

export async function addExceptUrl(optionsPage, urlPattern) {
  await showMoreOptions(optionsPage)
  await optionsPage.locator('#exc_urls_table .except_url_input').last().fill(urlPattern)
}

export async function addOnlyUrl(optionsPage, urlPattern) {
  await showMoreOptions(optionsPage)
  await optionsPage.locator('#only_urls_table .only_url_input').last().fill(urlPattern)
}

// Clicks the "+" button on the table's current blank row (the one an
// addExceptUrl/addOnlyUrl fill just populated), which is what actually
// commits it to a removable "X" row and appends the next blank one -
// addExceptUrl/addOnlyUrl alone only fill the input, they don't click it.
// Waits for the row count to actually go up rather than a fixed delay: the
// new row fades in over jQuery's default 400ms, and that turned out to be
// a real, occasionally-missed race, not just a formality.
export async function commitLastUrlRow(optionsPage, tableId) {
  const before = await optionsPage.locator(`${tableId} tr`).count()
  await optionsPage.locator(`${tableId} tr`).last().locator('button').click()
  await optionsPage.waitForFunction(
    ({ selector, before }) => document.querySelectorAll(selector).length > before,
    { selector: `${tableId} tr`, before }
  )
}

// Clicks the "X" button on the table's first row - the one populated from
// a previously-saved entry when the options page loaded. Waits for the row
// count to actually go down rather than a fixed delay, for the same reason
// as commitLastUrlRow: rm_callback's fadeOut('fast') is real animation time,
// not a formality to wait out blindly.
export async function removeFirstUrlRow(optionsPage, tableId) {
  await showMoreOptions(optionsPage)
  const before = await optionsPage.locator(`${tableId} tr`).count()
  await optionsPage.locator(`${tableId} tr`).first().locator('button').click()
  await optionsPage.waitForFunction(
    ({ selector, before }) => document.querySelectorAll(selector).length < before,
    { selector: `${tableId} tr`, before }
  )
}

// Clicks Save and waits for save_options()'s real completion marker, since
// its chrome.storage.local.set() calls are unawaited from the click
// handler's point of view.
export async function saveOptions(optionsPage) {
  await optionsPage.click('#save_button')
  await waitForOptionsSaved(optionsPage)
}
