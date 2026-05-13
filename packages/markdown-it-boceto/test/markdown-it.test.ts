import { beforeAll, describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import { initYoga } from '@boceto/core'
import bocetoIt from '../src'

const make = (opts?: Parameters<typeof bocetoIt>[1]) => new MarkdownIt().use(bocetoIt, opts)

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
})
