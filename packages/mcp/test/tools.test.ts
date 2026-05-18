import { describe, expect, it, beforeAll } from 'vitest'
import { initYoga, parse } from '@boceto/core'

import { runParse } from '../src/tools/parse'
import { runLint } from '../src/tools/lint'
import { runFix } from '../src/tools/fix'
import { runRenderSvg } from '../src/tools/render-svg'
import { runListElements } from '../src/tools/list-elements'
import { runDescribeElement } from '../src/tools/describe-element'
import { runListRecipes, runReadRecipe } from '../src/tools/recipes'

beforeAll(async () => {
  // Render uses Yoga; bring it up once so the first render test isn't slow.
  await initYoga()
})

describe('boceto_parse', () => {
  it('returns ok with a doc for valid source', () => {
    const r = runParse({ source: 'element button 0 0 120 36 "Save"' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.doc.pages.length).toBeGreaterThan(0)
    }
  })

  it('returns ok:false with a line number on a malformed source', () => {
    const r = runParse({ source: 'element' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.line).toBeGreaterThan(0)
      expect(r.error.message.length).toBeGreaterThan(0)
    }
  })

  it('resolves cross-doc components via the imports input', () => {
    const lib = [
      '```boceto',
      'component my-card(title)',
      '  element card 0 0 200 100 ""',
      '  element heading 8 8 184 24 "$title"',
      'end',
      '```',
    ].join('\n')
    const page = [
      '```boceto',
      'element my-card 0 0 200 100 "" title="X"',
      '```',
    ].join('\n')
    const withImports = runParse({ source: page, imports: lib })
    expect(withImports.ok).toBe(true)
    // Sanity: same source without imports still parses but the call site
    // would error on lookup (the parser raises during instance expansion).
    const without = runParse({ source: page })
    expect(without.ok).toBe(false)
  })
})

describe('boceto_lint', () => {
  it('reports invented-type + missing-label and returns a parse-clean fixed source', () => {
    const r = runLint({ source: 'element Frame 0 0 600 400' })
    expect(r.issues.length).toBeGreaterThanOrEqual(2)
    expect(r.issues.find((i) => i.rule === 'invented-type')).toBeDefined()
    expect(r.issues.find((i) => i.rule === 'missing-label')).toBeDefined()
    expect(r.errorCount).toBeGreaterThan(0)
    // The fixed source should parse cleanly.
    expect(() => parse(r.fixed)).not.toThrow()
  })

  it('honors options.disable', () => {
    const r = runLint({ source: 'element Frame 0 0 600 400', disable: ['invented-type'] })
    expect(r.issues.find((i) => i.rule === 'invented-type')).toBeUndefined()
  })

  it('threads imports through the parse cross-check', () => {
    const lib = [
      '```boceto',
      'component my-card(title)',
      '  element card 0 0 200 100 ""',
      '  element heading 8 8 184 24 "$title"',
      'end',
      '```',
    ].join('\n')
    const page = [
      '```boceto',
      'element my-card 0 0 200 100 "" title="X"',
      '```',
    ].join('\n')
    const r = runLint({ source: page, imports: lib })
    expect(r.issues.find((i) => i.rule === 'parse-error')).toBeUndefined()
    expect(r.errorCount).toBe(0)
  })
})

describe('boceto_fix', () => {
  it('returns the fixed source plus the issue list', () => {
    const r = runFix({ source: 'element Frame 0 0 600 400' })
    expect(r.fixed).toContain('element box ')
    expect(r.fixed).toContain('""')
    expect(r.issues.length).toBeGreaterThanOrEqual(2)
    expect(r.errorCount).toBeGreaterThan(0)
  })
})

describe('boceto_render_svg', () => {
  it('produces an SVG with content', async () => {
    const r = await runRenderSvg({
      source: ['element navbar 0 0 600 44 "MyApp"', 'element heading 100 90 400 32 "Welcome"'].join('\n'),
    })
    expect(r.svg.startsWith('<svg')).toBe(true)
    expect(r.svg).toContain('<text')
    expect(r.svg).toContain('Welcome')
    expect(r.width).toBe(860)
    expect(r.height).toBe(600)
  })

  it('grows the canvas with fit="content"', async () => {
    // A single element at x=0 y=0 w=200 h=80 + padding=16 → 216×96
    const r = await runRenderSvg({
      source: 'element box 0 0 200 80 ""',
      width: 100,
      height: 50,
      fit: 'content',
      padding: 16,
    })
    expect(r.width).toBeGreaterThanOrEqual(216)
    expect(r.height).toBeGreaterThanOrEqual(96)
  })

  it('throws on malformed source (so the MCP error path fires)', async () => {
    await expect(runRenderSvg({ source: 'element' })).rejects.toBeDefined()
  })
})

describe('boceto_list_elements', () => {
  it('returns categorised types and a non-zero total', () => {
    const r = runListElements({})
    expect(r.categories.length).toBeGreaterThan(0)
    expect(r.totalTypes).toBeGreaterThan(50)
    // Spot-check a known canonical type.
    const all = r.categories.flatMap((c) => c.types.map((t) => t.type))
    expect(all).toContain('navbar')
    expect(all).toContain('chart-bar')
  })
})

describe('boceto_describe_element', () => {
  it('describes a known element with attrs', () => {
    const r = runDescribeElement({ type: 'table' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.type).toBe('table')
      expect(r.category.length).toBeGreaterThan(0)
      expect(r.attrs.find((a) => a.key === 'headers')).toBeDefined()
    }
  })

  it('returns ok:false for an unknown type', () => {
    const r = runDescribeElement({ type: 'totally-fake-thing' })
    expect(r.ok).toBe(false)
  })
})

describe('boceto_list_recipes', () => {
  it('returns the full catalog with mockups + shells + index', () => {
    const r = runListRecipes({})
    expect(r.total).toBeGreaterThanOrEqual(20) // 10 mockups + 10 shells + index + composing-shells
    const slugs = r.recipes.map((m) => m.slug)
    // Known mockups
    expect(slugs).toContain('login')
    expect(slugs).toContain('dashboard')
    expect(slugs).toContain('chat')
    // Known shells
    expect(slugs).toContain('appshell')
    expect(slugs).toContain('dialog')
    expect(slugs).toContain('kanban-column')
    // Index
    expect(slugs).toContain('index')
  })

  it('marks recipes with the correct kind', () => {
    const r = runListRecipes({})
    const login = r.recipes.find((m) => m.slug === 'login')
    const appshell = r.recipes.find((m) => m.slug === 'appshell')
    const index = r.recipes.find((m) => m.slug === 'index')
    expect(login?.kind).toBe('mockup')
    expect(appshell?.kind).toBe('shell')
    expect(index?.kind).toBe('index')
  })

  it('every entry has title + summary', () => {
    const r = runListRecipes({})
    for (const m of r.recipes) {
      expect(m.title.length).toBeGreaterThan(0)
      expect(m.summary.length).toBeGreaterThan(0)
    }
  })
})

describe('boceto_read_recipe', () => {
  it('returns the full markdown body of a mockup', () => {
    const r = runReadRecipe({ slug: 'login' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.meta.slug).toBe('login')
      expect(r.meta.kind).toBe('mockup')
      // Body should contain the fenced ```boceto block.
      expect(r.body).toContain('```boceto')
      expect(r.body).toContain('element navbar')
    }
  })

  it('returns the full markdown body of a shell', () => {
    const r = runReadRecipe({ slug: 'dialog' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.meta.kind).toBe('shell')
      // The dialog recipe defines a component and shows a call site.
      expect(r.body).toContain('component dialog')
      expect(r.body).toContain('slot actions')
    }
  })

  it('returns ok:false with the available list when given an unknown slug', () => {
    const r = runReadRecipe({ slug: 'totally-fake-recipe' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      // The error should list available slugs so the agent can self-correct.
      expect(r.error).toMatch(/login/)
      expect(r.error).toMatch(/appshell/)
    }
  })
})
