import type { BocetoDoc, Page } from '../types'

export interface RenderOptions {
  /**
   * Which page to render (by id or index). Defaults to the first page.
   */
  page?: string | number
  /** Logical canvas width (px). Defaults to 860. */
  width?: number
  /** Logical canvas height (px). Defaults to 600. */
  height?: number
  /** Show paper background + dotted grid. Default true. */
  grid?: boolean
  /**
   * IDs of currently-selected `PageItem`s. Top-level `Element` selections are
   * threaded into `DrawState.selected` so the element renderer paints its own
   * outline + handles. For top-level `FlexContainer` / `ComponentInstance`
   * selections (which don't appear in the renderable stream), the renderer
   * draws a chrome overlay on top.
   */
  selectedIds?: ReadonlySet<string>
  /**
   * ID of the currently-hovered `PageItem`. Threaded into `DrawState.hovered`
   * for top-level elements only; containers don't paint a hover state in v0.2.
   */
  hoveredId?: string
  /**
   * Uniform zoom factor applied to page items (and selection chrome) but
   * NOT to the paper / grid background — so the grid always covers the
   * full canvas. Defaults to `1` (no zoom). Values less than 1 shrink
   * content to fit a smaller canvas; values greater than 1 enlarge.
   * Pointer hit-testing must divide by this value to recover doc coords.
   */
  zoom?: number
}

export interface Renderer {
  render(doc: BocetoDoc, options?: RenderOptions): void
}

export function selectPage(doc: BocetoDoc, page?: string | number): Page | undefined {
  if (doc.pages.length === 0) return undefined
  if (page === undefined) return doc.pages[0]
  if (typeof page === 'number') return doc.pages[page]
  return doc.pages.find((p) => p.id === page || p.name === page) ?? doc.pages[0]
}
