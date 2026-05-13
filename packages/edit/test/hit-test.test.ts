import { describe, expect, it, beforeAll } from 'vitest'
import { applyFlexLayout, initYoga, parse } from '@boceto/core'
import { hitTestTop, hitTestLeaf, hitHandle, selectionBox, itemsInRect } from '../src/editor'

beforeAll(async () => {
  await initYoga()
})

const SCENE = `\`\`\`boceto
element box 50 50 100 60 "First"
element button 200 200 80 32 "Two"
\`\`\``

const FLEX_SCENE = `\`\`\`boceto
row 10 10 400 60 gap=8
  element button 0 0 80 32 "A"
  element button 0 0 80 32 "B"
end
\`\`\``

describe('hitTestTop', () => {
  it('returns the topmost top-level item at the point', () => {
    const doc = parse(SCENE)
    applyFlexLayout(doc)
    const page = doc.pages[0]!
    const hit = hitTestTop(page, 60, 60)
    expect(hit?.id).toBe(page.elements[0]!.id)
    expect(hitTestTop(page, 210, 210)?.id).toBe(page.elements[1]!.id)
    expect(hitTestTop(page, 5, 5)).toBeNull()
  })

  it('walks z-order in reverse — later items beat earlier ones', () => {
    const doc = parse(
      '```boceto\nelement box 0 0 100 100 "A"\nelement box 0 0 100 100 "B"\n```',
    )
    applyFlexLayout(doc)
    const page = doc.pages[0]!
    expect(hitTestTop(page, 50, 50)?.label).toBe('B')
  })

  it('returns the flex container, not its children', () => {
    const doc = parse(FLEX_SCENE)
    applyFlexLayout(doc)
    const page = doc.pages[0]!
    const hit = hitTestTop(page, 30, 30)
    expect(hit?.id).toBe(page.elements[0]!.id) // the row container itself
  })
})

describe('hitTestLeaf', () => {
  it('descends into flex container children', () => {
    const doc = parse(FLEX_SCENE)
    applyFlexLayout(doc)
    const page = doc.pages[0]!
    // The first child of the row sits at the row's left edge (x=10 + padding=0).
    const hit = hitTestLeaf(page, 12, 30)
    expect(hit?.label).toBe('A')
  })
})

describe('hitHandle', () => {
  it('reports a handle when the point is near a corner', () => {
    const box = { x: 100, y: 100, w: 100, h: 50 }
    expect(hitHandle(box, 100, 100)?.edge).toBe('nw')
    expect(hitHandle(box, 200, 150)?.edge).toBe('se')
    expect(hitHandle(box, 150, 100)?.edge).toBe('n')
    expect(hitHandle(box, 200, 125)?.edge).toBe('e')
    expect(hitHandle(box, 130, 120)).toBeNull()
  })
})

describe('selectionBox + itemsInRect', () => {
  it('returns null when nothing is selected', () => {
    const doc = parse(SCENE)
    const page = doc.pages[0]!
    expect(selectionBox(page, new Set())).toBeNull()
  })

  it('unions multiple selected boxes', () => {
    const doc = parse(SCENE)
    applyFlexLayout(doc)
    const page = doc.pages[0]!
    const ids = page.elements.map((e) => e.id)
    const box = selectionBox(page, new Set(ids))!
    expect(box.x).toBe(50)
    expect(box.y).toBe(50)
    expect(box.x + box.w).toBe(280) // 200 + 80
    expect(box.y + box.h).toBe(232) // 200 + 32
  })

  it('itemsInRect returns ids whose bbox overlaps the rect', () => {
    const doc = parse(SCENE)
    applyFlexLayout(doc)
    const page = doc.pages[0]!
    const ids = itemsInRect(page, { x: 40, y: 40, w: 30, h: 30 })
    expect(ids).toEqual([page.elements[0]!.id])
    const both = itemsInRect(page, { x: 0, y: 0, w: 1000, h: 1000 })
    expect(both).toHaveLength(2)
  })
})
