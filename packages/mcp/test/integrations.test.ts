import { describe, expect, it } from 'vitest'
import { runListIntegrations, runReadIntegration } from '../src/tools/integrations'

describe('boceto_list_integrations', () => {
  it('returns at least 6 entries (index + 5 stack recipes)', () => {
    const r = runListIntegrations({})
    expect(r.total).toBeGreaterThanOrEqual(6)
    expect(r.integrations.length).toBe(r.total)
    for (const entry of r.integrations) {
      expect(entry.slug).toBeTruthy()
      expect(entry.title).toBeTruthy()
      expect(entry.summary).toBeTruthy()
      expect(['index', 'stack']).toContain(entry.kind)
    }
  })

  it('puts the `index` recipe first', () => {
    const r = runListIntegrations({})
    expect(r.integrations[0]!.slug).toBe('index')
    expect(r.integrations[0]!.kind).toBe('index')
  })

  it('includes each stack recipe at least once', () => {
    const slugs = runListIntegrations({}).integrations.map((i) => i.slug)
    expect(slugs).toContain('tiptap-react')
    expect(slugs).toContain('web-components')
    expect(slugs).toContain('react')
    expect(slugs).toContain('react-markdown')
    expect(slugs).toContain('docs-site')
  })
})

describe('boceto_read_integration', () => {
  it('returns ok:true with markdown body for a known slug', () => {
    const r = runReadIntegration({ slug: 'tiptap-react' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      // The tiptap recipe must reference the canonical exports it teaches.
      expect(r.body).toMatch(/BocetoBlock/)
      expect(r.body).toMatch(/BocetoContext/)
      expect(r.body).toMatch(/withReactNodeView/)
      expect(r.meta.slug).toBe('tiptap-react')
    }
  })

  it('web-components recipe references the define* helpers', () => {
    const r = runReadIntegration({ slug: 'web-components' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.body).toMatch(/defineBocetoEdit/)
      expect(r.body).toMatch(/defineBocetoComponents/)
    }
  })

  it('docs-site recipe references the docs-side plugins + LibraryCache', () => {
    const r = runReadIntegration({ slug: 'docs-site' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.body).toMatch(/@boceto\/remark/)
      expect(r.body).toMatch(/@boceto\/markdown-it/)
      expect(r.body).toMatch(/LibraryCache/)
      expect(r.body).toMatch(/prewarmBocetoCache/)
    }
  })

  it('react recipe references BocetoEditFull', () => {
    const r = runReadIntegration({ slug: 'react' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.body).toMatch(/BocetoEditFull/)
    }
  })

  it('react-markdown recipe references the plug-it-in trio', () => {
    const r = runReadIntegration({ slug: 'react-markdown' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.body).toMatch(/ReactMarkdown/)
      expect(r.body).toMatch(/remarkBoceto/)
      expect(r.body).toMatch(/rehypeRaw/)
      // The recipe must surface the new fallback option so agents know to
      // pass it in browser-side hosts that can't set `file.path`.
      expect(r.body).toMatch(/currentFilePath/)
    }
  })

  it('index recipe contains a decision table cross-linking to every slug', () => {
    const r = runReadIntegration({ slug: 'index' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      for (const slug of ['tiptap-react', 'web-components', 'react', 'docs-site']) {
        expect(r.body).toMatch(new RegExp(slug))
      }
    }
  })

  it('returns ok:false with a descriptive error for an unknown slug', () => {
    const r = runReadIntegration({ slug: 'does-not-exist' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/Unknown integration/)
      // The available list is included so the caller can self-correct.
      expect(r.error).toMatch(/Available:/)
    }
  })
})
