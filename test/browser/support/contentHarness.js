import { init } from '../../../lib/content'
import { carryOverOnHide } from './carryOverOnHide'

const { responses, held: heldHandlers } = window.transoverHarnessConfig
const held = {}

const harness = window.transoverHarness = {
  sent: [],
  responses,
  listeners: [],
  deliver(request) {
    harness.listeners.forEach(listener => listener(request))
  },
  release(handler) {
    held[handler].forEach(reply => reply())
    delete held[handler]
  },
}

const runtime = {
  sendMessage(message, callback) {
    harness.sent.push(message)
    if (!callback) return

    if (!(message.handler in harness.responses)) {
      throw new Error(`No harness response for handler '${message.handler}'`)
    }
    const reply = () => callback(structuredClone(harness.responses[message.handler]))

    if (heldHandlers.includes(message.handler)) {
      held[message.handler] = [...(held[message.handler] || []), reply]
    } else {
      setTimeout(reply)
    }
  },
  onMessage: {
    addListener(listener) {
      harness.listeners.push(listener)
    },
  },
  getURL: path => `/${path}`,
}

init(runtime)

carryOverOnHide(() => ({ transoverCoverage: window.__coverage__, transoverSent: harness.sent }))
