import { describe, expect, it } from 'vitest'
import { parse, isComponentInstance } from '../src'

const PRICING_CARD_DEF = [
  '```boceto',
  'component pricing-card(title, price)',
  '  element card 0 0 240 160 ""',
  '  element heading 8 8 220 28 "$title"',
  '  element heading 8 44 220 36 "$price"',
  'end',
  '```',
].join('\n')

const PRICING_CARD_USE = [
  '```boceto',
  'element pricing-card 0 0 240 160 "" title="Pro" price="$29/mo"',
  '```',
].join('\n')

const PRICING_CARD_RAW_DEF = [
  'component pricing-card(title, price)',
  '  element card 0 0 240 160 ""',
  '  element heading 8 8 220 28 "$title"',
  'end',
].join('\n')

describe('parse() — imports option', () => {
  it('resolves a component referenced in source but defined in imports', () => {
    const doc = parse(PRICING_CARD_USE, { imports: PRICING_CARD_DEF })
    expect(doc.pages).toHaveLength(1)
    const items = doc.pages[0]!.elements
    expect(items).toHaveLength(1)
    expect(isComponentInstance(items[0]!)).toBe(true)
    if (isComponentInstance(items[0]!)) {
      expect(items[0]!.componentName).toBe('pricing-card')
      expect(items[0]!.params).toEqual({ title: 'Pro', price: '$29/mo' })
    }
  })

  it('does not emit pages from import sources', () => {
    const usingDoc = [
      '```boceto',
      'element pricing-card 0 0 240 160 "" title="Free" price="$0"',
      '```',
    ].join('\n')
    // Imports include a definition fence AND a page fence; only the definition should
    // affect us, and we should not pick up the import's page.
    const importsWithPage = [
      PRICING_CARD_DEF,
      '',
      '```boceto:Imported Page',
      'element button 0 0 100 32 "should not appear"',
      '```',
    ].join('\n')
    const doc = parse(usingDoc, { imports: importsWithPage })
    expect(doc.pages).toHaveLength(1)
    expect(doc.pages[0]!.elements).toHaveLength(1)
    expect(doc.pages[0]!.name).not.toBe('Imported Page')
  })

  it('accepts raw DSL (no fence) in imports', () => {
    const doc = parse(PRICING_CARD_USE, { imports: PRICING_CARD_RAW_DEF })
    const items = doc.pages[0]!.elements
    expect(items).toHaveLength(1)
    expect(isComponentInstance(items[0]!)).toBe(true)
  })

  it('accepts an array of import sources', () => {
    const otherDef = [
      '```boceto',
      'component badge-pill(label)',
      '  element badge 0 0 80 24 "$label"',
      'end',
      '```',
    ].join('\n')
    const using = [
      '```boceto',
      'element pricing-card 0 0 240 160 "" title="Team" price="$99/mo"',
      'element badge-pill 260 0 80 24 "" label="New"',
      '```',
    ].join('\n')
    const doc = parse(using, { imports: [PRICING_CARD_DEF, otherDef] })
    const items = doc.pages[0]!.elements
    expect(items).toHaveLength(2)
    const names = items
      .filter(isComponentInstance)
      .map((i) => i.componentName)
      .sort()
    expect(names).toEqual(['badge-pill', 'pricing-card'])
  })

  it('source-defined components take precedence over imports of the same name', () => {
    const localDef = [
      '```boceto',
      'component pricing-card(title, price)',
      '  element card 0 0 999 999 "local"',
      'end',
      '```',
      '',
      '```boceto',
      'element pricing-card 0 0 240 160 "" title="X" price="$1"',
      '```',
    ].join('\n')
    // Imports also defines pricing-card; own wins silently. This is what makes
    // the TipTap broadcaster safe even if self-subtraction has a hiccup —
    // and what keeps undo/redo round-tripping correct when the editor's own
    // component definition serializes back into the snapshot.
    const doc = parse(localDef, { imports: PRICING_CARD_DEF })
    expect(doc.components).toHaveLength(1)
    expect(doc.components[0]!.name).toBe('pricing-card')
    // The "local" label distinguishes the own def from the import def.
    const card = doc.components[0]!.body.find(
      (b) => 'type' in b && b.type === 'card',
    ) as { label?: string } | undefined
    expect(card?.label).toBe('local')
  })

  it('is a no-op when raw mode is set (raw skips component pass)', () => {
    const doc = parse('element box 0 0 10 10 ""', {
      raw: true,
      imports: PRICING_CARD_DEF,
    })
    expect(doc.pages).toHaveLength(1)
    expect(doc.components).toHaveLength(0)
  })
})
