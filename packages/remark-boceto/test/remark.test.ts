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
})
