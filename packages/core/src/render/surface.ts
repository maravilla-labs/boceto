/**
 * `Surface` — backend-agnostic drawing primitives used by element renderers.
 *
 * Two implementations: `CanvasSurface` (paints into a Canvas 2D context) and
 * `SvgSurface` (accumulates SVG markup). Element renderers in
 * `elements/register.ts` call only `Surface` methods, so they work with both
 * backends without changes.
 *
 * Design: the interface is intentionally narrow — only what the existing
 * primitives + element renderers actually use. Higher-level "sketchy"
 * primitives (sketchRect/sketchLine/sketchText/arrow) live in
 * `elements/primitives.ts` and are written in terms of `Surface`.
 */

export interface ShapeOpts {
  fill?: string
  stroke?: string
  strokeWidth?: number
  lineCap?: 'round' | 'butt' | 'square'
  lineJoin?: 'round' | 'miter' | 'bevel'
}

export interface StrokeOpts {
  stroke?: string
  strokeWidth?: number
  lineCap?: 'round' | 'butt' | 'square'
  dash?: number[]
}

export interface TextOpts {
  size: number
  color?: string
  align?: 'left' | 'center' | 'right'
  baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic'
  bold?: boolean
  italic?: boolean
  maxWidth?: number
  /** CSS font-family stack. Defaults to the hand-drawn stack. */
  font?: string
}

export interface ShadowOpts {
  color: string
  blur?: number
  dx?: number
  dy?: number
}

export interface GroupOpts {
  opacity?: number
  shadow?: ShadowOpts
  clip?: { x: number; y: number; w: number; h: number }
}

export interface Surface {
  /**
   * Backend-aware coordinate jitter. Canvas uses `Math.random()` (matches v0.1
   * behavior — output flickers slightly across renders, reinforcing the
   * hand-drawn feel). SVG uses a seeded PRNG (output is byte-identical across
   * renders). Default amount: 1.8.
   */
  jitter(n: number, amount?: number): number

  rect(x: number, y: number, w: number, h: number, opts?: ShapeOpts): void
  line(x1: number, y1: number, x2: number, y2: number, opts?: StrokeOpts): void
  /** Full circle. */
  arc(cx: number, cy: number, r: number, opts?: ShapeOpts): void
  /** Partial arc (radians). `closed` connects start to end with a chord (default false). */
  arcSegment(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
    opts?: ShapeOpts & { closed?: boolean },
  ): void
  /** Raw SVG path data. Canvas backend uses Path2D(d). */
  path(d: string, opts?: ShapeOpts): void

  text(s: string, x: number, y: number, opts: TextOpts): void
  measureText(
    s: string,
    opts: { size: number; bold?: boolean; italic?: boolean; font?: string },
  ): { width: number }

  /** Run `fn` with the given visual modifiers active. */
  group(opts: GroupOpts, fn: () => void): void
}

export const DEFAULT_FONT = "'Patrick Hand','Comic Sans MS',cursive"

/** Build a CSS font shorthand string. */
export function fontString(opts: {
  size: number
  bold?: boolean
  italic?: boolean
  font?: string
}): string {
  const family = opts.font ?? DEFAULT_FONT
  return `${opts.bold ? 'bold ' : ''}${opts.italic ? 'italic ' : ''}${opts.size}px ${family}`
}
