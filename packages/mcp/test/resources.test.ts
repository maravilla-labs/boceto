import { describe, expect, it } from 'vitest'

import {
  RESOURCES,
  findResource,
  readResource,
  resolveResourcePath,
} from '../src/resources'

describe('resources catalog', () => {
  it('exposes the 14 expected URIs', () => {
    expect(RESOURCES).toHaveLength(14)
    const uris = RESOURCES.map((r) => r.uri).sort()
    expect(uris).toEqual(
      [
        'boceto://skill/SKILL.md',
        'boceto://skill/references/grammar.md',
        'boceto://skill/references/layout.md',
        'boceto://skill/references/component-doc-pattern.md',
        'boceto://references/elements.md',
        'boceto://references/components.md',
        'boceto://recipes/index.md',
        'boceto://integrations/index.md',
        'boceto://integrations/tiptap-react.md',
        'boceto://integrations/web-components.md',
        'boceto://integrations/react.md',
        'boceto://integrations/react-markdown.md',
        'boceto://integrations/docs-site.md',
        'boceto://spec/boceto-spec.md',
      ].sort(),
    )
  })

  it('each resource resolves to non-empty markdown content', () => {
    for (const entry of RESOURCES) {
      const text = readResource(entry)
      expect(text.length).toBeGreaterThan(0)
      expect(entry.mimeType).toBe('text/markdown')
    }
  })

  it('each resource resolves to a file path that exists', () => {
    for (const entry of RESOURCES) {
      const p = resolveResourcePath(entry)
      expect(p.length).toBeGreaterThan(0)
    }
  })

  it('findResource returns the entry by URI', () => {
    const e = findResource('boceto://spec/boceto-spec.md')
    expect(e).toBeDefined()
    expect(e!.name).toMatch(/spec/i)
  })

  it('findResource returns the new recipes-index entry', () => {
    const e = findResource('boceto://recipes/index.md')
    expect(e).toBeDefined()
    expect(e!.description).toMatch(/recipes/i)
  })

  it('findResource resolves every integration recipe URI', () => {
    const slugs = [
      'index',
      'tiptap-react',
      'web-components',
      'react',
      'react-markdown',
      'docs-site',
    ]
    for (const slug of slugs) {
      const e = findResource(`boceto://integrations/${slug}.md`)
      expect(e, slug).toBeDefined()
      expect(e!.mimeType).toBe('text/markdown')
      // Resolves to a real file.
      const p = resolveResourcePath(e!)
      expect(p.length).toBeGreaterThan(0)
    }
  })

  it('findResource returns undefined for an unknown URI', () => {
    expect(findResource('boceto://nope')).toBeUndefined()
  })
})
