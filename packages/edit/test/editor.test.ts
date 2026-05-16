import { describe, expect, it, beforeAll } from 'vitest'
import { initYoga, parse, serialize } from '@boceto/core'
import { BocetoEditor } from '../src/editor'

beforeAll(async () => {
  await initYoga()
})

const SIMPLE = '```boceto\nelement box 0 0 100 50 "Hi"\n```'
const TWO_ELEMENTS = `\`\`\`boceto
element box 0 0 100 50 "First"
element button 200 100 80 32 "Two"
\`\`\``
const WITH_FLEX = `\`\`\`boceto
row 10 10 400 60 gap=8
  element button 0 0 80 32 "A"
  element button 0 0 80 32 "B"
end
\`\`\``
const WITH_COMPOSITE = `\`\`\`boceto
component mycard(t)
  element box 0 0 100 50 "$t"
end

element mycard 50 50 100 50 "" t="X"
\`\`\``

describe('BocetoEditor — basics', () => {
  it('parses initial code', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    expect(ed.doc.pages).toHaveLength(1)
    expect(ed.doc.pages[0]!.elements[0]!.label).toBe('Hi')
    expect(ed.canUndo).toBe(false)
  })

  it('lazy-serializes via the code getter', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    const out = ed.code
    expect(out).toContain('"Hi"')
  })

  it('setCode replaces the doc and clears history', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    const id = ed.doc.pages[0]!.elements[0]!.id
    ed.move([id], 10, 0)
    expect(ed.canUndo).toBe(true)
    ed.setCode(TWO_ELEMENTS)
    expect(ed.doc.pages[0]!.elements).toHaveLength(2)
    expect(ed.canUndo).toBe(false)
  })

  it('setCode does NOT fire change', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    let fired = 0
    ed.on('change', () => fired++)
    ed.setCode(TWO_ELEMENTS)
    expect(fired).toBe(0)
  })
})

describe('BocetoEditor — selection', () => {
  it('replaces selection by default', () => {
    const ed = new BocetoEditor({ code: TWO_ELEMENTS })
    const ids = ed.doc.pages[0]!.elements.map((e) => e.id)
    ed.select([ids[0]!])
    expect([...ed.selection]).toEqual([ids[0]])
    ed.select([ids[1]!])
    expect([...ed.selection]).toEqual([ids[1]])
  })

  it('add mode unions', () => {
    const ed = new BocetoEditor({ code: TWO_ELEMENTS })
    const ids = ed.doc.pages[0]!.elements.map((e) => e.id)
    ed.select([ids[0]!])
    ed.select([ids[1]!], 'add')
    expect(ed.selection.size).toBe(2)
  })

  it('toggle mode flips membership', () => {
    const ed = new BocetoEditor({ code: TWO_ELEMENTS })
    const ids = ed.doc.pages[0]!.elements.map((e) => e.id)
    ed.select([ids[0]!])
    ed.select([ids[0]!], 'toggle')
    expect(ed.selection.size).toBe(0)
  })

  it('emits select event with current ids', () => {
    const ed = new BocetoEditor({ code: TWO_ELEMENTS })
    const ids = ed.doc.pages[0]!.elements.map((e) => e.id)
    const seen: string[][] = []
    ed.on('select', ({ ids }) => seen.push(ids))
    ed.select([ids[0]!])
    ed.select([ids[1]!])
    expect(seen).toEqual([[ids[0]], [ids[1]]])
  })
})

describe('BocetoEditor — geometry rounding (round-trip safety)', () => {
  it('rounds fractional move deltas so the doc stays parser-valid', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    const id = ed.doc.pages[0]!.elements[0]!.id
    ed.move([id], 12.7062, 8.3137)
    const el = ed.doc.pages[0]!.elements[0]!
    expect(Number.isInteger(el.x)).toBe(true)
    expect(Number.isInteger(el.y)).toBe(true)
    expect(el.x).toBe(13)
    expect(el.y).toBe(8)
    // The serialized output must round-trip — this is what the companion
    // <boceto-view> on the demo page does for every commit.
    expect(() => parse(ed.code)).not.toThrow()
  })

  it('clamps moves below zero — DSL rejects negatives', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    const id = ed.doc.pages[0]!.elements[0]!.id
    ed.move([id], -999, -999)
    const el = ed.doc.pages[0]!.elements[0]!
    expect(el.x).toBe(0)
    expect(el.y).toBe(0)
    expect(() => parse(ed.code)).not.toThrow()
  })
})

describe('BocetoEditor — geometry', () => {
  it('move shifts top-level element x/y', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    const id = ed.doc.pages[0]!.elements[0]!.id
    ed.move([id], 25, 10)
    expect(ed.doc.pages[0]!.elements[0]!.x).toBe(25)
    expect(ed.doc.pages[0]!.elements[0]!.y).toBe(10)
  })

  it('move emits one change and one undo entry per default commit', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    let changes = 0
    ed.on('change', () => changes++)
    const id = ed.doc.pages[0]!.elements[0]!.id
    ed.move([id], 5, 0)
    ed.move([id], 5, 0)
    expect(changes).toBe(2)
    expect(ed.canUndo).toBe(true)
  })

  it('transactional drag coalesces N moves into 1 change + 1 history entry', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    let changes = 0
    ed.on('change', () => changes++)
    const id = ed.doc.pages[0]!.elements[0]!.id
    ed.beginTransaction()
    for (let i = 0; i < 10; i++) ed.move([id], 1, 0, { commit: false })
    ed.commitTransaction()
    expect(changes).toBe(1)
    expect(ed.doc.pages[0]!.elements[0]!.x).toBe(10)
    ed.undo()
    expect(ed.doc.pages[0]!.elements[0]!.x).toBe(0)
  })

  it('rejects move on nested items with an error event', () => {
    const ed = new BocetoEditor({ code: WITH_FLEX })
    const flex = ed.doc.pages[0]!.elements[0]!
    // Children of the row are nested — their first id should fail.
    const childIds = 'children' in flex ? (flex as { children: { id: string }[] }).children.map((c) => c.id) : []
    expect(childIds.length).toBeGreaterThan(0)
    const errs: string[] = []
    ed.on('error', (e) => errs.push(e.message))
    ed.move([childIds[0]!], 100, 0)
    expect(errs.length).toBe(1)
    expect(errs[0]).toMatch(/nested/i)
  })

  it('resize updates w/h based on the dragged edge', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    const id = ed.doc.pages[0]!.elements[0]!.id
    const origin = ed.boxOf(id)!
    ed.resize(id, 'se', 20, 10, origin)
    const el = ed.doc.pages[0]!.elements[0]!
    expect(el.w).toBe(120)
    expect(el.h).toBe(60)
  })
})

describe('BocetoEditor — doc shape', () => {
  it('addElement appends with a fresh id and emits change', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    let changes = 0
    ed.on('change', () => changes++)
    const id = ed.addElement('button', 200, 200, { label: 'Save' })
    expect(id).toMatch(/^p0e\d+$/)
    expect(changes).toBe(1)
    expect(ed.doc.pages[0]!.elements).toHaveLength(2)
  })

  it('removeItems drops top-level items + clears them from selection', () => {
    const ed = new BocetoEditor({ code: TWO_ELEMENTS })
    const ids = ed.doc.pages[0]!.elements.map((e) => e.id)
    ed.select(ids)
    ed.removeItems([ids[0]!])
    expect(ed.doc.pages[0]!.elements).toHaveLength(1)
    expect(ed.selection.has(ids[0]!)).toBe(false)
  })

  it('duplicateItems clones elements with offset and selects the clones', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    const id = ed.doc.pages[0]!.elements[0]!.id
    const created = ed.duplicateItems([id])
    expect(created).toHaveLength(1)
    expect(ed.doc.pages[0]!.elements).toHaveLength(2)
    expect([...ed.selection]).toEqual(created)
    const clone = ed.doc.pages[0]!.elements[1]!
    expect(clone.x).toBe(12)
    expect(clone.y).toBe(12)
  })
})

describe('BocetoEditor — history (serialize-snapshot)', () => {
  it('undo/redo restores prior doc state', () => {
    const ed = new BocetoEditor({ code: SIMPLE })
    const id = ed.doc.pages[0]!.elements[0]!.id
    ed.move([id], 50, 0)
    expect(ed.doc.pages[0]!.elements[0]!.x).toBe(50)
    ed.undo()
    expect(ed.doc.pages[0]!.elements[0]!.x).toBe(0)
    ed.redo()
    expect(ed.doc.pages[0]!.elements[0]!.x).toBe(50)
  })

  it('every commit produces a doc that round-trips through serialize/parse', () => {
    const ed = new BocetoEditor({ code: TWO_ELEMENTS })
    const id = ed.doc.pages[0]!.elements[0]!.id
    ed.move([id], 7, 13)
    const code = ed.code
    const reparsed = parse(code)
    expect(serialize(reparsed)).toBe(code)
  })
})

describe('BocetoEditor — z-order (reorder)', () => {
  const SCENE = `\`\`\`boceto
element box 0 0 100 50 "A"
element box 0 0 100 50 "B"
element box 0 0 100 50 "C"
element box 0 0 100 50 "D"
\`\`\``

  function labels(ed: BocetoEditor): string[] {
    return ed.doc.pages[0]!.elements.map((e) => (e as { label?: string }).label ?? '')
  }
  function idOf(ed: BocetoEditor, label: string): string {
    return ed.doc.pages[0]!.elements.find((e) => (e as { label?: string }).label === label)!.id
  }

  it('bringToFront moves selection to the end of the array (preserves relative order)', () => {
    const ed = new BocetoEditor({ code: SCENE })
    ed.bringToFront([idOf(ed, 'A'), idOf(ed, 'C')])
    expect(labels(ed)).toEqual(['B', 'D', 'A', 'C'])
  })

  it('sendToBack moves selection to the start of the array', () => {
    const ed = new BocetoEditor({ code: SCENE })
    ed.sendToBack([idOf(ed, 'B'), idOf(ed, 'D')])
    expect(labels(ed)).toEqual(['B', 'D', 'A', 'C'])
  })

  it('bringForward swaps one step toward the end', () => {
    const ed = new BocetoEditor({ code: SCENE })
    ed.bringForward([idOf(ed, 'B')])
    expect(labels(ed)).toEqual(['A', 'C', 'B', 'D'])
  })

  it('sendBackward swaps one step toward the start', () => {
    const ed = new BocetoEditor({ code: SCENE })
    ed.sendBackward([idOf(ed, 'C')])
    expect(labels(ed)).toEqual(['A', 'C', 'B', 'D'])
  })

  it('emits exactly one change event per reorder and records an undo entry', () => {
    const ed = new BocetoEditor({ code: SCENE })
    let changes = 0
    ed.on('change', () => changes++)
    ed.bringToFront([idOf(ed, 'A')])
    expect(changes).toBe(1)
    expect(ed.canUndo).toBe(true)
    ed.undo()
    expect(labels(ed)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('uses the current selection when no ids passed', () => {
    const ed = new BocetoEditor({ code: SCENE })
    ed.select([idOf(ed, 'B'), idOf(ed, 'C')])
    ed.bringToFront()
    expect(labels(ed)).toEqual(['A', 'D', 'B', 'C'])
  })

  it('is a no-op when selection is already at the extreme', () => {
    const ed = new BocetoEditor({ code: SCENE })
    let changes = 0
    ed.on('change', () => changes++)
    ed.bringToFront([idOf(ed, 'D')]) // D is already last
    expect(changes).toBe(0)
    expect(labels(ed)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('readonly mode suppresses reorder', () => {
    const ed = new BocetoEditor({ code: SCENE, readonly: true })
    ed.bringToFront([idOf(ed, 'A')])
    expect(labels(ed)).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('BocetoEditor — composites & flex containers as units', () => {
  it('moves a flex container as a whole', () => {
    const ed = new BocetoEditor({ code: WITH_FLEX })
    const flex = ed.doc.pages[0]!.elements[0]!
    const id = flex.id
    const x0 = flex.x
    ed.move([id], 40, 20)
    expect(ed.doc.pages[0]!.elements[0]!.x).toBe(x0 + 40)
  })

  it('moves a component instance as a whole', () => {
    const ed = new BocetoEditor({ code: WITH_COMPOSITE })
    const inst = ed.doc.pages[0]!.elements[0]!
    expect((inst as { kind?: string }).kind).toBe('component-instance')
    ed.move([inst.id], 25, 15)
    expect(ed.doc.pages[0]!.elements[0]!.x).toBe(75)
    expect(ed.doc.pages[0]!.elements[0]!.y).toBe(65)
  })
})

const BADGE_IMPORT = [
  '```boceto',
  'component badge-pill(label)',
  '  element badge 0 0 80 24 "$label"',
  'end',
  '```',
].join('\n')

describe('BocetoEditor — imports', () => {
  it('resolves a component defined only in imports', () => {
    const ed = new BocetoEditor({
      code: 'element badge-pill 0 0 80 24 "" label="New"',
      imports: BADGE_IMPORT,
    })
    const items = ed.doc.pages[0]!.elements
    expect(items).toHaveLength(1)
    expect((items[0] as { kind?: string }).kind).toBe('component-instance')
    expect(ed.imports).toBe(BADGE_IMPORT)
  })

  it('setImports re-parses the current code against the new registry', () => {
    // Start with valid code (no components needed), then swap to code + imports
    // that resolves a component. Verifies setImports + setCode interplay.
    const ed = new BocetoEditor({ code: 'element box 0 0 10 10 ""' })
    ed.setImports(BADGE_IMPORT)
    ed.setCode('element badge-pill 0 0 80 24 "" label="Hi"')
    const items = ed.doc.pages[0]!.elements
    expect(items).toHaveLength(1)
    expect((items[0] as { kind?: string }).kind).toBe('component-instance')
  })

  it('setImports is a no-op when value is unchanged', () => {
    const ed = new BocetoEditor({ code: SIMPLE, imports: BADGE_IMPORT })
    const docBefore = ed.doc
    ed.setImports(BADGE_IMPORT)
    expect(ed.doc).toBe(docBefore) // identity unchanged
  })

  it('setCode preserves imports (component still resolves after setCode)', () => {
    const ed = new BocetoEditor({ code: 'element box 0 0 10 10 ""', imports: BADGE_IMPORT })
    ed.setCode('element badge-pill 0 0 80 24 "" label="After"')
    const items = ed.doc.pages[0]!.elements
    expect(items).toHaveLength(1)
    expect((items[0] as { kind?: string }).kind).toBe('component-instance')
  })

  it('undo/redo still work after imports are set (snapshot restore honors imports)', () => {
    const ed = new BocetoEditor({
      code: 'element badge-pill 0 0 80 24 "" label="One"',
      imports: BADGE_IMPORT,
    })
    const firstInstId = ed.doc.pages[0]!.elements[0]!.id
    ed.move([firstInstId], 10, 0)
    expect(ed.canUndo).toBe(true)
    ed.undo()
    const items = ed.doc.pages[0]!.elements
    expect(items).toHaveLength(1)
    expect((items[0] as { kind?: string }).kind).toBe('component-instance')
  })
})
