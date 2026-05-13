import { describe, expect, it } from 'vitest'
import { parse, SvgRenderer } from '../src'

const r = new SvgRenderer()
const svg = (boceto: string) =>
  r.renderToString(parse('```boceto\n' + boceto + '\n```'), { width: 600, height: 320 })

describe('Tier 3 — system chrome', () => {
  it('window-frame renders traffic lights + title', () => {
    const out = svg('element window-frame 0 0 500 300 "My App"')
    expect(out).toContain('My App')
    expect((out.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('browser-frame renders URL bar', () => {
    const out = svg('element browser-frame 0 0 500 250 "https://boceto.dev"')
    expect(out).toContain('boceto.dev')
  })

  it('terminal renders text', () => {
    const out = svg('element terminal 0 0 400 120 "$ ls"')
    expect(out).toContain('ls')
  })
})

describe('Tier 3 — long-tail form', () => {
  it('combobox shows placeholder + items', () => {
    const out = svg('element combobox 0 0 240 160 "Pick a fruit" items="Apple|Banana|Cherry"')
    expect(out).toContain('Pick a fruit')
    expect(out).toContain('Apple')
  })

  it('date-picker shows the selected date', () => {
    const out = svg('element date-picker 0 0 200 36 "2026-03-15"')
    expect(out).toContain('2026-03-15')
  })

  it('color-picker shows hex code', () => {
    const out = svg('element color-picker 0 0 160 36 "#22c55e"')
    expect(out).toContain('#22c55e')
  })

  it('file-upload renders dropzone label', () => {
    const out = svg('element file-upload 0 0 320 140 "Drop your CSV"')
    expect(out).toContain('Drop your CSV')
  })

  it('rating renders stars', () => {
    const out = svg('element rating 0 0 160 24 "" max=5 value=3')
    expect((out.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })

  it('otp-input renders filled chars', () => {
    const out = svg('element otp-input 0 0 240 40 "123" count=6')
    expect(out).toContain('>1<')
    expect(out).toContain('>3<')
  })

  it('tag-input renders chips', () => {
    const out = svg('element tag-input 0 0 320 40 "" tags="design|wireframe|sketch"')
    expect(out).toContain('design')
    expect(out).toContain('wireframe')
  })

  it('stepper-input renders − value +', () => {
    const out = svg('element stepper-input 0 0 120 32 "12"')
    expect(out).toContain('>12<')
  })

  it('range-slider renders two thumbs', () => {
    const out = svg('element range-slider 0 0 240 24 "" low=20 high=80')
    expect((out.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})

describe('Tier 3 — long-tail content', () => {
  it('tree renders items', () => {
    const out = svg('element tree 0 0 240 200 "" items="src|/Button.tsx|/Card.tsx"')
    expect(out).toContain('src')
    expect(out).toContain('Button.tsx')
  })

  it('stepper renders numbered steps', () => {
    const out = svg('element stepper 0 0 480 60 "" items="Account|Profile|Confirm" current=1')
    expect(out).toContain('Account')
    expect(out).toContain('Profile')
  })

  it('carousel renders slide label', () => {
    const out = svg('element carousel 0 0 320 200 "Slide 1" total=5 active=2')
    expect(out).toContain('Slide 1')
  })

  it('popover renders header', () => {
    const out = svg('element popover 0 0 200 120 "Help"')
    expect(out).toContain('Help')
  })

  it('kbd renders keycap label', () => {
    const out = svg('element kbd 0 0 40 24 "⌘K"')
    expect(out).toContain('⌘K')
  })

  it('quote renders text', () => {
    const out = svg('element quote 0 0 320 80 "Less but better"')
    expect(out).toContain('Less but better')
  })

  it('status-dot uses status color', () => {
    const onlineSvg = svg('element status-dot 0 0 12 12 "" status=online')
    const busySvg = svg('element status-dot 0 0 12 12 "" status=busy')
    expect(onlineSvg).toContain('#22c55e')
    expect(busySvg).toContain('#dc2626')
  })

  it('notification-bell with count renders badge', () => {
    const out = svg('element notification-bell 0 0 32 32 "" count=7')
    expect(out).toContain('>7<')
  })

  it('mention renders @name', () => {
    const out = svg('element mention 0 0 100 22 "alice"')
    expect(out).toContain('@alice')
  })

  it('ai-suggestion renders Tab hint', () => {
    const out = svg('element ai-suggestion 0 0 320 32 "Apply this fix"')
    expect(out).toContain('Apply this fix')
    expect(out).toContain('[Tab]')
  })

  it('presence-cursor renders name pill', () => {
    const out = svg('element presence-cursor 0 0 100 40 "Jane" cursorColor=#22c55e')
    expect(out).toContain('Jane')
  })
})

describe('Tier 3 — long-tail data viz', () => {
  it('chart-area renders filled path', () => {
    const out = svg('element chart-area 0 0 240 120 "" data="3,5,2,7,4"')
    expect(out).toContain('rgba(59,130,196,0.25)')
  })

  it('chart-sparkline renders compact path + endpoint dot', () => {
    const out = svg('element chart-sparkline 0 0 80 24 "" data="3,5,2,7,4,8,6"')
    expect(out).toContain('<path')
    expect(out).toContain('<circle')
  })

  it('gantt renders task names', () => {
    const out = svg('element gantt 0 0 480 160 "" tasks="Design:0:3|Build:2:6"')
    expect(out).toContain('Design')
    expect(out).toContain('Build')
  })

  it('heatmap renders a grid of cells', () => {
    const out = svg('element heatmap 0 0 240 120 "" cols=7 rows=4')
    expect((out.match(/<rect/g) ?? []).length).toBeGreaterThanOrEqual(28)
  })

  it('map renders pin + label', () => {
    const out = svg('element map 0 0 240 200 "Acme HQ"')
    expect(out).toContain('Acme HQ')
  })

  it('code-diff colors added vs removed lines', () => {
    // Default content includes both + and - lines.
    const out = svg('element code-diff 0 0 320 120 ""')
    expect(out).toContain('rgba(34,197,94,0.18)')
    expect(out).toContain('rgba(239,68,68,0.18)')
  })
})

describe('Tier 3 — AR / spatial', () => {
  it('glass-window renders with title', () => {
    const out = svg('element glass-window 0 0 320 240 "Settings"')
    expect(out).toContain('Settings')
  })

  it('gaze-cursor renders ring + dot', () => {
    const out = svg('element gaze-cursor 0 0 32 32 ""')
    expect((out.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('pinch-indicator renders two finger circles', () => {
    const out = svg('element pinch-indicator 0 0 48 48 ""')
    expect((out.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('volumetric-scene renders with label', () => {
    const out = svg('element volumetric-scene 0 0 320 200 "Demo scene"')
    expect(out).toContain('Demo scene')
  })

  it('passthrough-frame renders camera-edge label', () => {
    const out = svg('element passthrough-frame 0 0 320 200 ""')
    expect(out).toContain('PASSTHROUGH')
  })

  it('voice-input renders waveform with label', () => {
    const out = svg('element voice-input 0 0 240 60 "Listening"')
    expect(out).toContain('Listening')
  })
})

describe('All 35 new types parse without throwing', () => {
  const newTypes = [
    'window-frame', 'browser-frame', 'terminal',
    'combobox', 'date-picker', 'color-picker', 'file-upload', 'rating',
    'otp-input', 'tag-input', 'stepper-input', 'range-slider',
    'tree', 'stepper', 'carousel', 'popover', 'kbd', 'quote',
    'status-dot', 'notification-bell', 'mention', 'ai-suggestion', 'presence-cursor',
    'chart-area', 'chart-sparkline', 'gantt', 'heatmap', 'map', 'code-diff',
    'glass-window', 'gaze-cursor', 'pinch-indicator', 'volumetric-scene',
    'passthrough-frame', 'voice-input',
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
