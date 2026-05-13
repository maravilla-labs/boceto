import { describe, expect, it } from 'vitest'
import { parse, SvgRenderer } from '../src'

const r = new SvgRenderer()

function svgFor(boceto: string): string {
  return r.renderToString(parse('```boceto\n' + boceto + '\n```'), { width: 800, height: 200 })
}

describe('navbar items=', () => {
  it('default navbar still shows Home/About/Contact', () => {
    const out = svgFor('element navbar 0 0 800 44 "MyApp"')
    expect(out).toContain('Home')
    expect(out).toContain('About')
    expect(out).toContain('Contact')
  })

  it('items= overrides the menu', () => {
    const out = svgFor('element navbar 0 0 800 44 "MyApp" items="Docs|API|Pricing"')
    expect(out).toContain('Docs')
    expect(out).toContain('API')
    expect(out).toContain('Pricing')
    expect(out).not.toContain('Home')
  })
})

describe('tabs active=', () => {
  it('default tabs has tab #0 active', () => {
    const out = svgFor('element tabs 0 0 400 80 "" tabNames="A|B|C"')
    // Active tab is bold, so font-weight="bold" appears once for "A".
    const aMatch = out.match(/<text[^>]*font-weight="bold"[^>]*>A<\/text>/)
    const bMatch = out.match(/<text[^>]*font-weight="bold"[^>]*>B<\/text>/)
    expect(aMatch).not.toBeNull()
    expect(bMatch).toBeNull()
  })

  it('active=2 makes the third tab bold', () => {
    const out = svgFor('element tabs 0 0 400 80 "" tabNames="A|B|C" active=2')
    const cMatch = out.match(/<text[^>]*font-weight="bold"[^>]*>C<\/text>/)
    expect(cMatch).not.toBeNull()
    const aMatch = out.match(/<text[^>]*font-weight="bold"[^>]*>A<\/text>/)
    expect(aMatch).toBeNull()
  })

  it('active out-of-range is clamped to last tab', () => {
    const out = svgFor('element tabs 0 0 400 80 "" tabNames="A|B|C" active=99')
    const cMatch = out.match(/<text[^>]*font-weight="bold"[^>]*>C<\/text>/)
    expect(cMatch).not.toBeNull()
  })
})

describe('table headers= and data=', () => {
  it('default table renders Col 1/Col 2/Col 3 headers and dummy cells', () => {
    const out = svgFor('element table 0 0 400 200 ""')
    expect(out).toContain('Col 1')
    expect(out).toContain('Col 2')
    expect(out).toContain('Col 3')
  })

  it('headers= replaces column titles', () => {
    const out = svgFor('element table 0 0 400 200 "" headers="Name|Email|Role"')
    expect(out).toContain('Name')
    expect(out).toContain('Email')
    expect(out).toContain('Role')
    expect(out).not.toContain('Col 1')
  })

  it('data= renders custom cell contents', () => {
    const out = svgFor(
      'element table 0 0 400 200 "" headers="Name|Email" data="Jane|jane@x;John|john@y"',
    )
    expect(out).toContain('Jane')
    expect(out).toContain('jane@x')
    expect(out).toContain('John')
    expect(out).toContain('john@y')
    // Default dummy markers should not appear.
    expect(out).not.toContain('● Item')
  })

  it('data= derives row count from semicolon-separated rows', () => {
    const out = svgFor(
      'element table 0 0 400 200 "" headers="A|B" data="r1a|r1b;r2a|r2b;r3a|r3b"',
    )
    expect(out).toContain('r3b')
  })
})

describe('pagination current= and total=', () => {
  it('default pagination has #2 active out of 10', () => {
    const out = svgFor('element pagination 0 0 400 30 ""')
    const m = out.match(/<text[^>]*font-weight="bold"[^>]*>2<\/text>/)
    expect(m).not.toBeNull()
  })

  it('current=4 active', () => {
    const out = svgFor('element pagination 0 0 400 30 "" current=4 total=20')
    const m = out.match(/<text[^>]*font-weight="bold"[^>]*>4<\/text>/)
    expect(m).not.toBeNull()
    // ‹ 1 … 3 4 5 … 20 ›
    expect(out).toContain('>20<')
    expect(out).toContain('>1<')
  })

  it('small total: shows all pages without ellipses', () => {
    const out = svgFor('element pagination 0 0 400 30 "" current=2 total=4')
    expect(out).toContain('>4<')
    // No ellipses for small ranges.
    expect(out).not.toContain('…')
  })

  it('current clamps to total', () => {
    const out = svgFor('element pagination 0 0 400 30 "" current=99 total=10')
    const m = out.match(/<text[^>]*font-weight="bold"[^>]*>10<\/text>/)
    expect(m).not.toBeNull()
  })
})
