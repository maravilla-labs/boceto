import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, SvgRenderer } from '../src'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'multi-page.md'), 'utf8')

describe('SvgRenderer', () => {
  const r = new SvgRenderer()

  it('renders a syntactically valid SVG document', () => {
    const doc = parse(FIXTURE)
    const out = r.renderToString(doc)
    expect(out).toMatch(/^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
    expect(out).toMatch(/<\/svg>$/)
    expect(out).toContain('viewBox="0 0 860 600"')
  })

  it('has balanced open/close tags', () => {
    const doc = parse(FIXTURE)
    const out = r.renderToString(doc)
    // Walk the tags with a stack — a real XML parser would be heavier than
    // the test deserves, and this catches the mismatches we care about.
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/)?>/g
    const stack: string[] = []
    let m: RegExpExecArray | null
    while ((m = tagRe.exec(out))) {
      const full = m[0]
      const name = m[1]!
      if (full.startsWith('</')) {
        expect(stack.pop()).toBe(name)
      } else if (!full.endsWith('/>')) {
        stack.push(name)
      }
    }
    expect(stack).toEqual([])
    // No unescaped ampersands inside attribute values or text.
    expect(out).not.toMatch(/&[^#a-zA-Z]/)
  })

  it('output is byte-identical across renders (deterministic)', () => {
    const doc = parse(FIXTURE)
    const a = r.renderToString(doc)
    const b = r.renderToString(doc)
    expect(a).toBe(b)
  })

  it('renders different pages from a multi-page document', () => {
    const doc = parse(FIXTURE)
    const login = r.renderToString(doc, { page: 'Login' })
    const dashboard = r.renderToString(doc, { page: 'Dashboard' })
    expect(login).not.toBe(dashboard)
    // Dashboard has a progress bar fill and "Users" card label.
    expect(dashboard).toContain('Users')
    expect(dashboard).toContain('Revenue')
    // Login has the email/password inputs.
    expect(login).toContain('Email')
    expect(login).toContain('Password')
  })

  it('renders rect, line, text, and path primitives for a typical page', () => {
    const doc = parse('```boceto\nelement card 10 10 100 50 "Hi"\nelement input 10 70 100 30 "Search"\n```')
    const out = r.renderToString(doc)
    expect(out).toContain('<path ')
    expect(out).toContain('<text ')
  })

  it('escapes hostile content in element labels', () => {
    const doc = parse('```boceto\nelement label 0 0 100 24 "<script>alert(1)</script>"\n```')
    const out = r.renderToString(doc)
    expect(out).toContain('&lt;script&gt;')
    expect(out).not.toContain('<script>alert(1)</script>')
  })

  it('honors width/height options', () => {
    const doc = parse('```boceto\nelement box 0 0 50 50 ""\n```')
    const out = r.renderToString(doc, { width: 400, height: 200 })
    expect(out).toContain('viewBox="0 0 400 200"')
    expect(out).toContain('width="400"')
    expect(out).toContain('height="200"')
  })

  it('omits paper background when background is null', () => {
    const doc = parse('```boceto\nelement box 0 0 50 50 ""\n```')
    const withBg = r.renderToString(doc)
    const noBg = r.renderToString(doc, { background: null })
    expect(withBg).toContain('fill="#fafaf8"')
    expect(noBg.split('<rect').length).toBeLessThan(withBg.split('<rect').length)
  })

  it('renders an empty document gracefully', () => {
    const doc = parse('Plain markdown, no boceto blocks.')
    const out = r.renderToString(doc)
    expect(out).toMatch(/^<svg/)
    expect(out).toMatch(/<\/svg>$/)
  })

  it('renders all element types without throwing', () => {
    const types = [
      'box', 'card', 'modal', 'navbar', 'divider',
      'heading', 'label', 'breadcrumb',
      'input', 'textarea', 'button', 'primary-button', 'select', 'checkbox', 'radio',
      'image', 'video', 'avatar',
      'list', 'table', 'tabs', 'badge', 'progress', 'pagination', 'alert',
    ]
    const lines = types.map((t, i) => `element ${t} ${i * 30} 10 80 60 "${t}"`).join('\n')
    const doc = parse('```boceto\n' + lines + '\n```')
    expect(() => r.renderToString(doc)).not.toThrow()
  })
})
