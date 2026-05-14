import { describe, expect, it, beforeAll } from 'vitest'
import { initYoga, parse } from '@boceto/core'
import { lint } from '../src'

beforeAll(async () => {
  // Several rules check `parse()` on the fixed output; yoga isn't actually
  // needed for parse but bringing it up keeps the test env quiet.
  await initYoga()
})

describe('missing-label rule', () => {
  it('flags the missing label slot and auto-fixes with ""', () => {
    const src = 'element chart-bar 232 110 600 260'
    const r = lint(src)
    const missing = r.issues.find((i) => i.rule === 'missing-label')
    expect(missing).toBeDefined()
    expect(missing!.severity).toBe('error')
    expect(missing!.fix).toBeDefined()
    expect(r.fixed).toContain('260 ""')
    expect(() => parse(r.fixed, { raw: true })).not.toThrow()
  })

  it('preserves the original attrs after the inserted label', () => {
    const src = 'element table 0 0 320 180 headers="A|B|C"'
    const r = lint(src)
    expect(r.fixed).toContain('"" headers="A|B|C"')
  })

  it('does not fire when the label slot is already present', () => {
    const src = 'element button 0 0 100 36 "Save"'
    const r = lint(src)
    expect(r.issues.filter((i) => i.rule === 'missing-label')).toHaveLength(0)
  })
})

describe('invented-type rule', () => {
  it('flags Frame and auto-fixes to box', () => {
    const src = 'element Frame 0 0 200 100 ""'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'invented-type')
    expect(i).toBeDefined()
    expect(i!.severity).toBe('error')
    expect(i!.message).toContain('`box`')
    expect(r.fixed).toMatch(/^element box /)
  })

  it('flags icon-button and auto-fixes to button', () => {
    const src = 'element icon-button 0 0 32 32 ""'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'invented-type')
    expect(i).toBeDefined()
    expect(r.fixed).toMatch(/^element button /)
  })

  it('flags NavBar (capitalized) and auto-fixes to navbar', () => {
    const src = 'element NavBar 0 0 600 44 "MyApp"'
    const r = lint(src)
    expect(r.fixed).toMatch(/^element navbar /)
  })

  it('preserves the #id suffix when rewriting', () => {
    const src = 'element NavBar#topnav 0 0 600 44 "MyApp"'
    const r = lint(src)
    expect(r.fixed).toContain('navbar#topnav')
  })
})

describe('unknown-type rule', () => {
  it('warns on a type not in the canonical catalog', () => {
    const src = 'element widgetbox 0 0 100 50 "Hi"'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'unknown-type')
    expect(i).toBeDefined()
    expect(i!.severity).toBe('warning')
  })

  it('suggests the closest type when one is reasonably close', () => {
    const src = 'element progres 0 0 200 18 ""' // missing "s"
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'unknown-type')
    expect(i?.message).toContain('progress')
  })
})

describe('bad-coord rule', () => {
  it('rounds fractional coords', () => {
    const src = 'element box 460.7 0 100 50 "Hi"'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'bad-coord')
    expect(i).toBeDefined()
    expect(r.fixed).toContain('element box 461 0 100 50')
  })

  it('clamps negative coords to 0', () => {
    const src = 'element box -10 0 100 50 "Hi"'
    const r = lint(src)
    expect(r.fixed).toContain('element box 0 0 100 50')
  })

  it('allows auto in W/H slots on row/col', () => {
    const src = 'row 10 10 auto auto'
    const r = lint(src)
    expect(r.issues.filter((x) => x.rule === 'bad-coord')).toHaveLength(0)
  })
})

describe('align-vs-textAlign rule', () => {
  it('warns about align=center on an element and rewrites to textAlign=center', () => {
    const src = 'element heading 0 0 600 32 "Welcome" align=center'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'align-vs-textAlign')
    expect(i).toBeDefined()
    expect(r.fixed).toContain('textAlign=center')
    expect(r.fixed).not.toContain('align=center')
  })

  it('leaves align=middle (a valid flex value) alone', () => {
    const src = 'row 0 0 200 60 align=middle'
    const r = lint(src)
    expect(r.issues.filter((x) => x.rule === 'align-vs-textAlign')).toHaveLength(0)
  })
})

describe('unclosed-block rule', () => {
  it('flags a `row` without a matching `end`', () => {
    const src = ['row 0 0 200 60', '  element button 0 0 80 32 "Hi"'].join('\n')
    const r = lint(src)
    expect(r.issues.find((x) => x.rule === 'unclosed-block')).toBeDefined()
  })

  it('does not flag a balanced row/end pair', () => {
    const src = ['row 0 0 200 60', '  element button 0 0 80 32 "Hi"', 'end'].join('\n')
    const r = lint(src)
    expect(r.issues.filter((x) => x.rule === 'unclosed-block')).toHaveLength(0)
  })
})

describe('unterminated-string rule', () => {
  it('warns on a label missing its closing quote', () => {
    const src = 'element heading 100 80 400 28 "Hello, Boceto'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'unterminated-string')
    expect(i).toBeDefined()
    expect(i!.severity).toBe('warning')
    expect(i!.message).toMatch(/closed/i)
    // Autofix appends `"` so the source is well-formed.
    expect(r.fixed.endsWith('"')).toBe(true)
  })

  it('still warns even though the parser silently accepts it', () => {
    const src = 'element heading 100 80 400 28 "Hello, Boceto'
    // Confirm the parser is lenient — this should NOT throw.
    expect(() => parse(src, { raw: true })).not.toThrow()
    // But the linter complains anyway.
    const r = lint(src)
    expect(r.issues.find((x) => x.rule === 'unterminated-string')).toBeDefined()
  })

  it('does not fire on properly closed strings with embedded escapes', () => {
    const src = 'element heading 100 80 400 28 "Hello, \\"hi\\" Boceto"'
    const r = lint(src)
    expect(r.issues.filter((x) => x.rule === 'unterminated-string')).toHaveLength(0)
  })

  it('catches an unterminated embedded quote in a bare attr token', () => {
    const src = 'element box 0 0 100 50 "Hi" data-q="he said hi'
    const r = lint(src)
    expect(r.issues.find((x) => x.rule === 'unterminated-string')).toBeDefined()
  })
})

describe('character-offset precision', () => {
  it('invented-type points at just the type token, not the whole line', () => {
    const src = 'element Frame 0 0 200 100 ""'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'invented-type')!
    // "element " is 8 chars → "Frame" starts at column 9, ends at 14 (exclusive)
    expect(i.column).toBe(9)
    expect(i.endColumn).toBe(14)
  })

  it('underlines only the type portion when an #id suffix is present', () => {
    const src = 'element Frame#root 0 0 200 100 ""'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'invented-type')!
    expect(i.column).toBe(9)
    expect(i.endColumn).toBe(14) // exclusive end of "Frame"
    expect(r.fixed).toContain('element box#root ')
  })

  it('bad-coord pinpoints the offending coord token', () => {
    const src = 'element box 460.7 0 100 50 "Hi"'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'bad-coord')!
    // "element box " (12 chars) → "460.7" starts at column 13
    expect(i.column).toBe(13)
    expect(i.endColumn).toBe(13 + '460.7'.length)
  })

  it('missing-label uses a zero-width caret right after H', () => {
    const src = 'element chart-bar 0 0 600 260'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'missing-label')!
    expect(i.column).toBe(i.endColumn)
    expect(i.column).toBeGreaterThan('element chart-bar 0 0 600 '.length)
  })

  it('accounts for leading indentation in column numbers', () => {
    const src = '  element Frame 0 0 100 50 ""'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'invented-type')!
    // 2 indent + "element " (8) = column 11
    expect(i.column).toBe(11)
  })

  it('align-vs-textAlign underlines just the `align=center` attr', () => {
    const src = 'element heading 0 0 600 32 "Welcome" align=center'
    const r = lint(src)
    const i = r.issues.find((x) => x.rule === 'align-vs-textAlign')!
    const start = 'element heading 0 0 600 32 "Welcome" '.length
    expect(i.column).toBe(start + 1) // 1-based
    expect(i.endColumn).toBe(start + 1 + 'align=center'.length)
  })
})

describe('lint integration', () => {
  it('returns zero errors for a known-good mockup', () => {
    const src = [
      '```boceto:Login',
      'element navbar 0 0 600 44 "MyApp"',
      'element heading 100 90 400 32 "Welcome back"',
      'element input 100 140 400 36 "Email"',
      'element input 100 186 400 36 "Password"',
      'element primary-button 100 234 400 36 "Sign In"',
      '```',
    ].join('\n')
    const r = lint(src)
    expect(r.errorCount).toBe(0)
  })

  it('fixes a multi-issue input in one pass and reaches parse-clean state', () => {
    const src = [
      '```boceto',
      'element Frame 0 0 600 400', // invented-type + missing-label
      'element heading 100 90 400 32 "Hi" align=center', // align-vs-textAlign
      'element chart-bar 232 110 600 260', // missing-label
      'element box 460.7 0 100 50 "Hi"', // bad-coord
      '```',
    ].join('\n')
    const r = lint(src)
    expect(r.errorCount).toBeGreaterThan(0)
    expect(() => parse(r.fixed)).not.toThrow()
  })

  it('honors options.disable (rule id is element-arity, which covers missing-label / missing-coord / wrong-arity)', () => {
    const src = 'element chart-bar 0 0 600 260'
    const r = lint(src, { disable: ['element-arity'] })
    expect(r.issues.find((x) => x.rule === 'missing-label')).toBeUndefined()
  })

  it('reports missing-coord (not missing-label) when the 5th positional is a quoted label', () => {
    // The user dropped Y. With the empty-label fix the parser would
    // still complain because 22 isn't H — H would be the quoted string.
    const src = 'element label 100 400 22 "Edit me on the left."'
    const r = lint(src)
    const arity = r.issues.find((x) => x.rule === 'missing-coord')
    expect(arity).toBeDefined()
    expect(arity!.message).toMatch(/missing/i)
    // Must NOT propose the wrong fix (insert "")
    expect(r.issues.find((x) => x.rule === 'missing-label')).toBeUndefined()
    // Highlight should land on the quoted label, not the whole line.
    expect(arity!.column).toBeGreaterThan('element label 100 400 22 '.length)
  })

  it('maps parse-error line numbers from inside ```boceto fences back to the file line', () => {
    const src = [
      '```boceto',                                  // line 1 (fence opener)
      'element navbar 0 0 600 44 "X"',              // line 2
      'element heading 100 80 400 28 "Hi"',         // line 3
      'element label 100 400 22 "Edit" ""',         // line 4 — broken
      '```',                                        // line 5
    ].join('\n')
    const r = lint(src, { disable: ['element-arity'] })
    const pe = r.issues.find((x) => x.rule === 'parse-error')
    expect(pe).toBeDefined()
    expect(pe!.line).toBe(4) // not 3 (parser-relative)
  })

  it('surfaces parse-error as a final issue when rules left something broken', () => {
    // An unsupported element-as-container inside a `component` body
    const src = [
      'component my-card(title)',
      '  element card 0 0 200 100 "" :',
      '    element heading 0 0 100 24 "$title"',
      '  end',
      'end',
    ].join('\n')
    const r = lint(src)
    const pe = r.issues.find((x) => x.rule === 'parse-error')
    expect(pe).toBeDefined()
  })
})
