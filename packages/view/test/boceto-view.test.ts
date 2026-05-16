import { describe, expect, it, beforeAll } from 'vitest'
import { initYoga } from '@boceto/core'
import { defineBocetoView, BocetoViewElement, TAG } from '../src'

beforeAll(async () => {
  // jsdom doesn't implement getContext('2d'); stub a no-op so renders don't throw.
  HTMLCanvasElement.prototype.getContext = function (): null {
    return null
  } as unknown as HTMLCanvasElement['getContext']
  // Warm Yoga so the view's `await yogaReady` resolves synchronously and
  // these tests don't have to know about extra microtasks.
  await initYoga()
  defineBocetoView()
})

// Multiple microtask flushes — yoga is preloaded but the view's #refresh
// chains a few awaits internally before dispatching render.
async function flush(): Promise<void> {
  for (let i = 0; i < 4; i++) await Promise.resolve()
}

describe('<boceto-view>', () => {
  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBe(BocetoViewElement)
  })

  it('parses inline `code` attribute on connect', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    document.body.appendChild(el)
    // Allow microtask queue (refresh is async but with no fetch resolves synchronously up to render).
    await flush()
    expect(el.document?.pages).toHaveLength(1)
    expect(el.document?.pages[0]!.elements[0]!.label).toBe('Hi')
  })

  it('parses raw inline DSL via slot text when no `code` attribute is set', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.textContent = 'element box 0 0 100 50 "Slotted"'
    document.body.appendChild(el)
    await flush()
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
    await flush()
    expect(detail).not.toBeNull()
  })

  it('fit="fixed" (default) keeps the declared width × height', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.setAttribute('width', '400')
    el.setAttribute('height', '200')
    el.setAttribute('code', '```boceto\nelement box 100 100 800 800 "big"\n```')
    document.body.appendChild(el)
    await flush()
    const canvas = el.shadowRoot!.querySelector('canvas')!
    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(200)
  })

  it('fit="content" grows the canvas to encompass the mockup', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.setAttribute('width', '400')
    el.setAttribute('height', '200')
    el.setAttribute('fit', 'content')
    el.setAttribute('padding', '10')
    el.setAttribute('code', '```boceto\nelement box 100 100 800 600 "big"\n```')
    document.body.appendChild(el)
    await flush()
    const canvas = el.shadowRoot!.querySelector('canvas')!
    // Element extends to (900, 700); +10 padding → at least 910 × 710.
    expect(canvas.width).toBe(910)
    expect(canvas.height).toBe(710)
  })

  it('fit="content" still honors width/height as minimums', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.setAttribute('width', '1000')
    el.setAttribute('height', '800')
    el.setAttribute('fit', 'content')
    el.setAttribute('code', '```boceto\nelement box 10 10 50 50 "tiny"\n```')
    document.body.appendChild(el)
    await flush()
    const canvas = el.shadowRoot!.querySelector('canvas')!
    expect(canvas.width).toBe(1000)
    expect(canvas.height).toBe(800)
  })

  it('resolves components defined in `imports` (attribute)', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.setAttribute(
      'imports',
      '```boceto\ncomponent badge-pill(label)\n  element badge 0 0 80 24 "$label"\nend\n```',
    )
    el.setAttribute('code', 'element badge-pill 0 0 80 24 "" label="New"')
    document.body.appendChild(el)
    await flush()
    // Imports feed the parser's resolution map but are intentionally NOT echoed
    // in `doc.components` — that's reserved for components declared in `code`.
    expect(el.document?.components).toEqual([])
    const items = el.document?.pages[0]!.elements ?? []
    expect(items).toHaveLength(1)
    expect('kind' in items[0]! && items[0]!.kind).toBe('component-instance')
  })

  it('resolves components when `imports` is set via property (no attribute serialization)', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.setAttribute('code', 'element badge-pill 0 0 80 24 "" label="Beta"')
    document.body.appendChild(el)
    el.imports =
      '```boceto\ncomponent badge-pill(label)\n  element badge 0 0 80 24 "$label"\nend\n```'
    await flush()
    expect(el.document?.pages[0]!.elements).toHaveLength(1)
    expect(el.getAttribute('imports')).toBeNull() // property bypasses attribute
  })

  it('re-renders when `imports` attribute changes', async () => {
    const el = document.createElement(TAG) as BocetoViewElement
    el.setAttribute('code', 'element pricing-card 0 0 240 160 "" title="Pro" price="$9"')
    document.body.appendChild(el)
    await flush()
    // Before imports: parse fails (unknown component) — document is null.
    expect(el.document).toBeNull()
    el.setAttribute(
      'imports',
      '```boceto\ncomponent pricing-card(title, price)\n  element card 0 0 240 160 "$title"\nend\n```',
    )
    await flush()
    expect(el.document?.pages[0]!.elements).toHaveLength(1)
  })
})
