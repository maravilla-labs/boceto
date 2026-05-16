import { describe, expect, it } from 'vitest'
import { remark } from 'remark'
import remarkHtml from 'remark-html'
import remarkBoceto from '../src'

async function render(md: string, opts?: Parameters<typeof remarkBoceto>[0]): Promise<string> {
  const file = await remark()
    .use(remarkBoceto, opts)
    .use(remarkHtml, { sanitize: false })
    .process(md)
  return String(file)
}

describe('remark-boceto', () => {
  it('replaces ```boceto blocks with <boceto-view>', async () => {
    const md = '```boceto\nelement box 0 0 100 50 "Hi"\n```\n'
    const out = await render(md)
    expect(out).toContain('<boceto-view')
    expect(out).toContain('element box 0 0 100 50')
  })

  it('escapes attribute content safely', async () => {
    const md = '```boceto\nelement label 0 0 100 24 "<script>alert(1)</script>"\n```\n'
    const out = await render(md)
    expect(out).toContain('&lt;script&gt;')
    expect(out).not.toContain('<script>alert(1)</script>')
  })

  it('passes through info string as data-page attribute', async () => {
    const md = '```boceto Login Screen\nelement box 0 0 10 10 ""\n```\n'
    const out = await render(md)
    expect(out).toContain('data-page="Login Screen"')
  })

  it('honors custom tag option', async () => {
    const md = '```boceto\nelement box 0 0 10 10 ""\n```\n'
    const out = await render(md, { tag: 'boceto-edit' })
    expect(out).toContain('<boceto-edit')
    expect(out).not.toContain('<boceto-view')
  })

  it('leaves non-boceto code blocks untouched', async () => {
    const md = '```js\nconsole.log(1)\n```\n'
    const out = await render(md)
    expect(out).toContain('<pre>')
    expect(out).toContain('console.log')
  })

  it('honors custom render function', async () => {
    const md = '```boceto\nelement box 0 0 10 10 ""\n```\n'
    const out = await render(md, { render: () => '<div class="custom">x</div>' })
    expect(out).toContain('<div class="custom">x</div>')
  })

  it('mode: svg inlines an SVG document', async () => {
    const md = '```boceto Login\nelement button 0 0 100 30 "Sign In"\n```\n'
    const out = await render(md, { mode: 'svg' })
    expect(out).toContain('<svg ')
    expect(out).toContain('</svg>')
    expect(out).not.toContain('<boceto-view')
    expect(out).toContain('Sign In')
  })

  it('mode: svg respects width/height options', async () => {
    const md = '```boceto\nelement box 0 0 10 10 ""\n```\n'
    const out = await render(md, { mode: 'svg', width: 400, height: 200 })
    expect(out).toContain('viewBox="0 0 400 200"')
  })

  it('mode: svg renders deterministically across calls', async () => {
    const md = '```boceto\nelement card 0 0 200 100 "Hi"\n```\n'
    const a = await render(md, { mode: 'svg' })
    const b = await render(md, { mode: 'svg' })
    expect(a).toBe(b)
  })

  it('mode: svg auto-sizes to content (no clipping on oversize pages)', async () => {
    // Issue #1 repro: a 1200×800 page must not be clipped to the 860×600 legacy default.
    // Label width is wide enough that the renderer doesn't ellipsize the text.
    const md =
      '```boceto\nelement box 0 0 1200 800 ""\nelement label 900 780 280 16 "I am at the far right edge"\n```\n'
    const out = await render(md, { mode: 'svg' })
    const m = /viewBox="0 0 (\d+) (\d+)"/.exec(out)
    expect(m).not.toBeNull()
    const [, w, h] = m!
    expect(Number(w)).toBeGreaterThanOrEqual(1200)
    expect(Number(h)).toBeGreaterThanOrEqual(800)
    expect(out).toContain('I am at the far right edge')
  })

  it('mode: svg fit:"fixed" preserves the legacy clipping behavior', async () => {
    const md =
      '```boceto\nelement box 0 0 1200 800 ""\nelement label 1100 780 80 16 "clipped"\n```\n'
    const out = await render(md, { mode: 'svg', fit: 'fixed', width: 400, height: 200 })
    expect(out).toContain('viewBox="0 0 400 200"')
  })

  it('mode: svg width/height act as a min floor in fit:"content"', async () => {
    const md = '```boceto\nelement box 0 0 50 50 ""\n```\n'
    const out = await render(md, { mode: 'svg', width: 900, height: 700 })
    expect(out).toContain('viewBox="0 0 900 700"')
  })

  it('mode: svg honors the padding option', async () => {
    const md = '```boceto\nelement box 0 0 100 100 ""\n```\n'
    const out = await render(md, { mode: 'svg', padding: 4 })
    expect(out).toContain('viewBox="0 0 104 104"')
  })

  it('mode: svg per-fence fit=fixed overrides plugin fit:"content"', async () => {
    const md =
      '```boceto fit=fixed width=400 height=200\nelement box 0 0 1200 800 ""\n```\n'
    const out = await render(md, { mode: 'svg' })
    expect(out).toContain('viewBox="0 0 400 200"')
  })

  it('mode: svg per-fence width overrides plugin width', async () => {
    const md = '```boceto Login width=1280\nelement box 0 0 50 50 ""\n```\n'
    const out = await render(md, { mode: 'svg', width: 400 })
    const m = /viewBox="0 0 (\d+) (\d+)"/.exec(out)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBe(1280)
  })

  it('mode: svg unrecognized meta key falls through to page name', async () => {
    // fubar=1 is not a recognized override → treated as part of the page name.
    // Parser must not throw; rendering succeeds.
    const md = '```boceto Page fubar=1\nelement box 0 0 50 50 ""\n```\n'
    const out = await render(md, { mode: 'svg' })
    expect(out).toContain('<svg ')
    expect(out).toContain('</svg>')
  })

  it('mode: wc strips per-fence option tokens from data-page', async () => {
    const md = '```boceto Login width=1280 fit=content\nelement box 0 0 10 10 ""\n```\n'
    const out = await render(md)
    expect(out).toContain('data-page="Login"')
    expect(out).not.toContain('width=1280')
  })
})
