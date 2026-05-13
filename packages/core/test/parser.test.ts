import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parse, BocetoParseError, serialize } from '../src'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'multi-page.md'), 'utf8')

describe('parse', () => {
  it('parses three pages from the multi-page fixture', () => {
    const doc = parse(FIXTURE)
    expect(doc.pages).toHaveLength(3)
    expect(doc.pages.map((p) => p.name)).toEqual(['Login', 'Dashboard', 'User Profile'])
  })

  it('parses element coords and labels', () => {
    const doc = parse(FIXTURE)
    const login = doc.pages[0]!
    expect(login.elements[0]).toMatchObject({
      type: 'navbar',
      x: 60,
      y: 40,
      w: 340,
      h: 44,
      label: 'MyApp',
    })
    const signIn = login.elements.find((e) => e.label === 'Sign In')
    expect(signIn?.type).toBe('primary-button')
  })

  it('parses type-specific attributes', () => {
    const doc = parse(FIXTURE)
    const dashboard = doc.pages[1]!
    const progress = dashboard.elements.find((e) => e.type === 'progress')
    expect(progress?.attrs.progress).toBe(72)
  })

  it('returns one empty page when no boceto blocks present', () => {
    const doc = parse('Just plain markdown with no boceto blocks.')
    expect(doc.pages).toHaveLength(1)
    expect(doc.pages[0]!.elements).toHaveLength(0)
  })

  it('parses standalone .boceto file with --- separators', () => {
    const src = [
      '--- One',
      'element box 0 0 100 50 "A"',
      '--- Two',
      'element box 0 0 100 50 "B"',
    ].join('\n')
    const doc = parse(src)
    expect(doc.pages).toHaveLength(2)
    expect(doc.pages[1]!.elements[0]!.label).toBe('B')
  })

  it('parses raw mode (single page, no fences)', () => {
    const doc = parse('element box 0 0 100 50 "Hi"', { raw: true })
    expect(doc.pages).toHaveLength(1)
    expect(doc.pages[0]!.elements[0]!.label).toBe('Hi')
  })

  it('rejects unknown statement keywords', () => {
    expect(() => parse('```boceto\nrect 0 0 100 50 "x"\n```')).toThrow(BocetoParseError)
  })

  it('rejects unknown element types', () => {
    expect(() => parse('```boceto\nelement frobnicator 0 0 100 50 "x"\n```')).toThrow(BocetoParseError)
  })

  it('parses arrows referencing element ids', () => {
    const src = [
      '```boceto',
      'element button#save 0 0 100 30 "Save"',
      'element box#out 0 100 100 50 "Result"',
      'arrow save out "opens"',
      '```',
    ].join('\n')
    const doc = parse(src)
    const page = doc.pages[0]!
    expect(page.arrows).toHaveLength(1)
    expect(page.arrows[0]).toMatchObject({ from: 'save', to: 'out', label: 'opens' })
    expect(page.elements[0]!.id).toBe('save')
  })

  it('parses sticky-note annotation', () => {
    const doc = parse('```boceto\nelement box 0 0 100 50 "Title" "Sticky note here"\n```')
    expect(doc.pages[0]!.elements[0]!.note).toBe('Sticky note here')
  })

  it('handles escaped quotes and backslashes inside labels', () => {
    const doc = parse('```boceto\nelement label 0 0 100 24 "She said \\"hi\\""\n```')
    expect(doc.pages[0]!.elements[0]!.label).toBe('She said "hi"')
  })

  it('parses attribute values containing whitespace via quoted form', () => {
    const doc = parse(
      '```boceto\nelement list 0 0 200 80 "" items="Item one|Item two|Item three"\n```',
    )
    expect(doc.pages[0]!.elements[0]!.attrs.items).toBe('Item one|Item two|Item three')
  })

  it('parses multiple attributes including a quoted-value one', () => {
    const doc = parse(
      '```boceto\nelement tabs 0 0 300 80 "" tabNames="Files & docs|Members" badgeColor=red\n```',
    )
    const el = doc.pages[0]!.elements[0]!
    expect(el.attrs.tabNames).toBe('Files & docs|Members')
    expect(el.attrs.badgeColor).toBe('red')
  })

  it('quoted attribute value can contain escaped quote', () => {
    const doc = parse(
      '```boceto\nelement label 0 0 100 24 "x" data-q="he said \\"hi\\""\n```',
    )
    expect(doc.pages[0]!.elements[0]!.attrs['data-q']).toBe('he said "hi"')
  })

  it('ignores comment lines and blank lines', () => {
    const src = [
      '```boceto',
      '# this is a comment',
      '',
      'element box 0 0 100 50 "Real"',
      '# another',
      '```',
    ].join('\n')
    const doc = parse(src)
    expect(doc.pages[0]!.elements).toHaveLength(1)
  })
})

describe('serializer: quoted attribute values', () => {
  it('emits attribute values containing spaces as quoted', () => {
    const src = '```boceto\nelement list 0 0 200 80 "" items="Item one|Item two"\n```'
    const out = serialize(parse(src))
    expect(out).toContain('items="Item one|Item two"')
  })

  it('emits identifier-like attribute values bare', () => {
    const src = '```boceto\nelement progress 0 0 200 20 "" progress=80\n```'
    const out = serialize(parse(src))
    expect(out).toContain('progress=80')
    expect(out).not.toContain('progress="80"')
  })

  it('round-trips quoted attribute values losslessly', () => {
    const src = '```boceto\nelement list 0 0 200 80 "" items="Item one|Item two|Item three"\n```'
    const a = parse(src)
    const b = parse(serialize(a))
    expect(b.pages[0]!.elements[0]!.attrs.items).toBe(a.pages[0]!.elements[0]!.attrs.items)
  })
})

describe('round-trip', () => {
  it('serialize(parse(x)) preserves all elements and arrows', () => {
    const doc = parse(FIXTURE)
    const out = serialize(doc)
    const reparsed = parse(out)
    expect(reparsed.pages).toHaveLength(doc.pages.length)
    for (let i = 0; i < doc.pages.length; i++) {
      const a = doc.pages[i]!
      const b = reparsed.pages[i]!
      expect(b.name).toBe(a.name)
      expect(b.elements).toHaveLength(a.elements.length)
      for (let j = 0; j < a.elements.length; j++) {
        const ea = a.elements[j]!
        const eb = b.elements[j]!
        expect(eb).toMatchObject({
          type: ea.type,
          x: ea.x,
          y: ea.y,
          w: ea.w,
          h: ea.h,
          label: ea.label,
        })
        expect(eb.attrs).toEqual(ea.attrs)
      }
      expect(b.arrows).toHaveLength(a.arrows.length)
    }
  })

  it('serializer in boceto format produces standalone file with --- separators', () => {
    const doc = parse(FIXTURE)
    const out = serialize(doc, { format: 'boceto' })
    expect(out.startsWith('--- Login')).toBe(true)
    expect(out).toContain('--- Dashboard')
    expect(out).not.toContain('```boceto')
  })
})
