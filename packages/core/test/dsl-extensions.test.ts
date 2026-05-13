import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyFlexLayout,
  initYoga,
  isComponentInstance,
  isFlexContainer,
  parse,
  serialize,
  BocetoParseError,
} from '../src'
import type { ComponentInstance, Element, FlexContainer } from '../src'

beforeAll(async () => {
  await initYoga()
})

/**
 * Convenience: parse a fenced boceto source, apply Yoga layout, and return
 * the first page's items.
 */
function layoutPage(src: string) {
  return applyFlexLayout(parse(src)).pages[0]!.elements
}

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
  it('parses row/col into a first-class FlexContainer tree (no flattening)', () => {
    const src = [
      '```boceto',
      'row 100 50 600 60 gap=10 align=middle',
      '  element button 0 0 100 36 "A"',
      '  element button 0 0 100 36 "B"',
      'end',
      '```',
    ].join('\n')
    const items = parse(src).pages[0]!.elements
    expect(items).toHaveLength(1)
    const container = items[0]! as FlexContainer
    expect(container.kind).toBe('flex-container')
    expect(container.direction).toBe('row')
    expect(container.gap).toBe(10)
    expect(container.align).toBe('middle')
    expect(container.children).toHaveLength(2)
    expect((container.children[0] as Element).label).toBe('A')
  })

  it('row places children left-to-right with gap (Yoga-computed)', () => {
    const src = [
      '```boceto',
      'row 100 50 600 60 gap=10 align=middle',
      '  element button 0 0 100 36 "A"',
      '  element button 0 0 100 36 "B"',
      '  element button 0 0 100 36 "C"',
      'end',
      '```',
    ].join('\n')
    const container = layoutPage(src)[0]! as FlexContainer
    const xs = container.children.map((c) => (c as Element).computed!.x)
    const ys = container.children.map((c) => (c as Element).computed!.y)
    expect(xs).toEqual([100, 210, 320])
    expect(ys).toEqual([62, 62, 62])
  })

  it('row align=start aligns children to top', () => {
    const src = [
      '```boceto',
      'row 0 100 300 80 align=start',
      '  element button 0 0 100 36 "A"',
      'end',
      '```',
    ].join('\n')
    const container = layoutPage(src)[0]! as FlexContainer
    expect((container.children[0] as Element).computed!.y).toBe(100)
  })

  it('row align=end aligns children to bottom', () => {
    const src = [
      '```boceto',
      'row 0 0 300 80 align=end',
      '  element button 0 0 100 36 "A"',
      'end',
      '```',
    ].join('\n')
    const container = layoutPage(src)[0]! as FlexContainer
    expect((container.children[0] as Element).computed!.y).toBe(44)
  })

  it('col places children top-to-bottom with gap (Yoga-computed)', () => {
    const src = [
      '```boceto',
      'col 200 50 220 400 gap=8',
      '  element card 0 0 200 80 "User"',
      '  element card 0 0 200 80 "Stats"',
      'end',
      '```',
    ].join('\n')
    const container = layoutPage(src)[0]! as FlexContainer
    const ys = container.children.map((c) => (c as Element).computed!.y)
    const xs = container.children.map((c) => (c as Element).computed!.x)
    expect(ys).toEqual([50, 138])
    expect(xs).toEqual([200, 200])
  })

  it('col align=stretch stretches children that omit a cross-axis size', () => {
    // Yoga / CSS semantics: align-items=stretch only stretches when the child
    // has no explicit cross-axis size. Children with explicit `w` keep their
    // declared value (this is stricter than v0.1's parser-sugar `stretch`,
    // which always overrode w). Authors who want stretching now pass `w=0`
    // (or leave intrinsic sizing to Yoga).
    const src = [
      '```boceto',
      'col 100 0 300 200 align=stretch',
      '  element card 0 0 0 80 "X"',
      'end',
      '```',
    ].join('\n')
    const container = layoutPage(src)[0]! as FlexContainer
    const child = container.children[0] as Element
    expect(child.computed!.w).toBe(300)
    expect(child.computed!.x).toBe(100)
  })

  it('nested row inside col survives as a tree, gets recursive Yoga layout', () => {
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
    const outerItems = layoutPage(src)
    expect(outerItems).toHaveLength(1)
    const col = outerItems[0]! as FlexContainer
    expect(col.children).toHaveLength(2)
    const [row1, row2] = col.children as [FlexContainer, FlexContainer]
    expect(row1.computed!.y).toBe(0)
    expect(row2.computed!.y).toBe(60) // 0 + 50 + 10 gap
    expect((row1.children[0] as Element).computed!.x).toBe(0)
    expect((row1.children[1] as Element).computed!.x).toBe(85)
    expect((row2.children[0] as Element).computed!.x).toBe(0)
  })

  it('elements outside any layout coexist with containers', () => {
    const src = [
      '```boceto',
      'element navbar 0 0 600 44 "Top"',
      'row 0 60 600 40',
      '  element button 0 0 100 30 "A"',
      'end',
      'element box 0 120 600 100 "Footer"',
      '```',
    ].join('\n')
    const items = parse(src).pages[0]!.elements
    expect(items).toHaveLength(3)
    expect((items[0] as Element).label).toBe('Top')
    expect(isFlexContainer(items[1]!)).toBe(true)
    expect((items[2] as Element).label).toBe('Footer')
    // The container's child element is still nested.
    const row = items[1] as FlexContainer
    expect((row.children[0] as Element).label).toBe('A')
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

  it('serializer round-trips row/col containers (no flattening)', () => {
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
    expect(out).toContain('row 0 0 300 40 gap=10')
    expect(out).toContain('  element button#a')
    expect(out).toContain('  element button#b')
    expect(out).toContain('end')
    // Parse the serialized output and confirm shape is stable.
    const round = parse(out)
    const c = round.pages[0]!.elements[0]! as FlexContainer
    expect(c.kind).toBe('flex-container')
    expect(c.direction).toBe('row')
    expect(c.children).toHaveLength(2)
  })

  it('parses new flex attrs: justify, padding, wrap, min/max, auto', () => {
    const src = [
      '```boceto',
      'row 0 0 auto auto gap=8 padding=12 justify=between wrap=wrap min-w=200 max-w=600',
      '  element button 0 0 100 30 "A" grow=1 shrink=0 basis=120',
      'end',
      '```',
    ].join('\n')
    const c = parse(src).pages[0]!.elements[0]! as FlexContainer
    expect(c.w).toBe('auto')
    expect(c.h).toBe('auto')
    expect(c.padding).toBe(12)
    expect(c.justify).toBe('between')
    expect(c.wrap).toBe('wrap')
    expect(c.minW).toBe(200)
    expect(c.maxW).toBe(600)
    const child = c.children[0] as Element
    expect(child.grow).toBe(1)
    expect(child.shrink).toBe(0)
    expect(child.basis).toBe(120)
  })

  it('rejects unknown row/col attributes', () => {
    expect(() =>
      parse('```boceto\nrow 0 0 300 40 foo=1\n  element button 0 0 100 30 "X"\nend\n```'),
    ).toThrow(/Unknown 'row' attribute/)
  })

  it('rejects invalid justify enum value', () => {
    expect(() =>
      parse('```boceto\nrow 0 0 300 40 justify=spread\n  element button 0 0 100 30 "X"\nend\n```'),
    ).toThrow(/justify/)
  })

  it('grow distributes remaining space evenly across children', () => {
    const src = [
      '```boceto',
      'row 0 0 600 40 gap=0',
      '  element button 0 0 0 30 "A" grow=1',
      '  element button 0 0 0 30 "B" grow=1',
      'end',
      '```',
    ].join('\n')
    const c = layoutPage(src)[0]! as FlexContainer
    expect((c.children[0] as Element).computed!.w).toBe(300)
    expect((c.children[1] as Element).computed!.w).toBe(300)
  })

  it('wrap pushes overflowing children to a second line', () => {
    const src = [
      '```boceto',
      'row 0 0 200 200 gap=0 wrap=wrap align=start',
      '  element button 0 0 120 40 "A"',
      '  element button 0 0 120 40 "B"',
      '  element button 0 0 120 40 "C"',
      'end',
      '```',
    ].join('\n')
    const c = layoutPage(src)[0]! as FlexContainer
    const ys = c.children.map((ch) => (ch as Element).computed!.y)
    // First child on first line; second wraps to next line; third wraps further.
    expect(new Set(ys).size).toBeGreaterThan(1)
  })
})

describe('Element-as-container (block-form children on built-in elements)', () => {
  it('parses block-form `element box ... :` with children', () => {
    const src = [
      '```boceto',
      'element box 0 0 400 200 "" :',
      '  element label 0 0 0 16 "first"',
      '  element label 0 0 0 16 "second"',
      'end',
      '```',
    ].join('\n')
    const item = parse(src).pages[0]!.elements[0]! as Element
    expect(item.type).toBe('box')
    expect(item.children).toBeDefined()
    expect(item.children!).toHaveLength(2)
  })

  it('flex container mode: direction=col padding gap lay out children', () => {
    const src = [
      '```boceto',
      'element box 0 0 400 auto "" direction=col padding=12 gap=8 align=stretch :',
      '  element label 0 0 0 16 "row1"',
      '  element label 0 0 0 16 "row2"',
      'end',
      '```',
    ].join('\n')
    const item = layoutPage(src)[0]! as Element
    expect(item.computed!.w).toBe(400)
    const c1 = (item.children![0] as Element).computed!
    const c2 = (item.children![1] as Element).computed!
    expect(c1.x).toBe(12) // box.x=0 + padding=12
    expect(c1.y).toBe(12)
    expect(c2.x).toBe(12)
    expect(c2.y).toBe(36) // 12 padding + 16 height + 8 gap
    expect(c1.w).toBe(376) // 400 - 12 - 12
  })

  it('absolute body mode (no direction): children keep declared local x/y', () => {
    const src = [
      '```boceto',
      'element box 100 50 400 200 "" :',
      '  element label 12 12 0 16 "at-12-12"',
      '  element label 12 40 0 16 "at-12-40"',
      'end',
      '```',
    ].join('\n')
    const item = layoutPage(src)[0]! as Element
    const c1 = (item.children![0] as Element).computed!
    const c2 = (item.children![1] as Element).computed!
    // Children render at (box.x + child.x, box.y + child.y).
    expect(c1.x).toBe(112) // 100 + 12
    expect(c1.y).toBe(62) // 50 + 12
    expect(c2.x).toBe(112)
    expect(c2.y).toBe(90) // 50 + 40
  })

  it('modal chrome inset: title bar pushes children down 40px by default', () => {
    const src = [
      '```boceto',
      'element modal 0 0 400 auto "Confirm" direction=col padding=0 gap=0 align=stretch :',
      '  element label 0 0 0 18 "first"',
      'end',
      '```',
    ].join('\n')
    const item = layoutPage(src)[0]! as Element
    const first = (item.children![0] as Element).computed!
    // 0 author padding + 40 chrome inset on top
    expect(first.y).toBe(40)
  })

  it('rejects unclosed element block', () => {
    expect(() =>
      parse('```boceto\nelement box 0 0 200 80 "" :\n  element label 0 0 0 16 "x"\n```'),
    ).toThrow(/Unclosed 'element box' block/)
  })

  it('back-compat: built-in elements without `:` still parse as leaves', () => {
    const doc = parse('```boceto\nelement box 0 0 100 50 "label"\n```')
    const item = doc.pages[0]!.elements[0]! as Element
    expect(item.type).toBe('box')
    expect(item.children).toBeUndefined()
  })

  it('round-trips: parse → serialize → parse preserves children + flex attrs', () => {
    const src = [
      '```boceto',
      'element box 0 0 400 auto "" direction=col padding=12 gap=8 align=stretch :',
      '  element label 0 0 0 16 "row1"',
      '  element label 0 0 0 16 "row2"',
      'end',
      '```',
    ].join('\n')
    const out = serialize(parse(src))
    expect(out).toContain('element box')
    expect(out).toContain('direction=col')
    expect(out).toContain('padding=12')
    expect(out).toContain('gap=8')
    const round = parse(out)
    const item = round.pages[0]!.elements[0]! as Element
    expect(item.children).toBeDefined()
    expect(item.children!).toHaveLength(2)
    expect(item.direction).toBe('col')
    expect(item.padding).toBe(12)
  })

  it('Modal pattern: single element with children replaces the composite version', () => {
    const src = [
      '```boceto',
      'element modal 100 60 400 auto "Confirm action" direction=col padding=12 gap=12 align=stretch :',
      '  element label 0 0 0 18 "Are you sure?"',
      '  row 0 0 0 36 gap=8 justify=end',
      '    element button 0 0 100 32 "Cancel"',
      '    element primary-button 0 0 100 32 "Confirm"',
      '  end',
      'end',
      '```',
    ].join('\n')
    const item = layoutPage(src)[0]! as Element
    expect(item.type).toBe('modal')
    expect(item.computed!.x).toBe(100)
    expect(item.computed!.y).toBe(60)
    // First child (label) sits below the 40px chrome inset + 12px padding = y=112
    const label = (item.children![0] as Element).computed!
    expect(label.y).toBe(112) // 60 modal.y + 40 chrome + 12 padding
    expect(label.x).toBe(112) // 100 modal.x + 0 chrome left + 12 padding
  })
})

describe('Generic border + shadow attrs', () => {
  it('parses border attribute as a string or number', () => {
    const doc = parse('```boceto\nelement box 0 0 100 50 "" border=true shadow=8\n```')
    const el = doc.pages[0]!.elements[0]! as Element
    expect(el.attrs.border).toBe('true')
    expect(el.attrs.shadow).toBe(8)
  })

  it('serializes border/shadow attrs round-trip', () => {
    const src = '```boceto\nelement box 0 0 100 50 "" border=#ff0000 shadow=4\n```'
    const out = serialize(parse(src))
    expect(out).toContain('border=#ff0000')
    expect(out).toContain('shadow=4')
  })
})

describe('Responsive components (flex-shell + defaults)', () => {
  it('parses shell attrs + size defaults on the component header', () => {
    const src = [
      '```boceto',
      'component Panel(title) direction=col padding=12 gap=8 w=300 h=auto min-w=200 max-w=600',
      '  element heading 0 0 0 24 "$title"',
      '  element box 0 0 0 0 "" grow=1',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    const comp = doc.components[0]!
    expect(comp.shell).toBeDefined()
    expect(comp.shell!.direction).toBe('col')
    expect(comp.shell!.padding).toBe(12)
    expect(comp.shell!.gap).toBe(8)
    expect(comp.defaults).toBeDefined()
    expect(comp.defaults!.w).toBe(300)
    expect(comp.defaults!.h).toBe('auto')
    expect(comp.defaults!.minW).toBe(200)
    expect(comp.defaults!.maxW).toBe(600)
  })

  it('rejects unknown attrs on the component header', () => {
    const src = [
      '```boceto',
      'component Bad() direction=col foo=1',
      '  element box 0 0 10 10 ""',
      'end',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/Unknown 'component Bad' attribute/)
  })

  it('rejects invalid enum values on the component header', () => {
    const src = [
      '```boceto',
      'component Bad() direction=sideways',
      '  element box 0 0 10 10 ""',
      'end',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/direction/)
  })

  it('absolute-body components without shell still work (back-compat)', () => {
    const src = [
      '```boceto',
      'component Card(name)',
      '  element card 0 0 240 80 ""',
      '  element label 8 8 220 24 "$name"',
      'end',
      '',
      'element Card 100 50 240 80 "" name="Alice"',
      '```',
    ].join('\n')
    const doc = applyFlexLayout(parse(src))
    const inst = doc.pages[0]!.elements[0]! as ComponentInstance
    expect(inst.componentName).toBe('Card')
    // Body elements keep their declared (translated) coords; no shell rewrite.
    const label = inst.expanded.find(
      (e) => (e as Element).type === 'label',
    ) as Element
    expect(label.x).toBe(108) // 100 + 8
    expect(label.y).toBe(58)  // 50 + 8
    expect(label.label).toBe('Alice')
  })

  it('flex-shell panel: body lays out against the declared instance size', () => {
    const src = [
      '```boceto',
      // align=stretch makes children fill the cross-axis (matches CSS flexbox);
      // without it, children with w=0 stay at 0 along the col cross axis.
      'component Panel(title) direction=col align=stretch padding=10 gap=4',
      '  element heading 0 0 0 20 "$title"',
      '  element box 0 0 0 0 "" grow=1',
      'end',
      '',
      'element Panel 0 0 200 100 "" title="Stats"',
      '```',
    ].join('\n')
    const doc = applyFlexLayout(parse(src))
    const inst = doc.pages[0]!.elements[0]! as ComponentInstance
    expect(inst.computed!.w).toBe(200)
    expect(inst.computed!.h).toBe(100)
    const heading = inst.expanded[0] as Element
    const box = inst.expanded[1] as Element
    // Heading sits at the top of padding-12 = (10, 10), full inner width 180
    expect(heading.computed!.x).toBe(10)
    expect(heading.computed!.y).toBe(10)
    expect(heading.computed!.w).toBe(180)
    expect(heading.computed!.h).toBe(20)
    // Box fills remaining space below heading + gap
    expect(box.computed!.x).toBe(10)
    expect(box.computed!.y).toBe(34) // 10 + 20 + 4 gap
    expect(box.computed!.w).toBe(180)
    expect(box.computed!.h).toBe(56) // 100 - 10 top padding - 20 heading - 4 gap - 10 bottom padding
  })

  it('flex-shell panel inside a row resizes via grow=1', () => {
    const src = [
      '```boceto',
      'component Panel(title) direction=col align=stretch padding=8 gap=0',
      '  element heading 0 0 0 20 "$title"',
      '  element box 0 0 0 0 "" grow=1',
      'end',
      '',
      // align=stretch makes children fill the row's cross axis (height);
      // without it, the panel's h=auto would collapse to its content height.
      'row 0 0 600 100 gap=0 align=stretch',
      '  element box 0 0 200 100 ""',
      '  element Panel 0 0 auto auto "" grow=1 title="Main"',
      'end',
      '```',
    ].join('\n')
    const doc = applyFlexLayout(parse(src))
    const row = doc.pages[0]!.elements[0]! as FlexContainer
    const inst = row.children[1] as ComponentInstance
    // The panel slot is row.w - the fixed 200 box = 400, height = row.h = 100
    expect(inst.computed!.w).toBe(400)
    expect(inst.computed!.h).toBe(100)
    // Body adapts: inner width = 400 - 16 padding = 384
    const heading = inst.expanded[0] as Element
    expect(heading.computed!.w).toBe(384)
    expect(heading.computed!.x).toBe(208) // row.x=0 + box.w=200 + panel padding=8
  })

  it('flex-shell panel uses component defaults when call site says auto', () => {
    const src = [
      '```boceto',
      'component Panel(title) direction=col padding=4 gap=0 w=300 h=200 min-w=200',
      '  element heading 0 0 0 24 "$title"',
      '  element box 0 0 0 0 "" grow=1',
      'end',
      '',
      'element Panel 50 60 auto auto "" title="X"',
      '```',
    ].join('\n')
    const doc = applyFlexLayout(parse(src))
    const inst = doc.pages[0]!.elements[0]! as ComponentInstance
    expect(inst.w).toBe(300) // picked up from component default
    expect(inst.h).toBe(200)
    expect(inst.computed!.w).toBe(300)
    expect(inst.computed!.h).toBe(200)
  })

  it('call-site flex-child attrs override component defaults', () => {
    const src = [
      '```boceto',
      'component Panel(title) direction=col grow=0',
      '  element heading 0 0 0 24 "$title"',
      'end',
      '',
      'row 0 0 600 80 gap=0',
      '  element Panel 0 0 0 80 "" grow=1 title="A"',
      '  element Panel 0 0 0 80 "" grow=1 title="B"',
      'end',
      '```',
    ].join('\n')
    const doc = applyFlexLayout(parse(src))
    const row = doc.pages[0]!.elements[0]! as FlexContainer
    const a = row.children[0] as ComponentInstance
    const b = row.children[1] as ComponentInstance
    // Call-site grow=1 wins over default grow=0; each panel takes half the row
    expect(a.computed!.w).toBe(300)
    expect(b.computed!.w).toBe(300)
  })

  it('wrap-row grid: panels pack to min-w and wrap when row is narrow', () => {
    const src = [
      '```boceto',
      'component Panel(title) direction=col padding=4 gap=0 min-w=150',
      '  element heading 0 0 0 20 "$title"',
      '  element box 0 0 0 0 "" grow=1',
      'end',
      '',
      'row 0 0 400 auto gap=0 wrap=wrap align=start',
      '  element Panel 0 0 0 80 "" title="A"',
      '  element Panel 0 0 0 80 "" title="B"',
      '  element Panel 0 0 0 80 "" title="C"',
      'end',
      '```',
    ].join('\n')
    const doc = applyFlexLayout(parse(src))
    const row = doc.pages[0]!.elements[0]! as FlexContainer
    const ys = row.children.map((c) => (c as ComponentInstance).computed!.y)
    // 3 panels at min-w=150, 400px row → 2 fit per line, third wraps
    expect(new Set(ys).size).toBeGreaterThan(1)
  })

  it('round-trips shell + defaults on the component header', () => {
    const src = [
      '```boceto',
      'component Panel(title) direction=col padding=12 gap=8 w=300 h=auto min-w=200 max-w=600',
      '  element heading 0 0 0 24 "$title"',
      'end',
      '',
      'element Panel 0 0 auto auto "" grow=1 title="Hello"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const out = serialize(doc)
    expect(out).toContain('component Panel(title) direction=col padding=12 gap=8 w=300 h=auto min-w=200 max-w=600')
    expect(out).toContain('element Panel 0 0 auto auto "" grow=1 title=Hello')
    // Round-trip stable
    const round = parse(out)
    expect(round.components[0]!.shell!.direction).toBe('col')
    expect(round.components[0]!.defaults!.w).toBe(300)
    expect(round.components[0]!.defaults!.h).toBe('auto')
  })
})
