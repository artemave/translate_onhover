import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchBrowser, openOptionsPage, closeOpenPages } from './support/optionsPage.mjs'

const allOptions = {
  target_lang: 'fr',
  from_lang: 'de',
  reverse_lang: 'es',
  translate_by: 'point',
  delay: 300,
  fontSize: 18,
  theme: 'dark',
  tts: 1,
  tts_key: 'Control',
  word_key_only: 1,
  selection_key_only: 1,
  do_not_show_oops: 1,
  show_from_lang: 0,
  popup_show_trigger: 'Meta',
  except_urls: ['a.com'],
  only_urls: ['b.com'],
}

describe('options page', () => {
  let browser

  before(async () => { browser = await launchBrowser() })
  after(async () => { await browser.close() })
  afterEach(closeOpenPages)

  it('shows the saved options', async () => {
    const options = await openOptionsPage(browser, { items: allOptions })
    const { page } = options
    const value = selector => page.inputValue(selector)
    const checked = selector => page.isChecked(selector)

    assert.deepStrictEqual(
      [await value('#target_lang'), await value('#from_lang'), await value('#reverse_lang'), await value('#translate_by')],
      ['fr', 'de', 'es', 'point'],
    )
    assert.deepStrictEqual(
      [await value('#delay'), await value('#fontSize'), await value('#theme'), await value('#tts_key')],
      ['300', '18', 'dark', 'Control'],
    )
    assert.deepStrictEqual(
      [await value('#word_key_only_key'), await value('#selection_key_only_key')],
      ['Meta', 'Meta'],
    )
    assert.deepStrictEqual(
      [await checked('#tts'), await checked('#word_key_only'), await checked('#selection_key_only'), await checked('#do_not_show_oops'), await checked('#show_from_lang')],
      [true, true, true, true, false],
    )
    assert.deepStrictEqual(await options.urlInputs('exc_urls_table'), ['a.com', ''])
    assert.deepStrictEqual(await options.urlInputs('only_urls_table'), ['b.com', ''])
  })

  it('saves the form', async () => {
    const options = await openOptionsPage(browser)
    const { page } = options
    await options.showMoreOptions()

    await page.selectOption('#target_lang', 'de')
    await page.selectOption('#translate_by', 'point')
    await page.fill('#delay', '250')
    await page.fill('#fontSize', '16')
    await page.selectOption('#theme', 'dark')
    await page.check('#tts')
    await page.selectOption('#tts_key', 'Alt')
    await page.check('#word_key_only')
    await page.check('#selection_key_only')
    await page.selectOption('#word_key_only_key', 'Control')
    await page.check('#do_not_show_oops')
    await page.uncheck('#show_from_lang')
    await page.fill('#exc_urls_table input', 'a.com')
    await page.fill('#only_urls_table input', 'b.com')
    await options.save()

    assert.deepStrictEqual(await options.items(), {
      except_urls: ['a.com'],
      only_urls: ['b.com'],
      target_lang: 'de',
      from_lang: 'auto',
      reverse_lang: '',
      word_key_only: 1,
      selection_key_only: 1,
      tts: 1,
      tts_key: 'Alt',
      translate_by: 'point',
      delay: '250',
      fontSize: '16',
      theme: 'dark',
      do_not_show_oops: 1,
      popup_show_trigger: 'Control',
      show_from_lang: 0,
    })
    assert.ok(await page.locator('.flash').first().isVisible())
  })

  it('Enter saves, other keys do not', async () => {
    const options = await openOptionsPage(browser, { items: { target_lang: 'fr' } })
    await options.page.selectOption('#target_lang', 'de')
    await options.page.keyboard.press('a')
    assert.strictEqual((await options.items()).target_lang, 'fr')

    await options.page.keyboard.press('Enter')
    await options.waitForSaved()
    assert.strictEqual((await options.items()).target_lang, 'de')
  })

  it('the target language pulses until one is chosen', async () => {
    const options = await openOptionsPage(browser)
    const pulses = () => options.page.locator('#target_lang').evaluate(el => el.classList.contains('pulse'))
    assert.strictEqual(await options.page.inputValue('#target_lang'), '')
    assert.strictEqual(await pulses(), true)

    await options.page.selectOption('#target_lang', 'fr')
    assert.strictEqual(await pulses(), false)
    await options.page.selectOption('#target_lang', '')
    assert.strictEqual(await pulses(), true)
  })

  it('a chosen target language does not pulse', async () => {
    const options = await openOptionsPage(browser, { items: { target_lang: 'fr' } })

    assert.strictEqual(await options.page.locator('#target_lang').evaluate(el => el.classList.contains('pulse')), false)
  })

  for (const [browserName, isFirefox, shown, hidden] of [['Chrome', false, '.chrome-option', '.firefox-option'], ['Firefox', true, '.firefox-option', '.chrome-option']]) {
    it(`shows the ${browserName} hotkey hint`, async () => {
      const options = await openOptionsPage(browser, { isFirefox })
      await options.showMoreOptions()

      assert.strictEqual(await options.page.isVisible(shown), true)
      assert.strictEqual(await options.page.isVisible(hidden), false)
    })
  }

  it('the Chrome hotkey link opens the extension shortcuts page', async () => {
    const options = await openOptionsPage(browser)
    await options.showMoreOptions()
    await options.page.click('.set_hotkey')

    assert.deepStrictEqual(await options.createdTabs(), [{ url: 'chrome://extensions/configureCommands' }])
  })

  describe('delay', () => {
    const delayEnabled = options => options.page.isEnabled('#delay')

    it('is only enabled when translating by pointing', async () => {
      const options = await openOptionsPage(browser)
      await options.showMoreOptions()
      assert.strictEqual(await delayEnabled(options), false)

      await options.page.selectOption('#translate_by', 'point')
      assert.strictEqual(await delayEnabled(options), true)
      await options.page.selectOption('#translate_by', 'click')
      assert.strictEqual(await delayEnabled(options), false)
    })

    it('is enabled on load when translating by pointing', async () => {
      const options = await openOptionsPage(browser, { items: { translate_by: 'point' } })

      assert.strictEqual(await delayEnabled(options), true)
    })

    it('is disabled while word_key_only is checked', async () => {
      const options = await openOptionsPage(browser, { items: { translate_by: 'point' } })
      await options.showMoreOptions()

      await options.page.check('#word_key_only')
      assert.strictEqual(await delayEnabled(options), false)
      await options.page.selectOption('#translate_by', 'click')
      await options.page.selectOption('#translate_by', 'point')
      assert.strictEqual(await delayEnabled(options), false)

      await options.page.uncheck('#word_key_only')
      assert.strictEqual(await delayEnabled(options), true)
    })

    it('is disabled on load with word_key_only saved', async () => {
      const options = await openOptionsPage(browser, { items: { translate_by: 'point', word_key_only: 1 } })

      assert.strictEqual(await delayEnabled(options), false)
    })

    it('unchecking word_key_only leaves it disabled when translating by click', async () => {
      const options = await openOptionsPage(browser, { items: { word_key_only: 1 } })
      await options.showMoreOptions()
      await options.page.uncheck('#word_key_only')

      assert.strictEqual(await delayEnabled(options), false)
    })
  })

  describe('reverse language', () => {
    it('is only available with an autodetected source language', async () => {
      const options = await openOptionsPage(browser)
      await options.showMoreOptions()
      assert.strictEqual(await options.page.isEnabled('#reverse_lang'), true)

      await options.page.selectOption('#from_lang', 'de')
      assert.strictEqual(await options.page.isEnabled('#reverse_lang'), false)
      assert.strictEqual(await options.page.inputValue('#reverse_lang'), 'de')

      await options.page.selectOption('#from_lang', 'auto')
      assert.strictEqual(await options.page.isEnabled('#reverse_lang'), true)
    })

    it('is disabled on load with a saved source language', async () => {
      const options = await openOptionsPage(browser, { items: { from_lang: 'de' } })

      assert.strictEqual(await options.page.isEnabled('#reverse_lang'), false)
    })
  })

  it('the two trigger key selects stay in sync', async () => {
    const options = await openOptionsPage(browser)
    await options.showMoreOptions()
    await options.page.selectOption('#selection_key_only_key', 'Shift')

    assert.strictEqual(await options.page.inputValue('#word_key_only_key'), 'Shift')
  })

  for (const [table, key] of [['exc_urls_table', 'except_urls'], ['only_urls_table', 'only_urls']]) {
    describe(table, () => {
      it('+ adds a new row only once the current one has a url', async () => {
        const options = await openOptionsPage(browser)
        await options.showMoreOptions()
        const row = options.page.locator(`#${table} tr`).last()

        await row.locator('button').click()
        assert.deepStrictEqual(await options.urlInputs(table), [''])

        await row.locator('input').fill('a.com')
        await row.locator('button').click()
        assert.deepStrictEqual(await options.urlInputs(table), ['a.com', ''])
        assert.strictEqual(await options.page.locator(`#${table} tr`).first().locator('button').innerText(), 'X')

        await options.page.locator(`#${table} tr`).last().locator('input').fill('b.com')
        await options.save()
        assert.deepStrictEqual((await options.items())[key], ['a.com', 'b.com'])
      })

      it('X removes a saved url', async () => {
        const options = await openOptionsPage(browser, { items: { [key]: ['a.com', 'b.com'] } })
        await options.showMoreOptions()
        await options.page.locator(`#${table} tr`).first().locator('button').click()
        await options.page.waitForFunction(table => document.querySelectorAll(`#${table} tr`).length === 2, table)

        await options.save()
        assert.deepStrictEqual((await options.items())[key], ['b.com'])
      })

      it('X removes a newly added url', async () => {
        const options = await openOptionsPage(browser)
        await options.showMoreOptions()
        const first = options.page.locator(`#${table} tr`).first()
        await first.locator('input').fill('a.com')
        await first.locator('button').click()
        await first.locator('button').click()
        await options.page.waitForFunction(table => document.querySelectorAll(`#${table} tr`).length === 1, table)

        await options.save()
        assert.deepStrictEqual((await options.items())[key], [])
      })
    })
  }
})
