import { describe, expect, it } from 'vitest'
import { parse, SvgRenderer } from '../src'

const r = new SvgRenderer()
const svg = (boceto: string) =>
  r.renderToString(parse('```boceto\n' + boceto + '\n```'), { width: 400, height: 200 })

describe('Tier 1 — form elements', () => {
  it('switch off (default) and switch on=true render differently', () => {
    const off = svg('element switch 0 0 60 28 ""')
    const on = svg('element switch 0 0 60 28 "" on=true')
    expect(off).not.toBe(on)
    // On state should include the green fill.
    expect(on).toContain('#22c55e')
  })

  it('slider renders with thumb + filled portion', () => {
    const out = svg('element slider 0 50 200 30 "" value=70')
    expect(out).toContain('<svg')
    expect(out).toContain('<circle')
  })

  it('search renders magnifier + placeholder', () => {
    const out = svg('element search 0 0 200 36 "Find anything…"')
    expect(out).toContain('Find anything')
  })

  it('chip renders with closable variant', () => {
    const out = svg('element chip 0 0 100 24 "Filter" closable=true')
    expect(out).toContain('Filter')
  })

  it('segmented-control highlights active segment', () => {
    const out = svg('element segmented-control 0 0 240 32 "" items="Day|Week|Month" active=2')
    expect(out).toMatch(/<text[^>]*font-weight="bold"[^>]*>Month<\/text>/)
  })
})

describe('Tier 1 — navigation', () => {
  it('sidebar renders items + active highlight', () => {
    const out = svg('element sidebar 0 0 180 200 "MyApp" items="Inbox|Sent|Drafts" active=1')
    expect(out).toContain('Inbox')
    expect(out).toContain('Sent')
    expect(out).toContain('Drafts')
  })

  it('dropdown-menu renders items and skips separator rows as text', () => {
    const out = svg('element dropdown-menu 0 0 180 140 "" items="Edit|Duplicate|---|Delete"')
    expect(out).toContain('Edit')
    expect(out).toContain('Delete')
    // The "---" entry becomes a separator line, not text content.
    expect(out).not.toMatch(/>---</)
  })
})

describe('Tier 1 — feedback', () => {
  it('tooltip renders body + arrow path', () => {
    const out = svg('element tooltip 0 50 120 32 "Hello"')
    expect(out).toContain('Hello')
    // Tooltip body has dark fill.
    expect(out).toContain('#1f2937')
  })

  it('toast variants change accent color', () => {
    const success = svg('element toast 0 0 200 36 "Saved!" variant=success')
    const error = svg('element toast 0 0 200 36 "Failed" variant=error')
    expect(success).toContain('#22c55e')
    expect(error).toContain('#ef4444')
  })

  it('spinner renders an arc', () => {
    const out = svg('element spinner 0 0 32 32 ""')
    expect(out).toContain('<path')
  })

  it('skeleton renders the requested number of lines', () => {
    const out = svg('element skeleton 0 0 200 80 "" lines=4')
    const rectCount = (out.match(/<rect/g) ?? []).length
    expect(rectCount).toBeGreaterThanOrEqual(4)
  })
})

describe('Tier 1 — content', () => {
  it('code-block renders monospace text + optional language tag', () => {
    const out = svg('element code-block 0 0 300 80 "console.log(1)" lang=js')
    expect(out).toContain('console.log')
    expect(out).toContain('>js<')
  })

  it('accordion expanded vs collapsed render differently', () => {
    const collapsed = svg('element accordion 0 0 300 40 "FAQ"')
    const expanded = svg('element accordion 0 0 300 120 "FAQ" expanded=true')
    expect(collapsed).not.toBe(expanded)
    expect(expanded).toContain('Section content')
  })

  it('chat-bubble side=right uses different color', () => {
    const left = svg('element chat-bubble 0 0 200 40 "Hi"')
    const right = svg('element chat-bubble 0 0 200 40 "Hi" side=right')
    expect(left).not.toBe(right)
    expect(right).toContain('#3b82c4')
  })
})

describe('Tier 1 — data viz', () => {
  it('chart-bar renders one rect per data point', () => {
    const out = svg('element chart-bar 0 0 240 120 "" data="3,5,2,7,4"')
    // 1 frame + 5 bars = at least 6 rects.
    const rectCount = (out.match(/<rect/g) ?? []).length
    expect(rectCount).toBeGreaterThanOrEqual(6)
  })

  it('chart-line renders a path through points', () => {
    const out = svg('element chart-line 0 0 240 120 "" data="3,5,2,7,4"')
    expect(out).toContain('<path')
  })

  it('chart-donut renders wedges + inner hole', () => {
    const out = svg('element chart-donut 0 0 120 120 "" data="40,30,20,10"')
    // Donut wedge paths + inner circle.
    expect(out).toContain('<path')
    expect(out).toContain('<circle')
  })
})

describe('Tier 1 — calendar', () => {
  it('renders the requested month + day numbers', () => {
    const out = svg('element calendar 0 0 280 200 "" month=3 year=2026 selected=15')
    expect(out).toContain('March 2026')
    expect(out).toContain('>15<')
  })
})

describe('Mobile chrome', () => {
  it('phone-frame renders an outer body + inner screen', () => {
    const out = svg('element phone-frame 0 0 200 400 ""')
    // Outer (dark) + inner (white) bodies + notch + buttons.
    expect((out.match(/<rect/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('status-bar renders time on left + battery on right', () => {
    const out = svg('element status-bar 0 0 320 24 "9:41"')
    expect(out).toContain('9:41')
  })

  it('home-indicator is a small pill', () => {
    const out = svg('element home-indicator 0 0 240 16 ""')
    expect(out).toContain('<rect')
  })

  it('fab renders a circle + glyph', () => {
    const out = svg('element fab 0 0 56 56 "+"')
    expect(out).toContain('<circle')
    expect(out).toContain('>+<')
  })

  it('app-icon with badge renders an additional circle', () => {
    const noBadge = svg('element app-icon 0 0 60 60 "" glyph="A"')
    const withBadge = svg('element app-icon 0 0 60 60 "" glyph="A" badge=3')
    const noBadgeArcs = (noBadge.match(/<circle/g) ?? []).length
    const withBadgeArcs = (withBadge.match(/<circle/g) ?? []).length
    expect(withBadgeArcs).toBeGreaterThan(noBadgeArcs)
    expect(withBadge).toContain('>3<')
  })
})

describe('All new types parse without throwing', () => {
  const newTypes = [
    'switch', 'slider', 'search', 'chip', 'segmented-control',
    'sidebar', 'dropdown-menu',
    'tooltip', 'toast', 'spinner', 'skeleton',
    'code-block', 'accordion', 'chat-bubble',
    'chart-bar', 'chart-line', 'chart-donut',
    'calendar',
    'phone-frame', 'status-bar', 'home-indicator', 'fab', 'app-icon',
  ]
  for (const t of newTypes) {
    it(t, () => {
      expect(() =>
        r.renderToString(
          parse('```boceto\nelement ' + t + ' 0 0 100 60 ""\n```'),
          { width: 200, height: 100 },
        ),
      ).not.toThrow()
    })
  }
})
