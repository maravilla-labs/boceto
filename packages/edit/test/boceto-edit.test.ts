import { describe, expect, it, beforeAll } from 'vitest'
import { defineBocetoEdit, BocetoEditElement, TAG } from '../src'

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (): null {
    return null
  } as unknown as HTMLCanvasElement['getContext']
  defineBocetoEdit()
})

async function flush(): Promise<void> {
  // Allow connectedCallback's async path (yogaReady + readInitialSource) to run.
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
}

describe('<boceto-edit>', () => {
  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBe(BocetoEditElement)
  })

  it('parses inline `code` attribute on connect', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    document.body.appendChild(el)
    await flush()
    expect(el.document.pages).toHaveLength(1)
    expect(el.document.pages[0]!.elements[0]!.label).toBe('Hi')
  })

  it('parses raw inline DSL via slot text when no `code` attribute is set', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.textContent = 'element box 0 0 100 50 "Slotted"'
    document.body.appendChild(el)
    await flush()
    expect(el.document.pages[0]!.elements[0]!.label).toBe('Slotted')
  })

  it('does NOT emit change for external setAttribute("code", ...)', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    document.body.appendChild(el)
    await flush()
    let fired = 0
    el.addEventListener('change', () => fired++)
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Edited"\n```')
    await flush()
    expect(fired).toBe(0)
    expect(el.document.pages[0]!.elements[0]!.label).toBe('Edited')
  })

  it('emits change for user mutations via the editor controller', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    document.body.appendChild(el)
    await flush()
    let detail: { code: string } | null = null
    el.addEventListener('change', (e) => {
      detail = (e as CustomEvent).detail as { code: string }
    })
    const id = el.document.pages[0]!.elements[0]!.id
    el.editor.move([id], 20, 0)
    expect(detail).not.toBeNull()
    expect(detail!.code).toContain('"Hi"')
  })

  it('exposes a canvas in shadow DOM with part="canvas"', () => {
    const el = document.createElement(TAG) as BocetoEditElement
    document.body.appendChild(el)
    const canvas = el.shadowRoot!.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute('part')).toBe('canvas')
    expect(el.shadowRoot!.querySelector('textarea')).toBeNull()
  })

  it('reflects code attribute through the code getter (serialized form)', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    document.body.appendChild(el)
    await flush()
    el.code = 'element box 0 0 100 50 "via setter"'
    await flush()
    expect(el.code).toContain('via setter')
    expect(el.getAttribute('code')).toContain('via setter')
  })

  it('exposes the editor controller via el.editor', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    document.body.appendChild(el)
    await flush()
    expect(el.editor).toBeDefined()
    expect(el.editor.doc).toBe(el.document)
    expect(el.editor.canUndo).toBe(false)
    const id = el.document.pages[0]!.elements[0]!.id
    el.editor.move([id], 5, 0)
    expect(el.editor.canUndo).toBe(true)
  })

  it('readonly attribute suppresses mutations', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    el.setAttribute('readonly', '')
    document.body.appendChild(el)
    await flush()
    const id = el.document.pages[0]!.elements[0]!.id
    const x0 = el.document.pages[0]!.elements[0]!.x
    el.editor.move([id], 99, 0)
    expect(el.document.pages[0]!.elements[0]!.x).toBe(x0)
  })

  it('emits select event when the controller selects items', async () => {
    const el = document.createElement(TAG) as BocetoEditElement
    el.setAttribute('code', '```boceto\nelement box 0 0 100 50 "Hi"\n```')
    document.body.appendChild(el)
    await flush()
    let ids: string[] = []
    el.addEventListener('select', (e) => {
      ids = (e as CustomEvent).detail.ids
    })
    const id = el.document.pages[0]!.elements[0]!.id
    el.editor.select([id])
    expect(ids).toEqual([id])
  })
})
