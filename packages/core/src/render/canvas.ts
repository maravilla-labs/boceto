import type { BocetoDoc, Element } from '../types'
import { isComponentInstance } from '../types'
import { drawElement } from '../elements'
import { arrow as drawArrow } from '../elements/primitives'
import { CanvasSurface } from './canvas-surface'
import { selectPage, type Renderer, type RenderOptions } from './types'

export class CanvasRenderer implements Renderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  render(doc: BocetoDoc, options: RenderOptions = {}): void {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    const w = options.width ?? this.canvas.width
    const h = options.height ?? this.canvas.height
    if (this.canvas.width !== w) this.canvas.width = w
    if (this.canvas.height !== h) this.canvas.height = h

    ctx.clearRect(0, 0, w, h)

    if (options.grid !== false) {
      ctx.fillStyle = '#fafaf8'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#e8e8e4'
      for (let gx = 20; gx < w; gx += 20) {
        for (let gy = 20; gy < h; gy += 20) {
          ctx.fillRect(gx, gy, 1.5, 1.5)
        }
      }
    }

    const page = selectPage(doc, options.page)
    if (!page) return

    const surface = new CanvasSurface(ctx)

    for (const ar of page.arrows) {
      const from = page.elements.find((e) => e.id === ar.from)
      const to = page.elements.find((e) => e.id === ar.to)
      if (!from || !to) continue
      drawArrow(surface, from.x + from.w / 2, from.y + from.h, to.x + to.w / 2, to.y, {
        label: ar.label,
      })
    }

    for (const item of page.elements) {
      if (isComponentInstance(item)) {
        for (const child of item.expanded) drawElement(surface, child)
      } else {
        drawElement(surface, item as Element)
      }
    }
  }
}
