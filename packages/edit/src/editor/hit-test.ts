import { layoutBox, type Page, type PageItem } from '@boceto/core'
import { HANDLES, type HandleEdge } from './state'

/** Distance (in canvas pixels) for handle hit padding around its center. */
const HANDLE_HIT = 7

export interface HitResult {
  /** The top-level PageItem hit, if any. */
  item: PageItem | null
}

export interface HandleHit {
  edge: HandleEdge
}

/**
 * Walk `page.elements` in reverse z-order (last drawn = first checked) and
 * return the top-most item whose `layoutBox` contains the point. Items
 * nested inside a `FlexContainer` or `ComponentInstance` are NOT directly
 * hit-testable in v0.2 — the container is the unit.
 */
export function hitTestTop(page: Page, x: number, y: number): PageItem | null {
  for (let i = page.elements.length - 1; i >= 0; i--) {
    const item = page.elements[i]!
    const b = layoutBox(item)
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return item
    }
  }
  return null
}

/**
 * Walk `page.elements` in reverse z-order looking for the top-most renderable
 * item under the point, **including** items inside flex containers and
 * expanded composite instances. Used for double-click label edit, which
 * targets the visible leaf.
 */
export function hitTestLeaf(page: Page, x: number, y: number): PageItem | null {
  return hitLeafRec(page.elements, x, y)
}

function hitLeafRec(items: readonly PageItem[], x: number, y: number): PageItem | null {
  // Iterate reverse so children drawn last are checked first; but we still
  // recurse INTO every parent that contains the point, looking for deeper
  // hits before falling back to the parent itself.
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!
    const b = layoutBox(item)
    if (!(x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)) continue

    // Recurse into containers/composites for a deeper hit first.
    const deeperChildren = getRecurseChildren(item)
    if (deeperChildren) {
      const inner = hitLeafRec(deeperChildren, x, y)
      if (inner) return inner
    }
    return item
  }
  return null
}

function getRecurseChildren(item: PageItem): readonly PageItem[] | null {
  if ('kind' in item) {
    if (item.kind === 'flex-container') return item.children
    if (item.kind === 'component-instance') return item.expanded
  }
  // Element-as-container with `children`.
  if ('children' in item && Array.isArray(item.children)) return item.children
  return null
}

/**
 * Given a bounding box (typically the selection bbox) and a point, return
 * which of the 8 resize handles was hit, or `null` if the point is outside
 * every handle. Each handle is a square centered on its anchor with side
 * `HANDLE_HIT * 2`.
 */
export function hitHandle(
  box: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
): HandleHit | null {
  const { x: bx, y: by, w, h } = box
  const anchors: Record<HandleEdge, [number, number]> = {
    nw: [bx, by],
    n: [bx + w / 2, by],
    ne: [bx + w, by],
    e: [bx + w, by + h / 2],
    se: [bx + w, by + h],
    s: [bx + w / 2, by + h],
    sw: [bx, by + h],
    w: [bx, by + h / 2],
  }
  for (const edge of HANDLES) {
    const [ax, ay] = anchors[edge]
    if (Math.abs(x - ax) <= HANDLE_HIT && Math.abs(y - ay) <= HANDLE_HIT) {
      return { edge }
    }
  }
  return null
}

/**
 * Bounding box that encloses every selected top-level PageItem on `page`.
 * Returns `null` when nothing on the page is selected.
 */
export function selectionBox(
  page: Page,
  selected: ReadonlySet<string>,
): { x: number; y: number; w: number; h: number } | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  let any = false
  for (const item of page.elements) {
    if (!selected.has(item.id)) continue
    const b = layoutBox(item)
    if (b.x < x0) x0 = b.x
    if (b.y < y0) y0 = b.y
    if (b.x + b.w > x1) x1 = b.x + b.w
    if (b.y + b.h > y1) y1 = b.y + b.h
    any = true
  }
  if (!any) return null
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * Top-level items whose `layoutBox` intersects the given rect. Used for
 * rubber-band selection.
 */
export function itemsInRect(
  page: Page,
  rect: { x: number; y: number; w: number; h: number },
): string[] {
  const out: string[] = []
  for (const item of page.elements) {
    const b = layoutBox(item)
    if (rectsOverlap(b, rect)) out.push(item.id)
  }
  return out
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
}
