import { describe, expect, it, beforeAll } from 'vitest'
import { defineBocetoEdit, BocetoEditElement, TAG } from '../src'

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (): null {
    return null
  } as unknown as HTMLCanvasElement['getContext']
  defineBocetoEdit()
})

describe('<boceto-edit>', () => {
  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBe(BocetoEditElement)
  })

  it('parses inline `code` attribute on connect', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    document.body.appendChild(el)
    await Promise.resolve()
    expect(el.document?.pages).toHaveLength(1)
    expect(el.document?.pages[0]!.elements[0]!.label).toBe('Hi')
  })

  it('parses raw inline DSL via slot text when no `code` attribute is set', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.textContent = 'element box 0 0 100 50 "Slotted"'
    document.body.appendChild(el)
    await Promise.resolve()
    expect(el.document?.pages[0]!.elements[0]!.label).toBe('Slotted')
  })

  it('emits change event when code attribute is set programmatically', () => {
    const el = document.createElement(TAG) as BocetoEditElement
    document.body.appendChild(el)
    let detail: { code: string } | null = null
    el.addEventListener('change', (e) => {
      detail = (e as CustomEvent).detail as { code: string }
    })
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Edited"\n```')
    expect(detail).not.toBeNull()
    expect(detail!.code).toContain('Edited')
  })

  it('exposes a canvas in shadow DOM', () => {
    const el = document.createElement(TAG) as BocetoEditElement
    document.body.appendChild(el)
    const canvas = el.shadowRoot!.querySelector('canvas')
    expect(canvas).not.toBeNull()
    // No textarea anymore (v0.1 stub had one).
    expect(el.shadowRoot!.querySelector('textarea')).toBeNull()
  })

  it('reflects code attribute through the code getter', () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.code = 'element box 0 0 100 50 "via setter"'
    expect(el.code).toContain('via setter')
    expect(el.getAttribute('code')).toContain('via setter')
  })
})
