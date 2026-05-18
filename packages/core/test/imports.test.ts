import { describe, expect, it, vi } from 'vitest'
import {
  BocetoImportError,
  LibraryCache,
  extractFrontmatter,
  isComponentInstance,
  parse,
  resolveBocetoImports,
  stripFrontmatter,
  type FsAdapter,
  type GlobAdapter,
} from '../src'

// ─────────────────────────────────────────────────────────────────────────────
// In-memory fs / glob doubles
// ─────────────────────────────────────────────────────────────────────────────

function makeFs(files: Record<string, string>): { fs: FsAdapter; reads: string[] } {
  const reads: string[] = []
  const fs: FsAdapter = {
    async readFile(absPath) {
      reads.push(absPath)
      const content = files[absPath]
      if (content == null) throw new Error(`ENOENT: ${absPath}`)
      return new TextEncoder().encode(content)
    },
  }
  return { fs, reads }
}

function makeGlob(files: Record<string, string>): GlobAdapter {
  // Tiny matcher: handles `*` (no `/`) within a single directory level. Good
  // enough for `./shared/*-component.md` style patterns the tests use.
  return async (pattern, { cwd }) => {
    const re = globToRegex(pattern)
    const hits: string[] = []
    for (const abs of Object.keys(files)) {
      const slashed = abs.replace(/\\/g, '/')
      const cwdSlashed = cwd.replace(/\\/g, '/').replace(/\/$/, '')
      if (!slashed.startsWith(cwdSlashed + '/')) continue
      const rel = slashed.slice(cwdSlashed.length + 1)
      if (re.test(rel) || re.test('./' + rel)) hits.push(rel)
    }
    return hits.sort()
  }
}

function globToRegex(p: string): RegExp {
  const escaped = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
  return new RegExp('^' + escaped + '$')
}

// ─────────────────────────────────────────────────────────────────────────────
// stripFrontmatter / extractFrontmatter
// ─────────────────────────────────────────────────────────────────────────────

describe('stripFrontmatter', () => {
  it('returns source unchanged when no frontmatter', () => {
    const src = 'element box 0 0 10 10 ""\n'
    expect(stripFrontmatter(src)).toBe(src)
  })

  it('strips a leading --- block', () => {
    const src = ['---', 'title: x', '---', 'element box 0 0 10 10 ""'].join('\n')
    expect(stripFrontmatter(src)).toBe('element box 0 0 10 10 ""')
  })

  it('keeps content when --- appears mid-document only', () => {
    const src = ['element box 0 0 10 10 ""', '---', 'element box 0 0 10 10 ""'].join('\n')
    expect(stripFrontmatter(src)).toBe(src)
  })

  it('handles CRLF line endings', () => {
    const src = '---\r\ntitle: x\r\n---\r\nelement box 0 0 10 10 ""'
    expect(stripFrontmatter(src)).toBe('element box 0 0 10 10 ""')
  })
})

describe('extractFrontmatter — boceto.import', () => {
  it('reads a block-list import', () => {
    const src = [
      '---',
      'title: Page',
      'boceto:',
      '  import:',
      '    - ./a.md',
      '    - ./b.md',
      '---',
      'body',
    ].join('\n')
    const { meta, body } = extractFrontmatter(src)
    expect(meta.boceto?.import).toEqual(['./a.md', './b.md'])
    expect(body).toBe('body')
  })

  it('reads a flow-list import', () => {
    const src = ['---', 'boceto:', '  import: [./a.md, "./b.md"]', '---', ''].join('\n')
    const { meta } = extractFrontmatter(src)
    expect(meta.boceto?.import).toEqual(['./a.md', './b.md'])
  })

  it('reads a single-string import', () => {
    const src = ['---', 'boceto:', '  import: ./only.md', '---', ''].join('\n')
    const { meta } = extractFrontmatter(src)
    expect(meta.boceto?.import).toBe('./only.md')
  })

  it('ignores comments and unrelated keys', () => {
    const src = [
      '---',
      'title: hello # not an import',
      'boceto:',
      '  # comment',
      '  import:',
      '    - ./a.md  # trailing',
      'unused: value',
      '---',
      '',
    ].join('\n')
    const { meta } = extractFrontmatter(src)
    expect(meta.boceto?.import).toEqual(['./a.md'])
  })

  it('returns empty meta when there is no frontmatter', () => {
    const { meta, body } = extractFrontmatter('element box 0 0 10 10 ""')
    expect(meta).toEqual({})
    expect(body).toBe('element box 0 0 10 10 ""')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolveBocetoImports
// ─────────────────────────────────────────────────────────────────────────────

const LIB_FEATURE_CARD = [
  '```boceto',
  'component feature-card(title, body)',
  '  element card 0 0 240 140 ""',
  '  element heading 12 12 216 28 "$title"',
  '  element label 12 50 216 60 "$body"',
  'end',
  '```',
].join('\n')

const LIB_BADGE = [
  '```boceto',
  'component badge-pill(label)',
  '  element badge 0 0 80 24 "$label"',
  'end',
  '```',
].join('\n')

describe('resolveBocetoImports — basics', () => {
  it('resolves a single relative import and parse() uses it', async () => {
    const files = {
      '/proj/lib.md': LIB_FEATURE_CARD,
    }
    const { fs } = makeFs(files)
    const cache = new LibraryCache()

    const pageSource = [
      '---',
      'boceto:',
      '  import: ./lib.md',
      '---',
      '',
      '```boceto',
      'element feature-card 0 0 240 140 "" title="Fast" body="Boom"',
      '```',
    ].join('\n')

    const { importedComponents, importedPaths } = await resolveBocetoImports({
      filePath: '/proj/page.md',
      source: pageSource,
      fs,
      glob: makeGlob(files),
      cache,
    })

    expect(importedComponents.map((c) => c.name)).toEqual(['feature-card'])
    expect(importedPaths).toEqual(['/proj/lib.md'])

    const doc = parse(pageSource, { importedComponents })
    expect(doc.pages[0]!.elements).toHaveLength(1)
    expect(isComponentInstance(doc.pages[0]!.elements[0]!)).toBe(true)
  })

  it('expands globs against the importer directory', async () => {
    const files = {
      '/proj/comps/buttons-component.md': LIB_BADGE,
      '/proj/comps/cards-component.md': LIB_FEATURE_CARD,
      '/proj/comps/unrelated.md': '# not a component file',
    }
    const { fs } = makeFs(files)
    const cache = new LibraryCache()

    const pageSource = [
      '---',
      'boceto:',
      '  import:',
      '    - ./comps/*-component.md',
      '---',
      '',
      '```boceto',
      'element feature-card 0 0 240 140 "" title="x" body="y"',
      'element badge-pill 260 0 80 24 "" label="New"',
      '```',
    ].join('\n')

    const { importedComponents } = await resolveBocetoImports({
      filePath: '/proj/page.md',
      source: pageSource,
      fs,
      glob: makeGlob(files),
      cache,
      projectRoot: '/proj',
    })
    expect(importedComponents.map((c) => c.name).sort()).toEqual([
      'badge-pill',
      'feature-card',
    ])
  })

  it('errors when two imports define the same component', async () => {
    const files = {
      '/proj/a.md': LIB_FEATURE_CARD,
      '/proj/b.md': LIB_FEATURE_CARD, // dup
    }
    const { fs } = makeFs(files)
    const cache = new LibraryCache()

    const pageSource = [
      '---',
      'boceto:',
      '  import:',
      '    - ./a.md',
      '    - ./b.md',
      '---',
      '',
    ].join('\n')

    await expect(
      resolveBocetoImports({
        filePath: '/proj/page.md',
        source: pageSource,
        fs,
        glob: makeGlob(files),
        cache,
      }),
    ).rejects.toBeInstanceOf(BocetoImportError)
  })

  it('handles transitive imports and cycles', async () => {
    const files = {
      '/proj/a.md': [
        '---',
        'boceto:',
        '  import: ./b.md',
        '---',
        '',
        LIB_FEATURE_CARD,
      ].join('\n'),
      '/proj/b.md': [
        '---',
        'boceto:',
        '  import: ./a.md', // cycle
        '---',
        '',
        LIB_BADGE,
      ].join('\n'),
    }
    const { fs } = makeFs(files)
    const cache = new LibraryCache()

    const pageSource = [
      '---',
      'boceto:',
      '  import: ./a.md',
      '---',
      '',
    ].join('\n')

    const { importedComponents } = await resolveBocetoImports({
      filePath: '/proj/page.md',
      source: pageSource,
      fs,
      glob: makeGlob(files),
      cache,
    })
    // Both libs' components are visible, exactly once, with no infinite loop.
    expect(importedComponents.map((c) => c.name).sort()).toEqual([
      'badge-pill',
      'feature-card',
    ])
  })

  it('caches parsed libraries across calls', async () => {
    const files = { '/proj/lib.md': LIB_FEATURE_CARD }
    const { fs, reads } = makeFs(files)
    const cache = new LibraryCache()

    const pageSource = [
      '---',
      'boceto:',
      '  import: ./lib.md',
      '---',
      '',
    ].join('\n')

    await resolveBocetoImports({
      filePath: '/proj/page-a.md',
      source: pageSource,
      fs,
      glob: makeGlob(files),
      cache,
    })
    await resolveBocetoImports({
      filePath: '/proj/page-b.md',
      source: pageSource,
      fs,
      glob: makeGlob(files),
      cache,
    })

    expect(reads.filter((p) => p === '/proj/lib.md')).toHaveLength(1)
    expect(cache.size).toBe(1)
  })

  it('rejects paths that escape projectRoot', async () => {
    const files = { '/outside/lib.md': LIB_FEATURE_CARD }
    const { fs } = makeFs(files)
    const cache = new LibraryCache()

    const pageSource = [
      '---',
      'boceto:',
      '  import: ../outside/lib.md',
      '---',
      '',
    ].join('\n')

    await expect(
      resolveBocetoImports({
        filePath: '/proj/page.md',
        source: pageSource,
        fs,
        glob: makeGlob(files),
        cache,
        projectRoot: '/proj',
      }),
    ).rejects.toThrowError(/escapes projectRoot/)
  })

  it('returns empty when no boceto.import is declared', async () => {
    const files = {}
    const { fs } = makeFs(files)
    const cache = new LibraryCache()
    const out = await resolveBocetoImports({
      filePath: '/proj/page.md',
      source: '# just a doc, no frontmatter\n',
      fs,
      glob: makeGlob(files),
      cache,
    })
    expect(out.importedComponents).toEqual([])
    expect(out.importedPaths).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LibraryCache.invalidateDependents
// ─────────────────────────────────────────────────────────────────────────────

describe('LibraryCache.invalidateDependents', () => {
  it('drops the changed entry and any cached importer of it', async () => {
    const files = {
      '/proj/leaf.md': LIB_FEATURE_CARD,
      '/proj/mid.md': [
        '---',
        'boceto:',
        '  import: ./leaf.md',
        '---',
        '',
        LIB_BADGE,
      ].join('\n'),
    }
    const { fs } = makeFs(files)
    const cache = new LibraryCache()

    const pageSource = [
      '---',
      'boceto:',
      '  import: ./mid.md',
      '---',
      '',
    ].join('\n')

    await resolveBocetoImports({
      filePath: '/proj/page.md',
      source: pageSource,
      fs,
      glob: makeGlob(files),
      cache,
    })
    expect(cache.size).toBe(2)

    const dropped = cache.invalidateDependents('/proj/leaf.md')
    expect(dropped.sort()).toEqual(['/proj/leaf.md', '/proj/mid.md'])
    expect(cache.size).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parse() — importedComponents fast path
// ─────────────────────────────────────────────────────────────────────────────

describe('parse({ importedComponents })', () => {
  it('uses pre-parsed components without re-parsing', () => {
    const libDoc = parse(LIB_FEATURE_CARD)
    expect(libDoc.components).toHaveLength(1)

    const pageSrc = [
      '```boceto',
      'element feature-card 0 0 240 140 "" title="x" body="y"',
      '```',
    ].join('\n')
    const doc = parse(pageSrc, { importedComponents: libDoc.components })
    expect(doc.pages[0]!.elements).toHaveLength(1)
    expect(isComponentInstance(doc.pages[0]!.elements[0]!)).toBe(true)
  })

  it("own definitions still override an imported component's of the same name", () => {
    const libDoc = parse(LIB_FEATURE_CARD)
    const pageSrc = [
      '```boceto',
      'component feature-card(title, body)',
      '  element card 0 0 999 999 "local"',
      'end',
      '```',
      '',
      '```boceto',
      'element feature-card 0 0 240 140 "" title="x" body="y"',
      '```',
    ].join('\n')
    const doc = parse(pageSrc, { importedComponents: libDoc.components })
    const card = doc.components[0]!.body.find(
      (b) => 'type' in b && b.type === 'card',
    ) as { label?: string } | undefined
    expect(card?.label).toBe('local')
  })

  it('falls through cleanly when importedComponents is empty', () => {
    const doc = parse(LIB_FEATURE_CARD, { importedComponents: [] })
    expect(doc.components).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parse() — frontmatter on standalone .boceto sources
// ─────────────────────────────────────────────────────────────────────────────

describe('parse() — frontmatter handling', () => {
  it('strips frontmatter from a .boceto-style standalone source', () => {
    const src = [
      '---',
      'boceto:',
      '  import: ./lib.md',
      '---',
      'element box 0 0 100 50 "Hi"',
    ].join('\n')
    const doc = parse(src)
    expect(doc.pages).toHaveLength(1)
    expect(doc.pages[0]!.elements).toHaveLength(1)
    // The closing `---` of the frontmatter must not be treated as a page sep.
    expect(doc.pages[0]!.name).toBe('Page 1')
  })

  it('still respects --- page separators that appear after stripped frontmatter', () => {
    const src = [
      '---',
      'title: x',
      '---',
      'element box 0 0 10 10 ""',
      '--- Second',
      'element label 0 0 50 16 "Two"',
    ].join('\n')
    const doc = parse(src)
    expect(doc.pages.map((p) => p.name)).toEqual(['Page 1', 'Second'])
  })
})

// Vitest moduleMocker shake — keep the linter happy when no spies are used.
vi.useRealTimers()
