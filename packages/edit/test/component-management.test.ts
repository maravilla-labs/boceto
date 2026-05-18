import { describe, expect, it, beforeAll } from 'vitest'
import { initYoga, isComponentInstance, parse } from '@boceto/core'
import { BocetoEditor } from '../src/editor'
import { ComponentMutationError } from '../src/editor/components'

beforeAll(async () => {
  await initYoga()
})

const PAGE_WITH_COMPOSITE = [
  '```boceto',
  'component my-card(title)',
  '  element box 0 0 200 100 ""',
  '  element heading 8 8 184 24 "$title"',
  'end',
  '```',
  '',
  '```boceto:Page',
  'element my-card 50 50 200 100 "" title="Hello"',
  'element my-card 300 50 200 100 "" title="World"',
  '```',
].join('\n')

const IMPORTS_SRC = [
  '```boceto',
  'component shared-button(label)',
  '  element button 0 0 120 32 "$label"',
  'end',
  '```',
].join('\n')

// ─────────────────────────────────────────────────────────────────────────────
// Introspection
// ─────────────────────────────────────────────────────────────────────────────

describe('BocetoEditor.components()', () => {
  it('returns local components with correct instance counts', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    const list = ed.components()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      name: 'my-card',
      params: ['title'],
      origin: 'local',
      instanceCount: 2,
    })
  })

  it('reports zero-instance components (orphaned definitions stay discoverable)', () => {
    const src = [
      '```boceto',
      'component orphan(x)',
      '  element box 0 0 100 50 ""',
      'end',
      '```',
    ].join('\n')
    const ed = new BocetoEditor({ code: src })
    const list = ed.components()
    expect(list).toHaveLength(1)
    expect(list[0]!.instanceCount).toBe(0)
  })

  it('merges imported components and tags them as imported', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE, imports: IMPORTS_SRC })
    const list = ed.components()
    const names = list.map((c) => c.name).sort()
    expect(names).toEqual(['my-card', 'shared-button'])
    expect(list.find((c) => c.name === 'my-card')!.origin).toBe('local')
    expect(list.find((c) => c.name === 'shared-button')!.origin).toBe('imported')
  })

  it('local definitions shadow imports of the same name', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    // Imports also defines my-card — local must win.
    ed.setImports(
      ['```boceto', 'component my-card(title)', '  element card 0 0 240 140 ""', 'end', '```'].join('\n'),
    )
    const list = ed.components()
    expect(list).toHaveLength(1)
    expect(list[0]!.origin).toBe('local')
  })

  it('tagImportOrigin surfaces hint on the matching imported entry', () => {
    const ed = new BocetoEditor({ code: '```boceto\n```', imports: IMPORTS_SRC })
    ed.tagImportOrigin('shared-button', 'block 2')
    const entry = ed.components().find((c) => c.name === 'shared-button')!
    expect(entry.hint).toBe('block 2')
    ed.tagImportOrigin('shared-button', undefined)
    expect(ed.components().find((c) => c.name === 'shared-button')!.hint).toBeUndefined()
  })
})

describe('BocetoEditor.instances()', () => {
  it('returns every ComponentInstance on the current page', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    expect(ed.instances()).toHaveLength(2)
    expect(ed.instances('my-card')).toHaveLength(2)
    expect(ed.instances('does-not-exist')).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe('createComponent', () => {
  it('appends a definition and round-trips through serialize', () => {
    const ed = new BocetoEditor({ code: '```boceto\n```' })
    ed.createComponent({ name: 'feature-card', params: ['title', 'body'] })
    const out = ed.code
    expect(out).toContain('component feature-card(title, body)')
    // Re-parse should produce one component with empty params lifted off.
    const re = parse(out)
    expect(re.components.map((c) => c.name)).toEqual(['feature-card'])
    expect(re.components[0]!.params).toEqual(['title', 'body'])
  })

  it('rejects names that collide with a built-in element type', () => {
    const ed = new BocetoEditor({ code: '```boceto\n```' })
    expect(() => ed.createComponent({ name: 'button' })).toThrowError(ComponentMutationError)
  })

  it('rejects duplicate names', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    expect(() => ed.createComponent({ name: 'my-card' })).toThrowError(ComponentMutationError)
  })

  it('does not auto-create an instance — orphaned definition stays in the panel', () => {
    const ed = new BocetoEditor({ code: '```boceto:Page\nelement box 0 0 10 10 ""\n```' })
    ed.createComponent({ name: 'foo' })
    expect(ed.instances()).toHaveLength(0)
    expect(ed.components().find((c) => c.name === 'foo')!.instanceCount).toBe(0)
  })
})

describe('deleteComponent', () => {
  it('refuses while instances exist', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    expect(() => ed.deleteComponent('my-card')).toThrowError(ComponentMutationError)
  })

  it('with deleteInstances:true removes the definition and every instance', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    expect(ed.instances()).toHaveLength(2)
    expect(ed.deleteComponent('my-card', { deleteInstances: true })).toBe(true)
    expect(ed.components()).toHaveLength(0)
    expect(ed.instances()).toHaveLength(0)
    // Source no longer carries the definition.
    expect(ed.code).not.toContain('component my-card')
  })

  it('returns false for unknown names', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    expect(ed.deleteComponent('does-not-exist')).toBe(false)
  })
})

describe('renameComponent', () => {
  it('updates the definition and every instance', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    expect(ed.renameComponent('my-card', 'card-v2')).toBe(true)
    expect(ed.components().map((c) => c.name)).toEqual(['card-v2'])
    expect(ed.instances().every((i) => i.componentName === 'card-v2')).toBe(true)
    // Round-trip.
    const re = parse(ed.code)
    expect(re.components[0]!.name).toBe('card-v2')
  })

  it('rejects renaming to a built-in element type', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    expect(() => ed.renameComponent('my-card', 'button')).toThrowError(ComponentMutationError)
  })

  it('rejects renaming to an existing component name', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.createComponent({ name: 'card-v2' })
    expect(() => ed.renameComponent('my-card', 'card-v2')).toThrowError(ComponentMutationError)
  })
})

describe('updateInstanceParams', () => {
  it('writes call-site params and re-serializes them', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    const inst = ed.instances()[0]!
    expect(inst.params.title).toBe('Hello')
    ed.updateInstanceParams(inst.id, { title: 'Updated Text' })
    expect(ed.code).toContain('title="Updated Text"')
  })

  it('clears entries whose value is empty', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    const inst = ed.instances()[0]!
    ed.updateInstanceParams(inst.id, { title: '' })
    // After re-parse, no `title="..."` for this instance.
    const re = parse(ed.code)
    const firstInst = re.pages
      .find((p) => p.name === 'Page')!
      .elements.filter(isComponentInstance)[0]!
    expect(firstInst.params.title).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// promoteToComponent
// ─────────────────────────────────────────────────────────────────────────────

describe('promoteToComponent', () => {
  it('lifts the selection into a new component + a single instance', () => {
    const src = [
      '```boceto:Page',
      'element box 50 50 200 100 ""',
      'element label 60 60 180 20 "Hello"',
      '```',
    ].join('\n')
    const ed = new BocetoEditor({ code: src })
    const ids = ed.currentPage.elements.map((e) => e.id)
    const result = ed.promoteToComponent({ ids, name: 'panel' })
    expect(result.componentName).toBe('panel')

    // The page now has exactly one item: the new instance.
    expect(ed.currentPage.elements).toHaveLength(1)
    expect(isComponentInstance(ed.currentPage.elements[0]!)).toBe(true)
    // The component definition exists with body coords translated to (0,0).
    const c = ed.doc.components.find((c) => c.name === 'panel')!
    expect(c.body).toHaveLength(2)
    expect((c.body[0] as { x: number; y: number }).x).toBe(0)
    expect((c.body[0] as { x: number; y: number }).y).toBe(0)
  })

  it('infers params from $ident tokens when none are supplied', () => {
    const src = [
      '```boceto:Page',
      'element heading 10 10 200 28 "$title"',
      'element label 10 50 200 20 "$body"',
      '```',
    ].join('\n')
    const ed = new BocetoEditor({ code: src })
    const ids = ed.currentPage.elements.map((e) => e.id)
    // `card` collides with a built-in element type — use `feature-card`.
    ed.promoteToComponent({ ids, name: 'feature-card' })
    const c = ed.doc.components.find((c) => c.name === 'feature-card')!
    expect(c.params).toEqual(['title', 'body'])
  })

  it('refuses ids that are not on the current page (nested or unknown)', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    // Trying to lift an item that lives inside another instance's expanded subtree.
    const insts = ed.instances()
    const inside = insts[0]!.expanded[0]!.id
    expect(() =>
      ed.promoteToComponent({ ids: [inside], name: 'will-fail' }),
    ).toThrowError(ComponentMutationError)
  })

  it('selects the new instance after promotion', () => {
    const src = [
      '```boceto:Page',
      'element box 50 50 200 100 ""',
      'element label 60 60 180 20 "Hi"',
      '```',
    ].join('\n')
    const ed = new BocetoEditor({ code: src })
    const ids = ed.currentPage.elements.map((e) => e.id)
    ed.promoteToComponent({ ids, name: 'panel' })
    expect(ed.selection.size).toBe(1)
    const selectedId = [...ed.selection][0]!
    const sel = ed.findItem(selectedId)!
    expect(isComponentInstance(sel)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Component edit mode
// ─────────────────────────────────────────────────────────────────────────────

describe('component edit mode', () => {
  it('routes mutations to the component body, not a page', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.setPage('Page')
    const pageElementsBefore = JSON.stringify(ed.doc.pages.find((p) => p.name === 'Page')!.elements)

    ed.enterComponentEditMode('my-card')
    expect(ed.editingComponent).toBe('my-card')

    // The current page is now the synthetic edit page.
    const editItems = ed.currentPage.elements
    expect(editItems).toHaveLength(2) // box + heading

    // Move the heading inside the body.
    const headingId = editItems[1]!.id
    ed.move([headingId], 10, 5)

    // The change landed on the component body, not on either real page.
    const c = ed.doc.components.find((c) => c.name === 'my-card')!
    expect((c.body[1] as { x: number; y: number }).x).toBe(18) // 8 + 10
    expect((c.body[1] as { x: number; y: number }).y).toBe(13) // 8 + 5

    // The actual page elements were NOT touched.
    const pageElementsAfter = JSON.stringify(ed.doc.pages.find((p) => p.name === 'Page')!.elements)
    expect(pageElementsAfter).toBe(pageElementsBefore)
  })

  it('the synthetic edit page never reaches serialize output', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.enterComponentEditMode('my-card')
    const out = ed.code
    expect(out).not.toContain('__edit__')
    expect(out).not.toContain('Editing:')
  })

  it('exits cleanly and the body mutation persists', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.enterComponentEditMode('my-card')
    const headingId = ed.currentPage.elements[1]!.id
    ed.move([headingId], 5, 0)
    ed.exitComponentEditMode()
    expect(ed.editingComponent).toBeNull()
    // Re-parse to confirm the mutation round-trips through source.
    const re = parse(ed.code)
    const heading = re.components[0]!.body[1] as { x: number }
    expect(heading.x).toBe(13)
  })

  it('refuses to delete the component currently being edited', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.enterComponentEditMode('my-card')
    expect(ed.deleteComponent('my-card', { deleteInstances: true })).toBe(false)
  })

  it('rename through edit mode keeps the editor pointed at the right body', () => {
    const ed = new BocetoEditor({ code: PAGE_WITH_COMPOSITE })
    ed.enterComponentEditMode('my-card')
    ed.renameComponent('my-card', 'card-v2')
    expect(ed.editingComponent).toBe('card-v2')
    // The synthetic page's items are still the body of (the renamed) card-v2.
    expect(ed.currentPage.elements).toHaveLength(2)
  })
})
