import { describe, expect, it } from 'vitest'
import { parse, serialize, BocetoParseError, isComponentInstance, SvgRenderer } from '../src'

describe('Composite components — definition', () => {
  it('parses a component definition into doc.components', () => {
    const src = [
      '```boceto',
      'component user-card(name, role)',
      '  element card 0 0 240 80 ""',
      '  element heading 8 8 220 24 "$name"',
      '  element label 8 36 220 18 "$role"',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    expect(doc.components).toHaveLength(1)
    expect(doc.components[0]!.name).toBe('user-card')
    expect(doc.components[0]!.params).toEqual(['name', 'role'])
    expect(doc.components[0]!.body).toHaveLength(3)
  })

  it('a definitions-only block produces no Page', () => {
    const src = [
      '```boceto',
      'component foo()',
      '  element box 0 0 100 50 ""',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    expect(doc.pages).toHaveLength(1)
    expect(doc.pages[0]!.elements).toHaveLength(0) // default empty page
  })

  it('rejects nested component definitions', () => {
    const src = [
      '```boceto',
      'component outer()',
      '  component inner()',
      '    element box 0 0 10 10 ""',
      '  end',
      'end',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/Nested 'component'/)
  })

  it('rejects unclosed component block', () => {
    const src = [
      '```boceto',
      'component foo()',
      '  element box 0 0 100 50 ""',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/Unclosed 'component foo'/)
  })

  it('rejects duplicate component names', () => {
    const src = [
      '```boceto',
      'component foo()',
      '  element box 0 0 10 10 ""',
      'end',
      'component foo()',
      '  element box 0 0 20 20 ""',
      'end',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/Duplicate component definition: "foo"/)
  })

  it('rejects component name colliding with built-in element type', () => {
    const src = [
      '```boceto',
      'component button()',
      '  element box 0 0 10 10 ""',
      'end',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/collides with built-in/)
  })

  it('rejects duplicate params', () => {
    const src = '```boceto\ncomponent foo(name, name)\n  element box 0 0 10 10 ""\nend\n```'
    expect(() => parse(src)).toThrow(/duplicate param/)
  })
})

describe('Composite components — references and expansion', () => {
  const cardDef = [
    'component user-card(name, role)',
    '  element card 0 0 240 80 ""',
    '  element heading 8 8 220 24 "$name"',
    '  element label 8 36 220 18 "$role"',
    'end',
  ].join('\n')

  it('expands a reference into a ComponentInstance with substituted children', () => {
    const src = [
      '```boceto',
      cardDef,
      '```',
      '',
      '```boceto:Home',
      'element user-card 100 50 240 80 "" name="Jane Doe" role="Admin"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const item = doc.pages[0]!.elements[0]!
    expect(isComponentInstance(item)).toBe(true)
    if (!isComponentInstance(item)) return
    expect(item.componentName).toBe('user-card')
    expect(item.params).toEqual({ name: 'Jane Doe', role: 'Admin' })
    expect(item.expanded).toHaveLength(3)
    expect(item.expanded[1]!.label).toBe('Jane Doe')
    expect(item.expanded[2]!.label).toBe('Admin')
  })

  it('translates body coords by the instance position', () => {
    const src = [
      '```boceto',
      cardDef,
      '```',
      '',
      '```boceto:Home',
      'element user-card 100 50 240 80 "" name="X" role="Y"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const item = doc.pages[0]!.elements[0]
    if (!item || !isComponentInstance(item)) throw new Error('expected ComponentInstance')
    // Body card was at (0,0); should now be at (100,50)
    expect(item.expanded[0]!.x).toBe(100)
    expect(item.expanded[0]!.y).toBe(50)
    // Body heading was at (8,8); should now be at (108,58)
    expect(item.expanded[1]!.x).toBe(108)
    expect(item.expanded[1]!.y).toBe(58)
  })

  it('namespaces expanded child IDs by instance ID', () => {
    const src = [
      '```boceto',
      cardDef,
      '```',
      '',
      '```boceto:Home',
      'element user-card#alice 0   0 240 80 "" name="Alice" role="Admin"',
      'element user-card#bob   0 100 240 80 "" name="Bob"   role="User"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const [alice, bob] = doc.pages[0]!.elements
    if (!isComponentInstance(alice!) || !isComponentInstance(bob!)) {
      throw new Error('expected two ComponentInstances')
    }
    expect(alice.id).toBe('alice')
    expect(bob.id).toBe('bob')
    // Children should have unique namespaced IDs.
    const aliceIds = alice.expanded.map((e) => e.id)
    const bobIds = bob.expanded.map((e) => e.id)
    for (const a of aliceIds) for (const b of bobIds) expect(a).not.toBe(b)
    expect(aliceIds.every((id) => id.startsWith('alice.'))).toBe(true)
    expect(bobIds.every((id) => id.startsWith('bob.'))).toBe(true)
  })

  it('substitutes ${name} brace form', () => {
    const src = [
      '```boceto',
      'component greet(who)',
      '  element heading 0 0 200 28 "Hello, ${who}!"',
      'end',
      '```',
      '',
      '```boceto',
      'element greet 0 0 200 28 "" who="World"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const item = doc.pages[0]!.elements[0]!
    if (!isComponentInstance(item)) throw new Error('expected ComponentInstance')
    expect(item.expanded[0]!.label).toBe('Hello, World!')
  })

  it('substitutes inside attribute values', () => {
    const src = [
      '```boceto',
      'component bar(progress)',
      '  element progress 0 0 200 20 "" progress=$progress',
      'end',
      '```',
      '',
      '```boceto',
      'element bar 0 0 200 20 "" progress=42',
      '```',
    ].join('\n')
    const doc = parse(src)
    const item = doc.pages[0]!.elements[0]!
    if (!isComponentInstance(item)) throw new Error('expected ComponentInstance')
    // Attr substitution happens in string contexts; the substituted value
    // remains a string (attr stays string-typed after substitution).
    expect(item.expanded[0]!.attrs.progress).toBe('42')
  })

  it('unknown params substitute to empty string', () => {
    const src = [
      '```boceto',
      'component greet(name)',
      '  element heading 0 0 200 28 "Hi $missing"',
      'end',
      '```',
      '',
      '```boceto',
      'element greet 0 0 200 28 "" name="X"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const item = doc.pages[0]!.elements[0]!
    if (!isComponentInstance(item)) throw new Error('expected ComponentInstance')
    expect(item.expanded[0]!.label).toBe('Hi ')
  })

  it('forward references work (component defined after reference is parsed)', () => {
    // Components are collected doc-wide before pages are parsed, so a page
    // can reference a component defined in a later block.
    const src = [
      '```boceto:Home',
      'element foo 0 0 100 50 "" label="Hi"',
      '```',
      '',
      '```boceto',
      'component foo(label)',
      '  element box 0 0 100 50 "$label"',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    const item = doc.pages[0]!.elements[0]!
    expect(isComponentInstance(item)).toBe(true)
    if (!isComponentInstance(item)) return
    expect(item.expanded[0]!.label).toBe('Hi')
  })

  it('composite references can appear inside row/col blocks (first-class tree)', () => {
    const src = [
      '```boceto',
      'component foo()',
      '  element box 0 0 100 50 ""',
      'end',
      '```',
      '',
      '```boceto',
      'row 0 0 600 60',
      '  element foo 0 0 100 50 ""',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    const container = doc.pages[0]!.elements[0]!
    expect('kind' in container && container.kind === 'flex-container').toBe(true)
    // The container holds the composite instance directly — not flattened.
    if (!('kind' in container) || container.kind !== 'flex-container') {
      throw new Error('expected flex-container')
    }
    const child = container.children[0]!
    expect(isComponentInstance(child)).toBe(true)
  })

  it('composites can be nested inside other composites', () => {
    const src = [
      '```boceto',
      'component inner(name)',
      '  element label 0 0 200 24 "$name"',
      'end',
      '',
      'component outer(who)',
      '  element box 0 0 240 80 ""',
      '  element inner 8 30 200 24 "" name=$who',
      'end',
      '```',
      '',
      '```boceto',
      'element outer 0 0 240 80 "" who=Alice',
      '```',
    ].join('\n')
    const doc = parse(src)
    const instance = doc.pages[0]!.elements[0]!
    expect(isComponentInstance(instance)).toBe(true)
    if (!isComponentInstance(instance)) throw new Error()
    // outer.expanded preserves the nested `inner` reference as a
    // ComponentInstance shell — its own expanded subtree carries the
    // substituted label.
    const nested = instance.expanded.find((e) => isComponentInstance(e))
    expect(nested).toBeDefined()
    if (!nested || !isComponentInstance(nested)) throw new Error()
    expect(nested.componentName).toBe('inner')
    expect(nested.params.name).toBe('Alice')
    // The inner component's label, after $name substitution.
    const labels = nested.expanded
      .map((e) => ('label' in e ? e.label : ''))
      .filter(Boolean)
    expect(labels).toContain('Alice')
  })

  it('detects cyclic component references with a clear error', () => {
    const src = [
      '```boceto',
      'component a()',
      '  element b 0 0 10 10 ""',
      'end',
      'component b()',
      '  element a 0 0 10 10 ""',
      'end',
      '```',
      '',
      '```boceto',
      'element a 0 0 10 10 ""',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/Cyclic component reference/)
  })
})

describe('Slots — composite children', () => {
  it('anonymous slot fills with the call-site bare children', () => {
    const src = [
      '```boceto',
      'component Card(title) direction=col padding=8 gap=4',
      '  element heading 0 0 0 20 "$title"',
      '  slot',
      'end',
      '',
      'element Card 0 0 300 auto "" title="Hi" :',
      '  element label 0 0 0 16 "first"',
      '  element label 0 0 0 16 "second"',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    const inst = doc.pages[0]!.elements[0]! as unknown as { expanded: Array<{ label?: string }> }
    const labels = inst.expanded
      .map((e) => (typeof e.label === 'string' ? e.label : ''))
      .filter((s) => s !== '')
    expect(labels).toEqual(['Hi', 'first', 'second'])
  })

  it('named slots route children to the matching slot marker', () => {
    const src = [
      '```boceto',
      'component Card(title) direction=col padding=8 gap=4',
      '  slot header',
      '  element heading 0 0 0 20 "$title"',
      '  slot body',
      'end',
      '',
      'element Card 0 0 300 auto "" title="Mid" :',
      '  slot header',
      '    element label 0 0 0 16 "top"',
      '  end',
      '  slot body',
      '    element label 0 0 0 16 "bottom-1"',
      '    element label 0 0 0 16 "bottom-2"',
      '  end',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    const inst = doc.pages[0]!.elements[0]! as unknown as { expanded: Array<{ label?: string }> }
    const labels = inst.expanded
      .map((e) => (typeof e.label === 'string' ? e.label : ''))
      .filter((s) => s !== '')
    expect(labels).toEqual(['top', 'Mid', 'bottom-1', 'bottom-2'])
  })

  it('rejects call-site slot for a name the component does not declare', () => {
    const src = [
      '```boceto',
      'component Card() direction=col',
      '  slot body',
      'end',
      '',
      'element Card 0 0 300 auto "" :',
      '  slot header',
      '    element label 0 0 0 16 "x"',
      '  end',
      'end',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/no slot "header"/)
  })

  it('rejects bare children when component has no anonymous slot', () => {
    const src = [
      '```boceto',
      'component Card() direction=col',
      '  slot body',
      'end',
      '',
      'element Card 0 0 300 auto "" :',
      '  element label 0 0 0 16 "stray"',
      'end',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/no default slot/)
  })

  it('rejects duplicate slot blocks at the same call site', () => {
    const src = [
      '```boceto',
      'component Card() direction=col',
      '  slot header',
      'end',
      '',
      'element Card 0 0 300 auto "" :',
      '  slot header',
      '    element label 0 0 0 16 "one"',
      '  end',
      '  slot header',
      '    element label 0 0 0 16 "two"',
      '  end',
      'end',
      '```',
    ].join('\n')
    expect(() => parse(src)).toThrow(/Duplicate 'slot header'/)
  })

  it('built-in elements accept block-form children (element-as-container)', () => {
    const doc = parse(
      '```boceto\nelement box 0 0 200 80 "" :\n  element label 0 0 0 16 "inside"\nend\n```',
    )
    const item = doc.pages[0]!.elements[0]! as unknown as {
      type: string
      children?: Array<{ label?: string }>
    }
    expect(item.type).toBe('box')
    expect(item.children).toBeDefined()
    expect(item.children![0]!.label).toBe('inside')
  })

  it('reports unclosed composite call', () => {
    expect(() =>
      parse(
        '```boceto\ncomponent Card() direction=col\n  slot\nend\nelement Card 0 0 300 auto "" :\n  element label 0 0 0 16 "x"\n```',
      ),
    ).toThrow(/Unclosed composite call/)
  })

  it('round-trips: parse → serialize → parse preserves named slots', () => {
    const src = [
      '```boceto',
      'component Card(title) direction=col padding=8 gap=4',
      '  slot header',
      '  element heading 0 0 0 20 "$title"',
      '  slot body',
      'end',
      '',
      'element Card 0 0 300 auto "" title="X" :',
      '  slot header',
      '    element label 0 0 0 16 "top"',
      '  end',
      '  slot body',
      '    element label 0 0 0 16 "bottom"',
      '  end',
      'end',
      '```',
    ].join('\n')
    const doc = parse(src)
    const out = serialize(doc)
    expect(out).toContain('slot header')
    expect(out).toContain('slot body')
    // Re-parsing the serialized form succeeds and produces the same shape.
    const round = parse(out)
    const inst = round.pages[0]!.elements[0]! as unknown as {
      slots?: Record<string, Array<{ label?: string }>>
    }
    expect(inst.slots).toBeDefined()
    expect(inst.slots!.header!.length).toBe(1)
    expect(inst.slots!.body!.length).toBe(1)
  })
})

describe('Composite components — round-trip', () => {
  it('serializes definitions in a leading definitions-only block', () => {
    const src = [
      '```boceto',
      'component foo(x)',
      '  element box 0 0 100 50 "$x"',
      'end',
      '```',
      '',
      '```boceto:Home',
      'element foo 0 0 100 50 "" x="hi"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const out = serialize(doc)
    expect(out).toContain('component foo(x)')
    expect(out).toContain('element foo 0 0 100 50')
    // Reference uses `element foo` form, not the expanded children.
    expect(out.match(/element box/g)?.length ?? 0).toBe(1) // only the body
  })

  it('round-trip preserves both definition and references', () => {
    const src = [
      '```boceto',
      'component info-card(title, body)',
      '  element card 0 0 240 100 ""',
      '  element heading 8 8 220 24 "$title"',
      '  element label 8 36 220 18 "$body"',
      'end',
      '```',
      '',
      '```boceto:Home',
      'element info-card#first  0   0 240 100 "" title="One" body="First card"',
      'element info-card#second 0 110 240 100 "" title="Two" body="Second card"',
      '```',
    ].join('\n')
    const a = parse(src)
    const b = parse(serialize(a))
    expect(b.components).toHaveLength(1)
    expect(b.components[0]!.name).toBe('info-card')
    expect(b.pages[0]!.elements).toHaveLength(2)
    const [first, second] = b.pages[0]!.elements
    if (!isComponentInstance(first!) || !isComponentInstance(second!)) {
      throw new Error('expected two ComponentInstances')
    }
    expect(first.id).toBe('first')
    expect(first.params.title).toBe('One')
    expect(second.id).toBe('second')
    expect(second.params.body).toBe('Second card')
  })
})

describe('Composite components — renderer integration', () => {
  it('SVG output contains expanded children, not the component name', () => {
    const src = [
      '```boceto',
      'component greet(name)',
      '  element card 0 0 240 80 ""',
      '  element heading 8 8 220 24 "Hello $name"',
      'end',
      '```',
      '',
      '```boceto',
      'element greet 0 0 240 80 "" name="Jane"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const svg = new SvgRenderer().renderToString(doc, { width: 300, height: 100 })
    expect(svg).toContain('Hello Jane')
    expect(svg).toContain('<svg')
  })
})

describe('Composite components — error cases', () => {
  it('reference to undefined component still falls through to "Unknown element type"', () => {
    expect(() => parse('```boceto\nelement nope 0 0 100 50 ""\n```')).toThrow(
      BocetoParseError,
    )
  })
})
