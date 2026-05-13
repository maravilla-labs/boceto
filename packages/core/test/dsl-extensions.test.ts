import { describe, expect, it } from 'vitest'
import { parse, serialize, BocetoParseError } from '../src'

describe('Named IDs', () => {
  it('parses TYPE#ID shorthand', () => {
    const doc = parse('```boceto\nelement button#submit 0 0 100 30 "Save"\n```')
    expect(doc.pages[0]!.elements[0]!.id).toBe('submit')
    expect(doc.pages[0]!.elements[0]!.type).toBe('button')
  })

  it('parses id= attribute form', () => {
    const doc = parse(
      '```boceto\nelement table 0 0 300 200 "Users" "" id=user-table rows=5 cols=4\n```',
    )
    const el = doc.pages[0]!.elements[0]!
    expect(el.id).toBe('user-table')
    expect(el.attrs.rows).toBe(5)
    expect(el.attrs.cols).toBe(4)
    expect(el.attrs.id).toBeUndefined()
  })

  it('shorthand and matching id= attribute are accepted', () => {
    const doc = parse('```boceto\nelement button#same 0 0 100 30 "x" id=same\n```')
    expect(doc.pages[0]!.elements[0]!.id).toBe('same')
  })

  it('shorthand and id= attribute that disagree is a parse error', () => {
    expect(() =>
      parse('```boceto\nelement button#a 0 0 100 30 "x" id=b\n```'),
    ).toThrow(/Conflicting ids/)
  })

  it('rejects ids that aren\'t valid identifiers', () => {
    expect(() => parse('```boceto\nelement button#1bad 0 0 100 30 "x"\n```')).toThrow(
      BocetoParseError,
    )
  })

  it('serializer always emits TYPE#ID form regardless of input form', () => {
    const fromShorthand = serialize(parse('```boceto\nelement button#save 0 0 100 30 "Save"\n```'))
    const fromAttr = serialize(parse('```boceto\nelement button 0 0 100 30 "Save" id=save\n```'))
    expect(fromShorthand).toContain('element button#save')
    expect(fromShorthand).not.toContain('id=')
    expect(fromAttr).toContain('element button#save')
    expect(fromAttr).not.toContain('id=')
  })

  it('round-trip preserves named ids in shorthand form', () => {
    const src =
      '```boceto\nelement button#save 0 0 100 30 "Save"\nelement box#main 10 50 100 50 ""\n```'
    const doc = parse(src)
    const out = serialize(doc)
    const re = parse(out)
    expect(re.pages[0]!.elements[0]!.id).toBe('save')
    expect(re.pages[0]!.elements[1]!.id).toBe('main')
    expect(out).toContain('element button#save')
    expect(out).toContain('element box#main')
  })

  it('arrows can reference named ids', () => {
    const src = [
      '```boceto',
      'element button#a 0 0 100 30 "A"',
      'element box#b 10 50 100 50 ""',
      'arrow a b "click"',
      '```',
    ].join('\n')
    const doc = parse(src)
    expect(doc.pages[0]!.arrows[0]).toMatchObject({ from: 'a', to: 'b', label: 'click' })
  })
})

describe('Layout primitives (row / col / end)', () => {
  it('row places children left-to-right with gap', () => {
    const src = [
      '```boceto',
      'row 100 50 600 60 gap=10 align=middle',
      '  element button 0 0 100 36 "A"',
      '  element button 0 0 100 36 "B"',
      '  element button 0 0 100 36 "C"',
      'end',
      '```',
    ].join('\n')
    const els = parse(src).pages[0]!.elements
    expect(els.map((e) => e.x)).toEqual([100, 210, 320])
    expect(els.map((e) => e.y)).toEqual([62, 62, 62])
  })

  it('row align=start aligns children to top', () => {
    const src = [
      '```boceto',
      'row 0 100 300 80 align=start',
      '  element button 0 0 100 36 "A"',
      'end',
      '```',
    ].join('\n')
    expect(parse(src).pages[0]!.elements[0]!.y).toBe(100)
  })

  it('row align=end aligns children to bottom', () => {
    const src = [
      '```boceto',
      'row 0 0 300 80 align=end',
      '  element button 0 0 100 36 "A"',
      'end',
      '```',
    ].join('\n')
    expect(parse(src).pages[0]!.elements[0]!.y).toBe(44)
  })

  it('col places children top-to-bottom', () => {
    const src = [
      '```boceto',
      'col 200 50 220 400 gap=8',
      '  element card 0 0 200 80 "User"',
      '  element card 0 0 200 80 "Stats"',
      'end',
      '```',
    ].join('\n')
    const els = parse(src).pages[0]!.elements
    expect(els.map((e) => e.y)).toEqual([50, 138])
    expect(els.map((e) => e.x)).toEqual([200, 200])
  })

  it('col align=stretch overrides child width to container width', () => {
    const src = [
      '```boceto',
      'col 100 0 300 200 align=stretch',
      '  element card 0 0 50 80 "X"',
      'end',
      '```',
    ].join('\n')
    const el = parse(src).pages[0]!.elements[0]!
    expect(el.w).toBe(300)
    expect(el.x).toBe(100)
  })

  it('nested row inside col: parent stacks each placed inner child individually', () => {
    // When row/col nests, the inner block's placed children flow into the
    // parent's children array (one per element, not grouped). The parent
    // layout then arranges each individually. Consistent and easy to reason
    // about; a future "treat inner block as single unit" mode could be added.
    const src = [
      '```boceto',
      'col 0 0 600 300 gap=10',
      '  row 0 0 600 50 gap=5',
      '    element button 0 0 80 30 "A"',
      '    element button 0 0 80 30 "B"',
      '  end',
      '  row 0 0 600 50 gap=5',
      '    element button 0 0 80 30 "C"',
      '  end',
      'end',
      '```',
    ].join('\n')
    const els = parse(src).pages[0]!.elements
    expect(els).toHaveLength(3)
    expect(els.map((e) => e.y)).toEqual([0, 40, 80])
  })

  it('elements outside any layout still work', () => {
    const src = [
      '```boceto',
      'element navbar 0 0 600 44 "Top"',
      'row 0 60 600 40',
      '  element button 0 0 100 30 "A"',
      'end',
      'element box 0 120 600 100 "Footer"',
      '```',
    ].join('\n')
    const els = parse(src).pages[0]!.elements
    expect(els.map((e) => e.label)).toEqual(['Top', 'A', 'Footer'])
  })

  it('missing end is a parse error pointing at the unclosed block', () => {
    expect(() =>
      parse('```boceto\nrow 0 0 600 60\n  element button 0 0 100 30 "X"\n```'),
    ).toThrow(/Unclosed 'row'/)
  })

  it('extra end is a parse error', () => {
    expect(() => parse('```boceto\nelement box 0 0 100 50 ""\nend\n```')).toThrow(
      /'end' with no matching/,
    )
  })

  it('serializer flattens row/col children to plain element lines', () => {
    const src = [
      '```boceto',
      'row 0 0 300 40 gap=10',
      '  element button#a 0 0 100 30 "A"',
      '  element button#b 0 0 100 30 "B"',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    const out = serialize(doc)
    expect(out).not.toContain('row ')
    expect(out).not.toContain('end')
    expect(out).toContain('element button#a 0')
    expect(out).toContain('element button#b 110')
  })
})
