import { beforeAll, describe, expect, it } from 'vitest'
import {
  applyFlexLayout,
  initYoga,
  pageContentBox,
  parse,
  serialize,
  SvgRenderer,
} from '../src'

beforeAll(async () => {
  await initYoga()
})
import {
  clipText,
  fitText,
  paintLabel,
  shrinkFitText,
  wrapText,
} from '../src/elements/primitives'
import type { Surface, TextOpts } from '../src/render/surface'
import type { Element } from '../src/types'

/**
 * Recording Surface — every call is logged so assertions can inspect what a
 * primitive painted without needing a real canvas.
 */
interface TextCall {
  s: string
  x: number
  y: number
  size: number
  align: TextOpts['align']
  baseline: TextOpts['baseline']
  maxWidth?: number
}

function makeRec(measureCharPx = 7): {
  surface: Surface
  texts: TextCall[]
  clips: { x: number; y: number; w: number; h: number }[]
} {
  const texts: TextCall[] = []
  const clips: { x: number; y: number; w: number; h: number }[] = []
  const surface: Surface = {
    jitter: (n) => n,
    rect: () => undefined,
    line: () => undefined,
    arc: () => undefined,
    arcSegment: () => undefined,
    path: () => undefined,
    text: (s, x, y, opts) => {
      texts.push({
        s,
        x,
        y,
        size: opts.size,
        align: opts.align,
        baseline: opts.baseline,
        maxWidth: opts.maxWidth,
      })
    },
    measureText: (s, opts) => ({ width: s.length * (opts.size / 14) * measureCharPx }),
    group: (opts, fn) => {
      if (opts.clip) clips.push(opts.clip)
      fn()
    },
  }
  return { surface, texts, clips }
}

function makeEl(over: Partial<Element>): Element {
  return {
    id: 'p0e0',
    type: 'button',
    x: 0,
    y: 0,
    w: 100,
    h: 32,
    label: '',
    attrs: {},
    ...over,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('tokenizer: \\n and \\t escapes in quoted strings', () => {
  it('decodes \\n into a real newline inside an element label', () => {
    const doc = parse('```boceto\nelement textarea 0 0 200 100 "line one\\nline two"\n```')
    expect(doc.pages[0]!.elements[0]!.label).toBe('line one\nline two')
  })

  it('decodes \\t into a real tab', () => {
    const doc = parse('```boceto\nelement label 0 0 200 32 "a\\tb"\n```')
    expect(doc.pages[0]!.elements[0]!.label).toBe('a\tb')
  })

  it('serializer escapes newlines so round-trip is lossless', () => {
    const src = '```boceto\nelement textarea 0 0 200 100 "line one\\nline two"\n```'
    const doc = parse(src)
    const out = serialize(doc)
    expect(out).toContain('"line one\\nline two"')
    expect(parse(out).pages[0]!.elements[0]!.label).toBe('line one\nline two')
  })
})

describe('fitText (ellipsize)', () => {
  it('paints full string when it fits', () => {
    const { surface, texts } = makeRec()
    fitText(surface, 'Hi', 0, 0, 200, { size: 14, align: 'left' })
    expect(texts).toHaveLength(1)
    expect(texts[0]!.s).toBe('Hi')
    expect(texts[0]!.s.endsWith('…')).toBe(false)
  })

  it('appends … and the painted glyphs fit within maxW', () => {
    const { surface, texts } = makeRec()
    // 7px/char × 14 chars = 98px, but maxW=40 so it must truncate.
    fitText(surface, 'Drag me, resize me, double-click', 0, 0, 40, {
      size: 14,
      align: 'left',
    })
    expect(texts).toHaveLength(1)
    const painted = texts[0]!.s
    expect(painted.endsWith('…')).toBe(true)
    // 5 chars × 7 = 35px, + ellipsis ~7px = 42px > 40. So fits when prefix is shorter.
    const measured = painted.length * 7
    expect(measured).toBeLessThanOrEqual(40 + 7)
  })

  it('honors right-align by paint at the supplied anchor', () => {
    const { surface, texts } = makeRec()
    fitText(surface, 'Hi', 100, 0, 200, { size: 14, align: 'right' })
    expect(texts[0]!.align).toBe('right')
    expect(texts[0]!.x).toBe(100)
  })
})

describe('shrinkFitText', () => {
  it('keeps the requested size when the text already fits', () => {
    const { surface, texts } = makeRec()
    shrinkFitText(surface, 'Hi', 0, 0, 200, { size: 20 })
    expect(texts[0]!.size).toBe(20)
  })

  it('reduces the size until the text fits and never adds …', () => {
    const { surface, texts } = makeRec()
    // text = 16 chars; at size s, width = 16·(s/14)·7 = 8s. Choose maxW=100
    // so the fit succeeds within [minFontSize=9, size=24]: 8·12=96 ≤ 100.
    shrinkFitText(surface, 'a longish string', 0, 0, 100, {
      size: 24,
      minFontSize: 9,
    })
    expect(texts).toHaveLength(1)
    expect(texts[0]!.s.endsWith('…')).toBe(false)
    expect(texts[0]!.size).toBeLessThan(24)
    expect(texts[0]!.size).toBeGreaterThanOrEqual(9)
    const t = texts[0]!
    const measured = t.s.length * (t.size / 14) * 7
    expect(measured).toBeLessThanOrEqual(100 + 1)
  })

  it('clamps to minFontSize when no size in range fits', () => {
    const { surface, texts } = makeRec()
    // Aggressively narrow box that can't fit even at minFontSize.
    shrinkFitText(surface, 'an even longer label that cant possibly fit', 0, 0, 30, {
      size: 16,
      minFontSize: 9,
    })
    expect(texts[0]!.size).toBe(9)
    expect(texts[0]!.s.endsWith('…')).toBe(false)
  })
})

describe('wrapText', () => {
  it('honors hard \\n breaks', () => {
    const { surface, texts } = makeRec()
    wrapText(surface, 'line one\nline two', 0, 0, 1000, 16, 5, { size: 14 })
    expect(texts.map((t) => t.s)).toEqual(['line one', 'line two'])
  })

  it('word-wraps within maxW and caps at maxLines with …', () => {
    const { surface, texts } = makeRec()
    // 7px/char. maxW=20 → ~3 chars/line.
    wrapText(surface, 'AAA BBB CCC DDD EEE', 0, 0, 20, 16, 2, { size: 14 })
    expect(texts).toHaveLength(2)
    expect(texts[1]!.s.endsWith('…')).toBe(true)
  })

  it('applies align by shifting anchor x to the right edge for align=right', () => {
    const { surface, texts } = makeRec()
    wrapText(surface, 'hello', 50, 0, 100, 16, 5, { size: 14, align: 'right' })
    expect(texts[0]!.align).toBe('right')
    // Caller passed x=50 as the LEFT edge; anchor moves to left+maxW=150.
    expect(texts[0]!.x).toBe(150)
  })

  it('uses maxH/lineH to derive a line cap', () => {
    const { surface, texts } = makeRec()
    wrapText(surface, 'A B C D E F G H', 0, 0, 14, 16, 99, { size: 14, maxH: 32 })
    // 32 / 16 = 2 lines max.
    expect(texts).toHaveLength(2)
  })
})

describe('clipText', () => {
  it('runs the text() call inside a clipped group', () => {
    const { surface, texts, clips } = makeRec()
    clipText(surface, 'overflowing', 5, 5, 50, 20, { size: 14 })
    expect(clips).toEqual([{ x: 5, y: 5, w: 50, h: 20 }])
    expect(texts).toHaveLength(1)
  })
})

describe('paintLabel attribute dispatch', () => {
  it('default policy=ellipsis paints with …', () => {
    const { surface, texts } = makeRec()
    const el = makeEl({ label: 'A really long label here', w: 40, h: 32 })
    paintLabel(surface, el, el.label, {
      policy: 'ellipsis',
      align: 'center',
      baseline: 'middle',
      size: 13,
    })
    expect(texts[0]!.s.endsWith('…')).toBe(true)
    expect(texts[0]!.align).toBe('center')
  })

  it('overflow=wrap overrides default ellipsis', () => {
    const { surface, texts } = makeRec()
    const el = makeEl({
      label: 'AAA BBB CCC DDD',
      w: 24,
      h: 100,
      attrs: { overflow: 'wrap' },
    })
    paintLabel(surface, el, el.label, {
      policy: 'ellipsis',
      align: 'left',
      baseline: 'top',
      size: 14,
    })
    expect(texts.length).toBeGreaterThan(1)
    expect(texts[0]!.s.endsWith('…')).toBe(false)
  })

  it('overflow=shrink reduces font size, no ellipsis', () => {
    const { surface, texts } = makeRec()
    const el = makeEl({
      label: 'tight label squeezed in',
      w: 60,
      h: 32,
      attrs: { overflow: 'shrink', minFontSize: 9 },
    })
    paintLabel(surface, el, el.label, {
      policy: 'ellipsis',
      align: 'center',
      baseline: 'middle',
      size: 14,
    })
    expect(texts[0]!.s.endsWith('…')).toBe(false)
    expect(texts[0]!.size).toBeLessThanOrEqual(14)
    expect(texts[0]!.size).toBeGreaterThanOrEqual(9)
  })

  it('overflow=clip paints inside a clipped group', () => {
    const { surface, clips } = makeRec()
    const el = makeEl({
      label: 'long enough to overflow',
      w: 30,
      h: 32,
      attrs: { overflow: 'clip' },
    })
    paintLabel(surface, el, el.label, {
      policy: 'ellipsis',
      align: 'left',
      baseline: 'top',
      size: 14,
    })
    expect(clips.length).toBe(1)
  })

  it('textAlign=right attribute overrides default center', () => {
    const { surface, texts } = makeRec()
    const el = makeEl({ label: 'Hi', w: 100, h: 32, attrs: { textAlign: 'right' } })
    paintLabel(surface, el, el.label, {
      policy: 'ellipsis',
      align: 'center',
      baseline: 'middle',
      size: 14,
    })
    expect(texts[0]!.align).toBe('right')
    expect(texts[0]!.x).toBe(100) // el.x + el.w, with default inset 0
  })

  it('wrap mode respects textAlign=right (anchor at right edge)', () => {
    const { surface, texts } = makeRec()
    const el = makeEl({
      label: 'a b c',
      w: 50,
      h: 80,
      x: 10,
      y: 0,
      attrs: { overflow: 'wrap', textAlign: 'right' },
    })
    paintLabel(surface, el, el.label, {
      policy: 'ellipsis',
      align: 'center',
      baseline: 'top',
      size: 14,
    })
    for (const t of texts) {
      expect(t.align).toBe('right')
      expect(t.x).toBe(60) // el.x + el.w
    }
  })
})

describe('pageContentBox', () => {
  it('returns the union bbox of every renderable', () => {
    const doc = parse(
      '```boceto\nelement box 10 20 100 50 "A"\nelement box 200 300 50 80 "B"\n```',
    )
    const bb = pageContentBox(doc.pages[0]!.elements)
    expect(bb).toEqual({ x: 10, y: 20, w: 240, h: 360 })
  })

  it('descends into flex container children for the bbox', () => {
    const doc = parse(
      '```boceto\nrow 10 10 400 60 gap=8\n  element button 0 0 80 32 "A"\n  element button 0 0 80 32 "B"\nend\nelement label 500 200 100 20 "far"\n```',
    )
    applyFlexLayout(doc)
    const bb = pageContentBox(doc.pages[0]!.elements)
    expect(bb).not.toBeNull()
    // Right-most edge should reach the far label at x=500 + w=100 = 600.
    expect(bb!.x + bb!.w).toBeGreaterThanOrEqual(600)
    expect(bb!.y + bb!.h).toBeGreaterThanOrEqual(220)
  })

  it('returns null for an empty page', () => {
    const doc = parse('```boceto\n\n```')
    expect(pageContentBox(doc.pages[0]!.elements)).toBeNull()
  })
})

describe('cross-backend SVG sanity', () => {
  it('renders a heading scene without any <text> x exceeding the box', () => {
    const doc = parse(
      '```boceto\nelement heading 40 80 200 32 "This headline is way too long for the box"\n```',
    )
    const svg = new SvgRenderer().renderToString(doc, { width: 400, height: 200 })
    // Every <text x="..."> in the output should sit within [40, 240] (the box).
    // The SvgSurface clips via clipPath when our wrap helper produces overflow,
    // but for `wrap` policy the text is broken into lines so each line's x
    // stays inside the box anyway.
    const xs = [...svg.matchAll(/<text[^>]*\sx="([0-9.]+)"/g)].map((m) => Number(m[1]))
    expect(xs.length).toBeGreaterThan(0)
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(40 - 1)
      expect(x).toBeLessThanOrEqual(240 + 1)
    }
  })
})
