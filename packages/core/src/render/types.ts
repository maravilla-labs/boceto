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
