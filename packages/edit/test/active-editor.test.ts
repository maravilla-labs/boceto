import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  BocetoEditElement,
  defineBocetoEdit,
  defineBocetoInspector,
  defineBocetoPalette,
  getActiveEditor,
  setActiveEditor,
  TAG,
} from '../src'

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (): null {
    return null
  } as unknown as HTMLCanvasElement['getContext']
  defineBocetoEdit()
  defineBocetoPalette()
  defineBocetoInspector()
})

afterEach(() => {
  // Reset module state so a leftover "active" from one test doesn't bleed
  // into the next.
  setActiveEditor(null)
  document.body.innerHTML = ''
})

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
}

function mountEditor(id: string, code: string): BocetoEditElement {
  const el = document.createElement(TAG) as BocetoEditElement
  el.id = id
  el.setAttribute('code', code)
  document.body.appendChild(el)
  return el
}

describe('active-editor registry', () => {
  it('starts null', () => {
    expect(getActiveEditor()).toBeNull()
  })

  it('marks an editor active on pointerdown', async () => {
    const a = mountEditor('ed-a', '```boceto\nelement box 0 0 100 50 "A"\n```')
    await flush()
    expect(getActiveEditor()).toBeNull()
    a.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(getActiveEditor()).toBe(a)
  })

  it('switches active editor when pointer moves to a sibling', async () => {
    const a = mountEditor('ed-a', '```boceto\nelement box 0 0 100 50 "A"\n```')
    const b = mountEditor('ed-b', '```boceto\nelement box 0 0 100 50 "B"\n```')
    await flush()
    a.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(getActiveEditor()).toBe(a)
    b.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(getActiveEditor()).toBe(b)
  })

  it('clears active when the active editor disconnects', async () => {
    const a = mountEditor('ed-a', '```boceto\nelement box 0 0 100 50 "A"\n```')
    await flush()
    a.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(getActiveEditor()).toBe(a)
    a.remove()
    expect(getActiveEditor()).toBeNull()
  })
})

describe('multi-editor inspector scoping', () => {
  it('only one inspector is visible at a time across two editors', async () => {
    const a = mountEditor('ed-a', '```boceto\nelement box 0 0 100 50 "A"\n```')
    const b = mountEditor('ed-b', '```boceto\nelement box 0 0 100 50 "B"\n```')
    const insA = document.createElement('boceto-inspector')
    insA.setAttribute('for', 'ed-a')
    insA.setAttribute('auto', '')
    const insB = document.createElement('boceto-inspector')
    insB.setAttribute('for', 'ed-b')
    insB.setAttribute('auto', '')
    document.body.append(insA, insB)
    await flush()

    // Activate A and select something — A's inspector should show.
    a.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    const aId = a.document.pages[0]!.elements[0]!.id
    a.editor.select([aId])
    await flush()
    expect(panelOf(insA).style.display).toBe('flex')
    expect(panelOf(insB).style.display).toBe('none')

    // Select something in B — that ALSO activates B (the select() call goes
    // through the editor controller, but in a real session the user would
    // have clicked B first). Simulate the click explicitly:
    b.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    const bId = b.document.pages[0]!.elements[0]!.id
    b.editor.select([bId])
    await flush()
    // A still HAS its selection internally — selections persist — but its
    // inspector hides because A is no longer the active editor.
    expect(panelOf(insA).style.display).toBe('none')
    expect(panelOf(insB).style.display).toBe('flex')
    expect([...a.editor.selection]).toEqual([aId])
  })
})

describe('multi-editor palette scoping (Cmd+K)', () => {
  it('only the active editor\'s palette toggles on Cmd+K', async () => {
    const a = mountEditor('ed-a', '```boceto\nelement box 0 0 100 50 "A"\n```')
    mountEditor('ed-b', '```boceto\nelement box 0 0 100 50 "B"\n```')
    const palA = document.createElement('boceto-palette')
    palA.setAttribute('for', 'ed-a')
    const palB = document.createElement('boceto-palette')
    palB.setAttribute('for', 'ed-b')
    document.body.append(palA, palB)
    await flush()

    // Activate A, then dispatch Cmd+K — only A's palette should open.
    a.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', metaKey: true, bubbles: true }),
    )
    expect(palA.hasAttribute('open')).toBe(true)
    expect(palB.hasAttribute('open')).toBe(false)
  })

  it('switching active editor closes a palette that was open', async () => {
    const a = mountEditor('ed-a', '```boceto\nelement box 0 0 100 50 "A"\n```')
    const b = mountEditor('ed-b', '```boceto\nelement box 0 0 100 50 "B"\n```')
    const palA = document.createElement('boceto-palette')
    palA.setAttribute('for', 'ed-a')
    document.body.appendChild(palA)
    await flush()

    a.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    palA.setAttribute('open', '')
    expect(palA.hasAttribute('open')).toBe(true)
    b.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(palA.hasAttribute('open')).toBe(false)
  })
})

/**
 * Each `<boceto-inspector>` mounts a panel in `document.body`. Find it via
 * the `data-boceto-panel="root"` marker that's unique to each instance.
 * Returns the root div whose visibility we toggle via `display: flex|none`.
 */
function panelOf(host: HTMLElement): HTMLDivElement {
  // The host's panel is the most recently appended root that's a sibling
  // of the host. Walk document.body's children and pair them in order.
  // For tests we keep it simpler: find ALL panels, and pick by index.
  const panels = document.querySelectorAll<HTMLDivElement>('[data-boceto-panel="root"]')
  const hosts = document.querySelectorAll<HTMLElement>('boceto-inspector')
  const idx = [...hosts].indexOf(host)
  if (idx < 0 || idx >= panels.length) throw new Error('no panel for host')
  return panels[idx]!
}
