import { mulberry32 } from '../random'
import {
  fontString,
  type GroupOpts,
  type ShapeOpts,
  type StrokeOpts,
  type Surface,
  type TextOpts,
} from './surface'

/**
 * SVG backend for `Surface`. Accumulates an array of SVG element strings;
 * `flush()` returns a complete `<svg>` document.
 *
 * Determinism: jitter uses a seeded Mulberry32 PRNG (seed comes from the
 * renderer, typically derived from the document or page), so the same input
 * always produces byte-identical output.
 *
 * Approximations:
 * - Text width measurement uses a heuristic based on `size × 0.55 × len`
 *   (no DOM available in Node). Good enough for navbar item layout and the
 *   breadcrumb spacing — the only places measureText is used.
 * - Drop shadows render as `<filter>` defs reused across the document.
 * - `clip` uses a `<clipPath>` def referenced by the wrapping `<g>`.
 */
export class SvgSurface implements Surface {
  #parts: string[] = []
  #defs: string[] = []
  #defCounter = 0
  #rng: () => number

  constructor(seed: number) {
    this.#rng = mulberry32(seed)
  }

  jitter(n: number, amount = 1.8): number {
    return n + (this.#rng() - 0.5) * amount
  }

  rect(x: number, y: number, w: number, h: number, opts: ShapeOpts = {}): void {
    const attrs = shapeAttrs(opts)
    this.#parts.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"${attrs}/>`)
  }

  line(x1: number, y1: number, x2: number, y2: number, opts: StrokeOpts = {}): void {
    const attrs = strokeAttrs(opts)
    let dash = ''
    if (opts.dash?.length) dash = ` stroke-dasharray="${opts.dash.join(' ')}"`
    this.#parts.push(
      `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"${attrs}${dash}/>`,
    )
  }

  arc(cx: number, cy: number, r: number, opts: ShapeOpts = {}): void {
    const attrs = shapeAttrs(opts)
    this.#parts.push(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"${attrs}/>`)
  }

  arcSegment(
    cx: number,
    cy: number,
    r: number,
    start: number,
    end: number,
    opts: ShapeOpts & { closed?: boolean } = {},
  ): void {
    const attrs = shapeAttrs(opts)
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const large = end - start > Math.PI ? 1 : 0
    const sweep = end > start ? 1 : 0
    let d = `M ${fmt(x1)} ${fmt(y1)} A ${fmt(r)} ${fmt(r)} 0 ${large} ${sweep} ${fmt(x2)} ${fmt(y2)}`
    if (opts.closed) d += ' Z'
    this.#parts.push(`<path d="${d}"${attrs}/>`)
  }

  path(d: string, opts: ShapeOpts = {}): void {
    const attrs = shapeAttrs(opts)
    this.#parts.push(`<path d="${d}"${attrs}/>`)
  }

  text(s: string, x: number, y: number, opts: TextOpts): void {
    const fill = opts.color ?? '#222'
    const align = opts.align ?? 'left'
    const baseline = opts.baseline ?? 'top'
    const size = opts.size
    const weight = opts.bold ? ' font-weight="bold"' : ''
    const style = opts.italic ? ' font-style="italic"' : ''
    const family = (opts.font ?? "'Patrick Hand','Comic Sans MS',cursive").replace(/"/g, '&quot;')
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
    const dy = baselineToDy(baseline, size)
    this.#parts.push(
      `<text x="${fmt(x)}" y="${fmt(y + dy)}" fill="${escapeAttr(fill)}" font-size="${size}" font-family="${family}" text-anchor="${anchor}"${weight}${style}>${escapeText(s)}</text>`,
    )
  }

  measureText(
    s: string,
    opts: { size: number; bold?: boolean; italic?: boolean; font?: string },
  ): { width: number } {
    // Heuristic: hand-drawn fonts hover around 0.55em average glyph width.
    // Bold adds a bit, italic about the same. Good enough for the layouts
    // measureText is called in (navbar item placement, breadcrumb spacing).
    const factor = opts.bold ? 0.6 : 0.55
    return { width: s.length * opts.size * factor }
  }

  group(opts: GroupOpts, fn: () => void): void {
    const attrs: string[] = []
    if (opts.opacity != null) attrs.push(`opacity="${opts.opacity}"`)
    if (opts.shadow) {
      const id = this.#nextDefId('shadow')
      this.#defs.push(
        `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${opts.shadow.dx ?? 0}" dy="${opts.shadow.dy ?? 0}" stdDeviation="${(opts.shadow.blur ?? 0) / 2}" flood-color="${escapeAttr(opts.shadow.color)}"/></filter>`,
      )
      attrs.push(`filter="url(#${id})"`)
    }
    if (opts.clip) {
      const id = this.#nextDefId('clip')
      this.#defs.push(
        `<clipPath id="${id}"><rect x="${fmt(opts.clip.x)}" y="${fmt(opts.clip.y)}" width="${fmt(opts.clip.w)}" height="${fmt(opts.clip.h)}"/></clipPath>`,
      )
      attrs.push(`clip-path="url(#${id})"`)
    }
    this.#parts.push(`<g${attrs.length ? ' ' + attrs.join(' ') : ''}>`)
    try {
      fn()
    } finally {
      this.#parts.push('</g>')
    }
  }

  /**
   * Wrap accumulated content in an `<svg>` document.
   */
  flush(
    width: number,
    height: number,
    options: { background?: string | null; grid?: boolean } = {},
  ): string {
    const bgRect =
      options.background === null
        ? ''
        : `<rect width="${width}" height="${height}" fill="${escapeAttr(options.background ?? '#fafaf8')}"/>`
    let grid = ''
    if (options.grid !== false) {
      const dots: string[] = []
      for (let gx = 20; gx < width; gx += 20) {
        for (let gy = 20; gy < height; gy += 20) {
          dots.push(`<rect x="${gx}" y="${gy}" width="1.5" height="1.5" fill="#e8e8e4"/>`)
        }
      }
      grid = dots.join('')
    }
    const defs = this.#defs.length ? `<defs>${this.#defs.join('')}</defs>` : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${defs}${bgRect}${grid}${this.#parts.join('')}</svg>`
  }

  #nextDefId(prefix: string): string {
    return `${prefix}-${this.#defCounter++}`
  }
}

function shapeAttrs(opts: ShapeOpts): string {
  const out: string[] = []
  out.push(` fill="${escapeAttr(opts.fill && opts.fill !== 'transparent' ? opts.fill : 'none')}"`)
  if (opts.stroke && opts.stroke !== 'transparent') out.push(` stroke="${escapeAttr(opts.stroke)}"`)
  else out.push(' stroke="none"')
  if (opts.strokeWidth != null) out.push(` stroke-width="${opts.strokeWidth}"`)
  out.push(` stroke-linecap="${opts.lineCap ?? 'round'}"`)
  out.push(` stroke-linejoin="${opts.lineJoin ?? 'round'}"`)
  return out.join('')
}

function strokeAttrs(opts: StrokeOpts): string {
  const out: string[] = [' fill="none"']
  if (opts.stroke) out.push(` stroke="${escapeAttr(opts.stroke)}"`)
  if (opts.strokeWidth != null) out.push(` stroke-width="${opts.strokeWidth}"`)
  out.push(` stroke-linecap="${opts.lineCap ?? 'round'}"`)
  return out.join('')
}

function fmt(n: number): string {
  // Trim float noise; SVG accepts integer-looking values for integer coords.
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function baselineToDy(b: NonNullable<TextOpts['baseline']>, size: number): number {
  // Convert canvas baseline → SVG dominant-baseline isn't widely supported;
  // approximate by shifting the y coordinate. SVG default baseline is the
  // text's alphabetic line (close to bottom). To mimic canvas's `top`,
  // shift down by ~0.8em; for `middle`, ~0.35em; for `bottom`, no shift.
  switch (b) {
    case 'top':
      return size * 0.8
    case 'middle':
      return size * 0.35
    case 'bottom':
      return 0
    case 'alphabetic':
    default:
      return 0
  }
}

// Re-exported so consumers can import from `@boceto/core` directly.
export { fontString }
