import { describe, expect, it, beforeAll } from 'vitest'
import { defineBocetoView, BocetoViewElement, TAG } from '../src'

beforeAll(() => {
  // jsdom doesn't implement getContext('2d'); stub a no-op so renders don't throw.
  HTMLCanvasElement.prototype.getContext = function (): null {
    return null
  } as unknown as HTMLCanvasElement['getContext']
  defineBocetoView()
})

describe('<boceto-view>', () => {
  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBe(BocetoViewElement)
  })

  it('parses inline `code` attribute on connect', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    document.body.appendChild(el)
    // Allow microtask queue (refresh is async but with no fetch resolves synchronously up to render).
    await Promise.resolve()
    expect(el.document?.pages).toHaveLength(1)
    expect(el.document?.pages[0]!.elements[0]!.label).toBe('Hi')
  })

  it('parses raw inline DSL via slot text when no `code` attribute is set', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.textContent = 'element box 0 0 100 50 "Slotted"'
    document.body.appendChild(el)
    await Promise.resolve()
    expect(el.document?.pages[0]!.elements[0]!.label).toBe('Slotted')
  })

  it('emits boceto-render event after parsing', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    let detail: unknown = null
    el.addEventListener('boceto-render', (e) => {
      detail = (e as CustomEvent).detail
    })
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    document.body.appendChild(el)
    await Promise.resolve()
    expect(detail).not.toBeNull()
  })
})
