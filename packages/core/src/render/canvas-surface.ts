import {
  fontString,
  type GroupOpts,
  type ShapeOpts,
  type StrokeOpts,
  type Surface,
  type TextOpts,
} from './surface'

/**
 * Canvas 2D backend for `Surface`. Wraps a `CanvasRenderingContext2D` and
 * delegates each primitive to the equivalent canvas API. Jitter uses
 * `Math.random()` so output varies subtly between renders (hand-drawn feel).
 */
export class CanvasSurface implements Surface {
  constructor(public readonly ctx: CanvasRenderingContext2D) {}

  jitter(n: number, amount = 1.8): number {
    return n + (Math.random() - 0.5) * amount
  }

  rect(x: number, y: number, w: number, h: number, opts: ShapeOpts = {}): void {
    const ctx = this.ctx
    ctx.save()
    applyShape(ctx, opts)
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    if (opts.fill && opts.fill !== 'transparent') ctx.fill()
    if (opts.stroke && opts.stroke !== 'transparent') ctx.stroke()
    ctx.restore()
  }

  line(x1: number, y1: number, x2: number, y2: number, opts: StrokeOpts = {}): void {
    const ctx = this.ctx
    ctx.save()
    applyStroke(ctx, opts)
    if (opts.dash?.length) ctx.setLineDash(opts.dash)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.restore()
  }

  arc(cx: number, cy: number, r: number, opts: ShapeOpts = {}): void {
    const ctx = this.ctx
    ctx.save()
    applyShape(ctx, opts)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    if (opts.fill && opts.fill !== 'transparent') ctx.fill()
    if (opts.stroke && opts.stroke !== 'transparent') ctx.stroke()
    ctx.restore()
  }

  arcSegment(
    cx: number,
    cy: number,
    r: number,
    start: number,
    end: number,
    opts: ShapeOpts & { closed?: boolean } = {},
  ): void {
    const ctx = this.ctx
    ctx.save()
    applyShape(ctx, opts)
    ctx.beginPath()
    ctx.arc(cx, cy, r, start, end)
    if (opts.closed) ctx.closePath()
    if (opts.fill && opts.fill !== 'transparent') ctx.fill()
    if (opts.stroke && opts.stroke !== 'transparent') ctx.stroke()
    ctx.restore()
  }

  path(d: string, opts: ShapeOpts = {}): void {
    const ctx = this.ctx
    ctx.save()
    applyShape(ctx, opts)
    const path = new Path2D(d)
    if (opts.fill && opts.fill !== 'transparent') ctx.fill(path)
    if (opts.stroke && opts.stroke !== 'transparent') ctx.stroke(path)
    ctx.restore()
  }

  text(s: string, x: number, y: number, opts: TextOpts): void {
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = opts.color ?? '#222'
    ctx.textAlign = opts.align ?? 'left'
    ctx.textBaseline = opts.baseline ?? 'top'
    ctx.font = fontString(opts)
    if (opts.maxWidth != null) ctx.fillText(s, x, y, opts.maxWidth)
    else ctx.fillText(s, x, y)
    ctx.restore()
  }

  measureText(
    s: string,
    opts: { size: number; bold?: boolean; italic?: boolean; font?: string },
  ): { width: number } {
    const ctx = this.ctx
    const prev = ctx.font
    ctx.font = fontString(opts)
    const width = ctx.measureText(s).width
    ctx.font = prev
    return { width }
  }

  group(opts: GroupOpts, fn: () => void): void {
    const ctx = this.ctx
    ctx.save()
    if (opts.opacity != null) ctx.globalAlpha = opts.opacity
    if (opts.shadow) {
      ctx.shadowColor = opts.shadow.color
      ctx.shadowBlur = opts.shadow.blur ?? 0
      ctx.shadowOffsetX = opts.shadow.dx ?? 0
      ctx.shadowOffsetY = opts.shadow.dy ?? 0
    }
    if (opts.clip) {
      ctx.beginPath()
      ctx.rect(opts.clip.x, opts.clip.y, opts.clip.w, opts.clip.h)
      ctx.clip()
    }
    try {
      fn()
    } finally {
      ctx.restore()
    }
  }
}

function applyShape(ctx: CanvasRenderingContext2D, opts: ShapeOpts): void {
  if (opts.fill && opts.fill !== 'transparent') ctx.fillStyle = opts.fill
  if (opts.stroke && opts.stroke !== 'transparent') ctx.strokeStyle = opts.stroke
  if (opts.strokeWidth != null) ctx.lineWidth = opts.strokeWidth
  ctx.lineCap = opts.lineCap ?? 'round'
  ctx.lineJoin = opts.lineJoin ?? 'round'
}

function applyStroke(ctx: CanvasRenderingContext2D, opts: StrokeOpts): void {
  if (opts.stroke) ctx.strokeStyle = opts.stroke
  if (opts.strokeWidth != null) ctx.lineWidth = opts.strokeWidth
  ctx.lineCap = opts.lineCap ?? 'round'
}
