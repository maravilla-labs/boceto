import type { BocetoDoc } from '../types'
import { findItemById, iterateRenderables, layoutBox } from '../types'
import { drawElement } from '../elements'
import { arrow as drawArrow } from '../elements/primitives'
import { hashString } from '../random'
import { SvgSurface } from './svg-surface'
import { selectPage, type RenderOptions } from './types'

export interface SvgRenderOptions extends RenderOptions {
  /** Seed for the deterministic jitter PRNG. Defaults to a hash of the page id. */
  seed?: number
  /** Background color. Pass `null` to omit the paper rect. Default `#fafaf8`. */
  background?: string | null
}

const DEFAULT_W = 860
const DEFAULT_H = 600

/**
 * SVG renderer. Produces a complete `<svg>...</svg>` string with no external
 * dependencies — safe for SSR, GitHub READMEs, RSS readers, static-site
 * generators. Uses a seeded PRNG so identical input produces byte-identical
 * output (cacheable).
 */
export class SvgRenderer {
  /**
   * Render one page of `doc` as an SVG document string.
   */
  renderToString(doc: BocetoDoc, options: SvgRenderOptions = {}): string {
    const w = options.width ?? DEFAULT_W
    const h = options.height ?? DEFAULT_H
    const page = selectPage(doc, options.page)
    if (!page) {
      const surface = new SvgSurface(0)
      return surface.flush(w, h, {
        background: options.background ?? undefined,
        grid: options.grid,
      })
    }

    const seed = options.seed ?? hashString(page.id + ':' + page.name)
    const surface = new SvgSurface(seed)

    for (const ar of page.arrows) {
      const from = findItemById(page.elements, ar.from)
      const to = findItemById(page.elements, ar.to)
      if (!from || !to) continue
      const f = layoutBox(from)
      const t = layoutBox(to)
      drawArrow(surface, f.x + f.w / 2, f.y + f.h, t.x + t.w / 2, t.y, {
        label: ar.label,
      })
    }

    for (const el of iterateRenderables(page.elements)) {
      drawElement(surface, el)
    }

    return surface.flush(w, h, {
      background: options.background,
      grid: options.grid,
    })
  }
}

export { SvgSurface }
