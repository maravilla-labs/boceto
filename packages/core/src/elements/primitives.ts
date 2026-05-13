import type { Surface, TextOpts } from '../render/surface'
import type { Element } from '../types'

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

// ─────────────────────────────────────────────────────────────────────────────
// Text-fitting primitives: fitText, shrinkFitText, wrapText, clipText.
// Driven by `Surface.measureText`, which is exact on canvas and approximate
// (`len * size * 0.55|0.6`) on SVG. The approximation is good enough to keep
// every label inside its declared box on both backends.
// ─────────────────────────────────────────────────────────────────────────────

type MeasureOpts = { size: number; bold?: boolean; italic?: boolean; font?: string }

/**
 * Single-line text that fits `maxW`. If the full string doesn't fit, the
 * longest prefix `P` such that `measure(P + '…') ≤ maxW` is rendered with a
 * trailing ellipsis. `x` is the anchor; the align mode tells the surface
 * which side of `x` the glyphs extend from.
 */
export function fitText(
  s: Surface,
  text: string,
  x: number,
  y: number,
  maxW: number,
  opts: SketchTextOpts = {},
): void {
  const t = text ?? ''
  const measure: MeasureOpts = {
    size: opts.size ?? 14,
    bold: opts.bold,
    italic: opts.italic,
    font: opts.font,
  }
  const renderOpts = {
    size: measure.size,
    color: opts.color ?? '#222',
    align: opts.align ?? 'left',
    baseline: opts.base ?? 'top',
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    font: opts.font,
    maxWidth: maxW,
  } as TextOpts
  if (s.measureText(t, measure).width <= maxW) {
    s.text(t, x, y, renderOpts)
    return
  }
  // Binary-search the longest prefix that fits with an ellipsis suffix.
  const ELL = '…'
  const ellW = s.measureText(ELL, measure).width
  if (ellW > maxW) {
    // No room for even the ellipsis — paint nothing.
    return
  }
  let lo = 0
  let hi = t.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    const candidate = t.slice(0, mid)
    const w = s.measureText(candidate, measure).width + ellW
    if (w <= maxW) lo = mid
    else hi = mid - 1
  }
  // Trim trailing spaces before the ellipsis for visual polish.
  const prefix = t.slice(0, lo).replace(/\s+$/, '')
  s.text(prefix + ELL, x, y, renderOpts)
}

/**
 * Single-line text that fits `maxW` by binary-searching the font size between
 * `opts.minFontSize` (default 9) and `opts.size`. The chosen size paints in
 * one pass; no ellipsis. Useful for fixed-width chrome (buttons, badges) when
 * the author would rather see a smaller readable label than `…`.
 *
 * Backend caveat: the canvas backend's `measureText` is exact, the SVG
 * backend's is heuristic, so the chosen size may differ slightly between
 * outputs. Both still fit.
 */
export function shrinkFitText(
  s: Surface,
  text: string,
  x: number,
  y: number,
  maxW: number,
  opts: SketchTextOpts & { minFontSize?: number } = {},
): void {
  const t = text ?? ''
  const maxSize = opts.size ?? 14
  const minSize = Math.max(6, opts.minFontSize ?? 9)
  let chosen = maxSize
  if (s.measureText(t, { size: maxSize, bold: opts.bold, italic: opts.italic, font: opts.font }).width > maxW) {
    let lo = minSize
    let hi = maxSize
    // ~5 iterations cover 9..30px to one px.
    for (let i = 0; i < 8 && lo + 0.5 < hi; i++) {
      const mid = (lo + hi) / 2
      const w = s.measureText(t, {
        size: mid,
        bold: opts.bold,
        italic: opts.italic,
        font: opts.font,
      }).width
      if (w <= maxW) lo = mid
      else hi = mid
    }
    chosen = Math.max(minSize, Math.floor(lo))
  }
  s.text(t, x, y, {
    size: chosen,
    color: opts.color ?? '#222',
    align: opts.align ?? 'left',
    baseline: opts.base ?? 'top',
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    font: opts.font,
    maxWidth: maxW,
  })
}

export interface WrapTextOpts {
  size?: number
  color?: string
  bold?: boolean
  italic?: boolean
  font?: string
  /** `'left' | 'center' | 'right'`. Default `'left'`. */
  align?: TextOpts['align']
  /**
   * If set, caps the number of wrapped lines to `floor(maxH / lineH)`. Takes
   * the smaller of `maxLines` and this cap.
   */
  maxH?: number
}

/**
 * Multi-line wrapped text. Splits on `\n` (hard breaks) first, then word-wraps
 * each segment inside `maxW`. Stops after `maxLines` (or `floor(maxH/lineH)`
 * if `maxH` is given) and appends `…` if more text remains.
 *
 * Back-compat: callers using `wrapText(s, t, x, y, maxW, lineH, maxLines, opts)`
 * with the legacy `{ size, color, bold, italic }` opts shape continue to work
 * unchanged.
 */
export function wrapText(
  s: Surface,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines = 99,
  textOpts: WrapTextOpts = {},
): void {
  const baseOpts: MeasureOpts = {
    size: textOpts.size ?? 13,
    bold: textOpts.bold,
    italic: textOpts.italic,
    font: textOpts.font,
  }
  const renderBase = {
    size: baseOpts.size,
    color: textOpts.color ?? '#222',
    bold: textOpts.bold ?? false,
    italic: textOpts.italic ?? false,
    font: textOpts.font,
  }
  const align: TextOpts['align'] = textOpts.align ?? 'left'
  // anchorX is the x value Surface.text() expects given the align mode.
  // Caller supplies `x` as the LEFT edge of the wrap box; we shift internally
  // so left/center/right alignment all share the same call site.
  const anchorX =
    align === 'left' ? x : align === 'right' ? x + maxW : x + maxW / 2

  const hardCap =
    textOpts.maxH != null && lineH > 0
      ? Math.max(1, Math.min(maxLines, Math.floor(textOpts.maxH / lineH)))
      : maxLines

  const ELL = '…'
  const ellW = s.measureText(ELL, baseOpts).width

  // Collect output lines first; emit at the end so we can fit ellipsis when
  // overflowing.
  const out: string[] = []
  const segments = (text ?? '').split('\n')

  outer: for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx]!
    if (seg === '') {
      // Preserve blank lines from hard newlines.
      out.push('')
      if (out.length >= hardCap) break outer
      continue
    }
    const words = seg.split(/\s+/)
    let line = ''
    for (const word of words) {
      const test = line ? line + ' ' + word : word
      if (s.measureText(test, baseOpts).width > maxW && line) {
        out.push(line)
        if (out.length >= hardCap) {
          // Out of lines — try to attach what we couldn't fit as an ellipsis.
          attachEllipsis(out, ellW, maxW, baseOpts, s)
          break outer
        }
        line = word
      } else {
        line = test
      }
    }
    if (line) {
      out.push(line)
      if (out.length >= hardCap) {
        if (segIdx < segments.length - 1) {
          // More segments remain → indicate truncation.
          attachEllipsis(out, ellW, maxW, baseOpts, s)
        }
        break outer
      }
    }
  }

  for (let i = 0; i < out.length; i++) {
    s.text(out[i]!, anchorX, y + i * lineH, {
      ...renderBase,
      align,
      baseline: 'top',
      maxWidth: maxW,
    })
  }
}

function attachEllipsis(
  out: string[],
  ellW: number,
  maxW: number,
  measure: MeasureOpts,
  s: Surface,
): void {
  if (out.length === 0) return
  let last = out[out.length - 1]!
  while (last.length > 0 && s.measureText(last + '…', measure).width > maxW) {
    last = last.slice(0, -1)
  }
  out[out.length - 1] = last.replace(/\s+$/, '') + '…'
}

/**
 * Hard-clip text rendering to a bounding box. Paints `text` inside a clipped
 * group, so glyphs outside `(x, y, w, h)` are not drawn at all. Useful for
 * `overflow=clip` semantics on inputs / terminals.
 */
export function clipText(
  s: Surface,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: SketchTextOpts = {},
): void {
  s.group({ clip: { x, y, w, h } }, () => {
    s.text(text, opts.align === 'right' ? x + w : opts.align === 'center' ? x + w / 2 : x, y, {
      size: opts.size ?? 14,
      color: opts.color ?? '#222',
      align: opts.align ?? 'left',
      baseline: opts.base ?? 'top',
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      font: opts.font,
      maxWidth: w,
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// paintLabel — generic dispatcher used by element renderers.
// ─────────────────────────────────────────────────────────────────────────────

export type OverflowPolicy = 'ellipsis' | 'wrap' | 'clip' | 'shrink'

export interface PaintLabelOpts {
  /** Element's default overflow policy when `el.attrs.overflow` is unset. */
  policy: OverflowPolicy
  /** Element's default horizontal alignment when `el.attrs.align` is unset. */
  align: TextOpts['align']
  /** Resolved font size in px. Caller reads `fontSize` attr before calling. */
  size: number
  bold?: boolean
  italic?: boolean
  color?: string
  font?: string
  /** Paint area. Defaults to `el.x/y/w/h` with `inset` applied to each edge. */
  bbox?: { x: number; y: number; w: number; h: number }
  /** Inset applied to bbox (px). Default 0. */
  inset?: number
  /** Line height for wrap mode. Default `Math.round(size * 1.25)`. */
  lineH?: number
  /** Vertical anchor relative to bbox. Default `'top'`. */
  baseline?: 'top' | 'middle' | 'bottom'
  /** Cap on wrap-mode lines. Default derived from `bbox.h / lineH`. */
  maxLines?: number
}

/**
 * Generic text-painting middleware. Reads three optional attributes from `el`:
 *
 *   - `overflow` = `ellipsis | wrap | clip | shrink` — overrides the element
 *     default `opts.policy`.
 *   - `textAlign` = `left | center | right` — overrides the element default
 *     `opts.align`. Named `textAlign` (not `align`) to avoid collision with
 *     the flex container's cross-axis `align` attribute, which uses a
 *     different value set (`start | middle | end | stretch`). Applies per-line
 *     in `wrap` mode.
 *   - `minFontSize` (number) — lower bound for `shrink`. Ignored otherwise.
 *
 * Renderers call this once per primary label, e.g.
 * `paintLabel(s, el, el.label, { policy: 'ellipsis', align: 'center', size: 13 })`.
 */
export function paintLabel(
  s: Surface,
  el: Element,
  text: string,
  opts: PaintLabelOpts,
): void {
  const policy = (el.attrs.overflow as OverflowPolicy | undefined) ?? opts.policy
  const align: TextOpts['align'] =
    (el.attrs.textAlign as TextOpts['align'] | undefined) ?? opts.align
  const inset = opts.inset ?? 0
  const bb = opts.bbox ?? { x: el.x, y: el.y, w: el.w, h: el.h }
  const ix = bb.x + inset
  const iy = bb.y + inset
  const iw = Math.max(0, bb.w - 2 * inset)
  const ih = Math.max(0, bb.h - 2 * inset)
  const lineH = opts.lineH ?? Math.round(opts.size * 1.25)

  // Horizontal anchor for single-line modes.
  const anchorX = align === 'left' ? ix : align === 'right' ? ix + iw : ix + iw / 2

  // Vertical anchor — translate baseline into a y coordinate.
  const baseline = opts.baseline ?? 'top'
  const anchorY =
    baseline === 'top' ? iy : baseline === 'bottom' ? iy + ih : iy + ih / 2
  const baselineProp: TextOpts['baseline'] =
    baseline === 'top' ? 'top' : baseline === 'bottom' ? 'bottom' : 'middle'

  const common: SketchTextOpts = {
    size: opts.size,
    color: opts.color,
    bold: opts.bold,
    italic: opts.italic,
    font: opts.font,
    align,
    base: baselineProp,
  }

  if (policy === 'wrap') {
    // Wrap aligns each line to the same anchor used for single-line. wrapText
    // wants the LEFT edge of the wrap box plus an align mode — pass `ix`.
    const lines = Math.max(1, Math.floor(ih / lineH))
    wrapText(s, text ?? '', ix, iy, iw, lineH, opts.maxLines ?? lines, {
      size: opts.size,
      color: opts.color,
      bold: opts.bold,
      italic: opts.italic,
      font: opts.font,
      align,
      maxH: ih,
    })
    return
  }

  if (policy === 'clip') {
    clipText(s, text ?? '', ix, iy, iw, ih, { ...common })
    return
  }

  if (policy === 'shrink') {
    const minFontSize = numericAttr(el.attrs.minFontSize, 9)
    shrinkFitText(s, text ?? '', anchorX, anchorY, iw, { ...common, minFontSize })
    return
  }

  // Default — `ellipsis`.
  fitText(s, text ?? '', anchorX, anchorY, iw, common)
}

function numericAttr(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
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
