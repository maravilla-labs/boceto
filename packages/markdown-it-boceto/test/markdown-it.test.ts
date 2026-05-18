import { beforeAll, describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import { initYoga, LibraryCache, type FsAdapter, type GlobAdapter } from '@boceto/core'
import bocetoIt, { prewarmBocetoCache } from '../src'

const make = (opts?: Parameters<typeof bocetoIt>[1]) => new MarkdownIt().use(bocetoIt, opts)

function makeFs(files: Record<string, string>): { fs: FsAdapter; reads: string[] } {
  const reads: string[] = []
  return {
    reads,
    fs: {
      async readFile(p) {
        reads.push(p)
        const c = files[p]
        if (c == null) throw new Error(`ENOENT: ${p}`)
        return new TextEncoder().encode(c)
      },
    },
  }
}

const noGlob: GlobAdapter = async () => []

// SVG mode requires the Yoga WASM runtime; pre-init once.
beforeAll(async () => {
  await initYoga()
})

describe('markdown-it-boceto', () => {
  it('renders ```boceto fence as <boceto-view>', () => {
    const md = make()
    const out = md.render('```boceto\nelement box 0 0 100 50 "Hi"\n```\n')
    expect(out).toContain('<boceto-view')
    expect(out).toContain('element box 0 0 100 50')
  })

  it('escapes attribute content', () => {
    const md = make()
    const out = md.render('```boceto\nelement label 0 0 10 10 "<x>"\n```\n')
    expect(out).toContain('&lt;x&gt;')
  })

  it('passes meta info string as data-page', () => {
    const md = make()
    const out = md.render('```boceto Login\nelement box 0 0 10 10 ""\n```\n')
    expect(out).toContain('data-page="Login"')
  })

  it('honors custom tag option', () => {
    const md = make({ tag: 'boceto-edit' })
    const out = md.render('```boceto\nelement box 0 0 10 10 ""\n```\n')
    expect(out).toContain('<boceto-edit')
  })

  it('falls through to default fence for other languages', () => {
    const md = make()
    const out = md.render('```js\nconsole.log(1)\n```\n')
    expect(out).toContain('<pre>')
    expect(out).toContain('console.log')
  })

  it('honors custom render function', () => {
    const md = make({ render: () => '<div class="custom">ok</div>' })
    const out = md.render('```boceto\nelement box 0 0 10 10 ""\n```\n')
    expect(out).toContain('<div class="custom">ok</div>')
  })

  it('mode: svg inlines an SVG document', () => {
    const md = make({ mode: 'svg' })
    const out = md.render('```boceto Login\nelement button 0 0 100 30 "Sign In"\n```\n')
    expect(out).toContain('<svg ')
    expect(out).toContain('</svg>')
    expect(out).not.toContain('<boceto-view')
    expect(out).toContain('Sign In')
  })

  it('mode: svg respects width/height', () => {
    const md = make({ mode: 'svg', width: 400, height: 200 })
    const out = md.render('```boceto\nelement box 0 0 10 10 ""\n```\n')
    expect(out).toContain('viewBox="0 0 400 200"')
  })

  it('mode: svg is deterministic across calls', () => {
    const md = make({ mode: 'svg' })
    const src = '```boceto\nelement card 0 0 200 100 "Hi"\n```\n'
    expect(md.render(src)).toBe(md.render(src))
  })

  it('mode: svg auto-sizes to content (no clipping on oversize pages)', () => {
    // Issue #1 repro.
    const md = make({ mode: 'svg' })
    const src =
      '```boceto\nelement box 0 0 1200 800 ""\nelement label 900 780 280 16 "I am at the far right edge"\n```\n'
    const out = md.render(src)
    const m = /viewBox="0 0 (\d+) (\d+)"/.exec(out)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(1200)
    expect(Number(m![2])).toBeGreaterThanOrEqual(800)
    expect(out).toContain('I am at the far right edge')
  })

  it('mode: svg fit:"fixed" preserves clipping', () => {
    const md = make({ mode: 'svg', fit: 'fixed', width: 400, height: 200 })
    const src =
      '```boceto\nelement box 0 0 1200 800 ""\nelement label 1100 780 80 16 "clipped"\n```\n'
    expect(md.render(src)).toContain('viewBox="0 0 400 200"')
  })

  it('mode: svg width/height act as a min floor in fit:"content"', () => {
    const md = make({ mode: 'svg', width: 900, height: 700 })
    const src = '```boceto\nelement box 0 0 50 50 ""\n```\n'
    expect(md.render(src)).toContain('viewBox="0 0 900 700"')
  })

  it('mode: svg honors the padding option', () => {
    const md = make({ mode: 'svg', padding: 4 })
    const src = '```boceto\nelement box 0 0 100 100 ""\n```\n'
    expect(md.render(src)).toContain('viewBox="0 0 104 104"')
  })

  it('mode: svg per-fence fit=fixed overrides plugin fit:"content"', () => {
    const md = make({ mode: 'svg' })
    const src =
      '```boceto fit=fixed width=400 height=200\nelement box 0 0 1200 800 ""\n```\n'
    expect(md.render(src)).toContain('viewBox="0 0 400 200"')
  })

  it('mode: svg per-fence width overrides plugin width', () => {
    const md = make({ mode: 'svg', width: 400 })
    const src = '```boceto Login width=1280\nelement box 0 0 50 50 ""\n```\n'
    const out = md.render(src)
    const m = /viewBox="0 0 (\d+) (\d+)"/.exec(out)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBe(1280)
  })

  it('mode: svg unrecognized meta key falls through to page name', () => {
    const md = make({ mode: 'svg' })
    const src = '```boceto Page fubar=1\nelement box 0 0 50 50 ""\n```\n'
    const out = md.render(src)
    expect(out).toContain('<svg ')
    expect(out).toContain('</svg>')
  })

  it('mode: wc strips per-fence option tokens from data-page', () => {
    const md = make()
    const src = '```boceto Login width=1280 fit=content\nelement box 0 0 10 10 ""\n```\n'
    const out = md.render(src)
    expect(out).toContain('data-page="Login"')
    expect(out).not.toContain('width=1280')
  })
})

describe('markdown-it-boceto — cross-document', () => {
  it('shares components between sibling fences in the same source (svg)', () => {
    const md = make({ mode: 'svg' })
    const src = [
      '```boceto Defs',
      'component feature-card(title)',
      '  element card 0 0 240 140 ""',
      '  element heading 12 12 216 28 "$title"',
      'end',
      '```',
      '',
      '```boceto Page',
      'element feature-card 0 0 240 140 "" title="Hello"',
      '```',
      '',
    ].join('\n')
    const out = md.render(src)
    expect(out).toContain('Hello')
  })

  it('uses bocetoImportedComponents from env when set', async () => {
    const { fs } = makeFs({
      '/proj/lib.md': [
        '```boceto',
        'component pricing-card(title, price)',
        '  element card 0 0 240 160 ""',
        '  element heading 8 8 220 28 "$title"',
        '  element heading 8 44 220 36 "$price"',
        'end',
        '```',
      ].join('\n'),
    })
    const cache = new LibraryCache()
    const pageSrc = [
      '---',
      'boceto:',
      '  import: ./lib.md',
      '---',
      '',
      '```boceto',
      'element pricing-card 0 0 240 160 "" title="Pro" price="$29"',
      '```',
      '',
    ].join('\n')

    const { importedComponents, importedPaths } = await prewarmBocetoCache({
      filePath: '/proj/page.md',
      source: pageSrc,
      fs,
      glob: noGlob,
      cache,
      projectRoot: '/proj',
    })

    expect(importedPaths).toEqual(['/proj/lib.md'])
    expect(importedComponents.map((c) => c.name)).toEqual(['pricing-card'])

    const md = make({ mode: 'svg' })
    const out = md.render(pageSrc, { bocetoImportedComponents: importedComponents })
    expect(out).toContain('Pro')
    expect(out).toContain('$29')
  })

  it('falls back gracefully when env has no imported components', () => {
    // Page references an unknown component but has no env imports — parse throws,
    // surfaced as a thrown error. This documents that the plugin does NOT silently
    // hide missing-component errors when imports weren't prewarmed.
    const md = make({ mode: 'svg' })
    const src = [
      '```boceto',
      'element pricing-card 0 0 240 160 "" title="x" price="y"',
      '```',
      '',
    ].join('\n')
    // Parser reports unknown reference — could be "element type" or "component"
    // depending on the lookup path; either is fine — the point is we don't
    // silently produce empty output.
    expect(() => md.render(src)).toThrowError(/pricing-card/)
  })
})
