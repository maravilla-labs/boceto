import type { Surface, TextOpts } from '../render/surface'

/**
 * "Sketchy" primitives — the hand-drawn-looking helpers that compose into
 * element renderers. Each primitive computes jittered geometry via the
 * Surface's `jitter()` method (so canvas uses Math.random and SVG uses a
 * seeded PRNG) and emits the final shape via low-level Surface ops.
 */

export interface SketchRectOpts {
  fill?: string
  stroke?: string
  lw?: number
  /** Jitter amount for corner perturbation. Default 1.5. */
  r?: number
}

export function sketchRect(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  { fill = '#fff', stroke = '#333', lw = 2, r = 1.5 }: SketchRectOpts = {},
): void {
  // Jittered quadrilateral via path data. The four corners wobble independently.
  const pts = [
    [s.jitter(x, r), s.jitter(y, r)],
    [s.jitter(x + w, r), s.jitter(y, r)],
    [s.jitter(x + w, r), s.jitter(y + h, r)],
    [s.jitter(x, r), s.jitter(y + h, r)],
  ]
  const d = `M ${pts[0]![0]} ${pts[0]![1]} L ${pts[1]![0]} ${pts[1]![1]} L ${pts[2]![0]} ${pts[2]![1]} L ${pts[3]![0]} ${pts[3]![1]} Z`
  s.path(d, { fill, stroke, strokeWidth: lw })

  // Faint double-line on top edge — the signature "wireframe sketch" detail.
  if (stroke && stroke !== 'transparent') {
    s.group({ opacity: 0.3 }, () => {
      s.line(
        s.jitter(x, r * 0.4),
        s.jitter(y - 0.5, r * 0.4),
        s.jitter(x + w, r * 0.4),
        s.jitter(y - 0.5, r * 0.4),
        { stroke, strokeWidth: lw },
      )
    })
  }
}

export interface SketchLineOpts {
  stroke?: string
  lw?: number
  dash?: number[]
}

export function sketchLine(
  s: Surface,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  { stroke = '#333', lw = 1.5, dash = [] }: SketchLineOpts = {},
): void {
  s.line(s.jitter(x1, 0.8), s.jitter(y1, 0.8), s.jitter(x2, 0.8), s.jitter(y2, 0.8), {
    stroke,
    strokeWidth: lw,
    dash: dash.length ? dash : undefined,
  })
}

export interface SketchTextOpts {
  size?: number
  color?: string
  align?: TextOpts['align']
  base?: TextOpts['baseline']
  bold?: boolean
  italic?: boolean
  maxW?: number
  /** CSS font-family stack. Defaults to the hand-drawn stack. */
  font?: string
}

export function sketchText(
  s: Surface,
  text: string,
  x: number,
  y: number,
  {
    size = 14,
    color = '#222',
    align = 'left',
    base = 'top',
    bold = false,
    italic = false,
    maxW,
    font,
  }: SketchTextOpts = {},
): void {
  s.text(text, x, y, {
    size,
    color,
    align,
    baseline: base,
    bold,
    italic,
    maxWidth: maxW,
    font,
  })
}

export function wrapText(
  s: Surface,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines = 99,
  textOpts: { size?: number; color?: string; bold?: boolean; italic?: boolean } = {},
): void {
  const opts = { size: textOpts.size ?? 13, ...textOpts }
  const words = (text || '').split(' ')
  let line = ''
  let lineCount = 0
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (s.measureText(test, opts).width > maxW && line) {
      s.text(line, x, y + lineCount * lineH, { ...opts, baseline: 'top', maxWidth: maxW })
      line = word
      lineCount++
      if (lineCount >= maxLines) {
        s.text(line + '…', x, y + lineCount * lineH, { ...opts, baseline: 'top', maxWidth: maxW })
        return
      }
    } else line = test
  }
  if (line) s.text(line, x, y + lineCount * lineH, { ...opts, baseline: 'top', maxWidth: maxW })
}

export interface ArrowOpts {
  stroke?: string
  lw?: number
  label?: string
}

export function arrow(
  s: Surface,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  { stroke = '#444', lw = 2, label = '' }: ArrowOpts = {},
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return

  // Bezier control point: offset perpendicular to the line for a curved feel.
  const mx = (x1 + x2) / 2 + dy * 0.18
  const my = (y1 + y2) / 2 - dx * 0.18

  const p0x = s.jitter(x1)
  const p0y = s.jitter(y1)
  const cpx = s.jitter(mx, 0.5)
  const cpy = s.jitter(my, 0.5)
  const p1x = s.jitter(x2, 0.5)
  const p1y = s.jitter(y2, 0.5)
  s.path(`M ${p0x} ${p0y} Q ${cpx} ${cpy} ${p1x} ${p1y}`, {
    stroke,
    strokeWidth: lw,
  })

  // Arrow head — small triangle at the end, oriented along the curve's
  // tangent at the endpoint (approximated by the control-point → endpoint vector).
  const ang = Math.atan2(y2 - my, x2 - mx)
  const al = 12
  const aw = 6
  const hx2 = x2 - al * Math.cos(ang - aw * 0.4)
  const hy2 = y2 - al * Math.sin(ang - aw * 0.4)
  const hx3 = x2 - al * Math.cos(ang + aw * 0.4)
  const hy3 = y2 - al * Math.sin(ang + aw * 0.4)
  s.path(`M ${x2} ${y2} L ${hx2} ${hy2} L ${hx3} ${hy3} Z`, { fill: stroke, stroke })

  if (label) {
    s.text(label, mx, my - 4, {
      size: 12,
      color: '#555',
      align: 'center',
      baseline: 'bottom',
    })
  }
}

export const PALETTE = {
  selection: '#4a90d9',
  hover: '#7bb3e8',
  paper: '#fafaf8',
  paperLine: '#e8e8e4',
  bg: 'rgba(255,255,255,0.92)',
  dark: '#1e1e2e',
  default: '#444',
} as const
