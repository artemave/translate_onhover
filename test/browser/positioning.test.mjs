import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert'
import { launchBrowser, openContentPage, closeOpenPages } from './support/contentPage.mjs'

const margin = 5
const anchor = 10

// A translation long enough to make the popup `words` words wide.
function translation(words) {
  return { translation: Array.from({ length: words }, (_, i) => `word${i}`).join(' '), sl: 'en', tl: 'fr' }
}

describe('popup position', () => {
  let browser

  before(async () => { browser = await launchBrowser() })
  after(async () => { await browser.close() })
  afterEach(closeOpenPages)

  // Returns the clicked point - for a click, that's what the popup is
  // placed around.
  async function clickWordAt(content, left, top) {
    await content.page.$eval('#word', (el, [left, top]) => {
      Object.assign(el.style, { position: 'absolute', left: `${left}px`, top: `${top}px` })
    }, [left, top])
    const box = await content.page.locator('#word').boundingBox()
    const click = { x: Math.round(box.x + 10), y: Math.round(box.y + box.height / 2) }
    await content.page.mouse.click(click.x, click.y)
    await content.waitForPopupText()
    return click
  }

  async function open(viewport, words, options = {}) {
    return openContentPage(browser, 'word.html', {
      viewport,
      options: { show_from_lang: false, ...options },
      responses: { translate: translation(words) },
    })
  }

  it('to the right of and above the word when there is room', async () => {
    const content = await open({ width: 1000, height: 700 }, 3)
    const click = await clickWordAt(content, 100, 400)
    const popup = await content.popupBox()

    assert.strictEqual(popup.left, click.x + anchor)
    assert.strictEqual(popup.top, click.y - anchor - popup.outerHeight)
  })

  it('to the left of the word near the right edge', async () => {
    const content = await open({ width: 1000, height: 700 }, 3)
    const click = await clickWordAt(content, 900, 400)
    const popup = await content.popupBox()

    assert.strictEqual(popup.left, click.x - anchor - popup.outerWidth)
  })

  it('below the word near the top edge', async () => {
    const content = await open({ width: 1000, height: 700 }, 3)
    const click = await clickWordAt(content, 100, 10)
    const popup = await content.popupBox()

    assert.strictEqual(popup.top, click.y + anchor)
  })

  it('at the top of the window when it fits neither above nor below', async () => {
    const content = await open({ width: 1000, height: 120 }, 3, { fontSize: 40 })
    await clickWordAt(content, 100, 30)

    assert.strictEqual((await content.popupBox()).top, margin)
  })

  it('aligned with the start of a selection too wide to have it on either side', async () => {
    const content = await open({ width: 1000, height: 700 }, 25)
    await content.page.$eval('#paragraph', el => Object.assign(el.style, { position: 'absolute', left: '0', top: '300px', padding: '0', width: '1000px' }))
    await content.page.$eval('#paragraph', el => { el.innerHTML = `<span id="word">${'gift '.repeat(20).trim()}</span>` })
    await content.select('#word')
    const selection = await content.page.evaluate(() => window.getSelection().getRangeAt(0).getBoundingClientRect().toJSON())
    await content.page.mouse.move(selection.left + 20, selection.top + 5)
    await content.page.mouse.move(selection.left + 40, selection.top + 5)
    await content.waitForPopupText()

    assert.strictEqual((await content.popupBox()).left, selection.left)
  })

  it('at the left edge when wider than the room on either side of the word', async () => {
    const content = await open({ width: 1000, height: 700 }, 40)
    await clickWordAt(content, 480, 400)

    assert.strictEqual((await content.popupBox()).left, margin)
  })

  it('narrowed to the window when wider than the window', async () => {
    const content = await open({ width: 300, height: 700 }, 60)
    await clickWordAt(content, 100, 400)
    const popup = await content.popupBox()

    assert.strictEqual(popup.left, margin)
    assert.ok(popup.left + popup.width <= 300 - margin, `popup ends at ${popup.left + popup.width}`)
  })
})
