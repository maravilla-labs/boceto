import {
  applyFlexLayout,
  isComponentInstance,
  isFlexContainer,
  isYogaReady,
  layoutBox,
  type AttrValue,
  type BocetoDoc,
  type ComponentInstance,
  type Element,
  type ElementType,
  type FlexContainer,
  type Page,
  type PageItem,
} from '@boceto/core'
import type { HandleEdge } from './state'

/**
 * Pure(-ish) mutation helpers used by `BocetoEditor`. They mutate the doc
 * in place (controller's reference is replaced atomically before/after) and
 * return either the mutated entity or `null` when the mutation is rejected
 * (e.g. trying to drag a child of a layout container).
 *
 * Geometry mutations operate on **top-level PageItems only** — items found
 * inside a `FlexContainer.children` or `ComponentInstance.expanded` are
 * layout-derived in v0.2 and refusing them surfaces honest errors to the UI.
 */

const AUTO_ELEMENT_ID_RE = /^p\d+e\d+$/

/**
 * Locate which page (and at what top-level index) owns the given id. Returns
 * `null` when the id refers to a nested item (inside a flex container or
 * composite body) — those are not directly editable in v0.2.
 */
export function findTopLevel(
  doc: BocetoDoc,
  id: string,
): { page: Page; item: PageItem; index: number } | null {
  for (const page of doc.pages) {
    for (let i = 0; i < page.elements.length; i++) {
      const item = page.elements[i]!
      if (item.id === id) return { page, item, index: i }
    }
  }
  return null
}

/**
 * Locate any item by id, including nested ones. Used for property edits
 * (label / attrs) that ARE allowed on nested items.
 */
export function findAny(doc: BocetoDoc, id: string): PageItem | null {
  for (const page of doc.pages) {
    const hit = findInItems(page.elements, id)
    if (hit) return hit
  }
  return null
}

function findInItems(items: readonly PageItem[], id: string): PageItem | null {
  for (const item of items) {
    if (item.id === id) return item
    if (isFlexContainer(item)) {
      const hit = findInItems(item.children, id)
      if (hit) return hit
    } else if (isComponentInstance(item)) {
      const hit = findInItems(item.expanded, id)
      if (hit) return hit
    } else if (item.children) {
      const hit = findInItems(item.children, id)
      if (hit) return hit
    }
  }
  return null
}

/**
 * Translate a top-level item's origin by (dx, dy). Children inside a
 * `FlexContainer` re-layout automatically when `applyFlexLayout` runs.
 * ComponentInstance.expanded children carry baked-in coords; we leave those
 * untouched since the layout pass recomputes them too.
 *
 * The result is rounded to integer pixels and clamped to (x, y) ≥ 0 —
 * the Boceto DSL grammar requires non-negative integers for positional
 * slots, so fractional pointer deltas would break the next parse round
 * (the `<boceto-view>` companion would silently fail on the resulting
 * source).
 */
export function moveItem(item: PageItem, dx: number, dy: number): void {
  item.x = Math.max(0, Math.round(item.x + dx))
  item.y = Math.max(0, Math.round(item.y + dy))
}

/**
 * Resize a top-level item by dragging the given handle. `dx` / `dy` are the
 * pointer deltas in canvas pixels relative to the pointer-down position
 * (NOT cumulative within a drag — callers feed the total delta each tick).
 *
 * For `FlexContainer` items whose declared `w` or `h` is `'auto'`, we keep
 * `'auto'` in that axis and only mutate the explicit one.
 */
export function resizeItem(
  item: PageItem,
  edge: HandleEdge,
  dx: number,
  dy: number,
  origin: { x: number; y: number; w: number; h: number },
  minSize = 16,
): void {
  let { x, y, w, h } = origin
  if (edge.includes('w')) {
    const newX = x + dx
    const newW = w - dx
    if (newW >= minSize) {
      x = newX
      w = newW
    }
  }
  if (edge.includes('e')) {
    const newW = w + dx
    if (newW >= minSize) w = newW
  }
  if (edge.includes('n')) {
    const newY = y + dy
    const newH = h - dy
    if (newH >= minSize) {
      y = newY
      h = newH
    }
  }
  if (edge.includes('s')) {
    const newH = h + dy
    if (newH >= minSize) h = newH
  }
  item.x = Math.max(0, Math.round(x))
  item.y = Math.max(0, Math.round(y))
  if (isAutoSizedContainer(item, 'w')) {
    // leave w='auto'
  } else {
    ;(item as Element | FlexContainer | ComponentInstance).w = Math.max(minSize, Math.round(w))
  }
  if (isAutoSizedContainer(item, 'h')) {
    // leave h='auto'
  } else {
    ;(item as Element | FlexContainer | ComponentInstance).h = Math.max(minSize, Math.round(h))
  }
}

function isAutoSizedContainer(item: PageItem, axis: 'w' | 'h'): boolean {
  if (isFlexContainer(item) || isComponentInstance(item)) {
    return item[axis] === 'auto'
  }
  return false
}

export function appendElement(
  page: Page,
  type: ElementType,
  x: number,
  y: number,
  opts: { w?: number; h?: number; label?: string } = {},
): Element {
  const id = mintElementId(page)
  const el: Element = {
    id,
    type,
    x,
    y,
    w: opts.w ?? 120,
    h: opts.h ?? 36,
    label: opts.label ?? '',
    attrs: {},
  }
  page.elements.push(el)
  return el
}

/**
 * Mint an auto-style element id (`p<N>e<M>`) that doesn't collide with any
 * existing id on the page. We reuse the parser's auto format so
 * `serialize(doc)` doesn't suffix `#id` after the type token.
 */
function mintElementId(page: Page): string {
  const pageNum = pageNumberFromId(page.id)
  const used = new Set<string>()
  for (const it of page.elements) collectIds(it, used)
  let n = 0
  while (used.has(`p${pageNum}e${n}`)) n++
  return `p${pageNum}e${n}`
}

function collectIds(item: PageItem, into: Set<string>): void {
  into.add(item.id)
  if (isFlexContainer(item)) {
    for (const c of item.children) collectIds(c, into)
  } else if (isComponentInstance(item)) {
    for (const c of item.expanded) collectIds(c, into)
  } else if (item.children) {
    for (const c of item.children) collectIds(c, into)
  }
}

function pageNumberFromId(pageId: string): number {
  const m = /^p(\d+)$/.exec(pageId)
  return m ? Number(m[1]) : 0
}

/**
 * Remove the top-level items whose ids are in `ids`. Returns the count
 * actually removed (an id pointing at a nested item is ignored).
 */
export function removeTopLevel(doc: BocetoDoc, ids: ReadonlySet<string>): number {
  let removed = 0
  for (const page of doc.pages) {
    const next = page.elements.filter((it) => {
      if (ids.has(it.id)) {
        removed++
        return false
      }
      return true
    })
    if (next.length !== page.elements.length) page.elements = next
    // Also drop arrows whose endpoints went away.
    if (removed > 0) {
      page.arrows = page.arrows.filter((a) => !ids.has(a.from) && !ids.has(a.to))
    }
  }
  return removed
}

/**
 * Duplicate the given top-level items, offset by (12, 12) so the copies are
 * visible. Returns the new ids. Nested items are ignored.
 */
export function duplicateTopLevel(doc: BocetoDoc, ids: ReadonlySet<string>): string[] {
  const created: string[] = []
  for (const page of doc.pages) {
    // Snapshot original ids so the loop doesn't see its own clones.
    const targets = page.elements.filter((it) => ids.has(it.id))
    for (const item of targets) {
      // Only support duplicating plain Elements for v0.2. Flex containers
      // and composite instances have nested ids we'd need to rewrite.
      if (isFlexContainer(item) || isComponentInstance(item)) continue
      const clone: Element = {
        ...item,
        id: mintElementId(page),
        x: item.x + 12,
        y: item.y + 12,
        attrs: { ...item.attrs },
      }
      page.elements.push(clone)
      created.push(clone.id)
    }
  }
  return created
}

export function setLabelOf(doc: BocetoDoc, id: string, label: string): boolean {
  const item = findAny(doc, id)
  if (!item) return false
  // Flex containers carry no label; component instances inherit labels from
  // their expanded body, not the call site (the DSL slot is always empty).
  if (isFlexContainer(item) || isComponentInstance(item)) return false
  ;(item as Element).label = label
  return true
}

export function setAttrOf(
  doc: BocetoDoc,
  id: string,
  key: string,
  value: AttrValue | undefined,
): boolean {
  const item = findAny(doc, id)
  if (!item) return false
  if (isFlexContainer(item)) return false
  // ComponentInstance stores call-site params separately; we treat them
  // uniformly with element attrs for the public API.
  if (isComponentInstance(item)) {
    if (value === undefined) delete item.params[key]
    else item.params[key] = String(value)
    return true
  }
  const el = item as Element
  if (value === undefined) delete el.attrs[key]
  else el.attrs[key] = value
  return true
}

export function addPage(doc: BocetoDoc, name?: string): Page {
  const idx = doc.pages.length
  const page: Page = {
    id: `p${idx}`,
    name: name ?? `Page ${idx + 1}`,
    elements: [],
    arrows: [],
  }
  doc.pages.push(page)
  return page
}

export function removePage(doc: BocetoDoc, id: string): boolean {
  const i = doc.pages.findIndex((p) => p.id === id)
  if (i < 0) return false
  if (doc.pages.length === 1) return false // can't delete the last page
  doc.pages.splice(i, 1)
  return true
}

export function renamePage(doc: BocetoDoc, id: string, name: string): boolean {
  const p = doc.pages.find((p) => p.id === id)
  if (!p) return false
  p.name = name
  return true
}

/**
 * Resolve a top-level item's current bbox (after the most recent layout
 * pass). Convenience wrapper around `layoutBox` from core that handles the
 * `auto` width/height case for new containers.
 */
export function currentBox(item: PageItem): { x: number; y: number; w: number; h: number } {
  return layoutBox(item)
}

/**
 * Run the flex layout pass. Called after any geometry mutation so computed
 * boxes stay in sync. Skips silently when Yoga's WASM hasn't loaded yet —
 * the `<boceto-edit>` host awaits `initYoga()` before its first render, and
 * at that point the layout pass re-runs naturally. Headless consumers
 * should `await initYoga()` themselves before reading layout-derived
 * coords; mutations before that point are still recorded correctly.
 */
export function relayout(doc: BocetoDoc): void {
  if (!isYogaReady()) return
  applyFlexLayout(doc)
}

/** Marker for the auto-id format so callers can decide whether to keep it. */
export function isAutoElementId(id: string): boolean {
  return AUTO_ELEMENT_ID_RE.test(id)
}

/**
 * Reorder top-level items in their page's `elements` array to change the
 * z-order. Rendering walks the array in source order, so the last item is
 * painted on top. The four modes match the design-tool convention:
 *
 *   - `'front'`    move selected items to the end of the array (top).
 *   - `'back'`     move selected items to the start (bottom).
 *   - `'forward'`  swap each selected item with the next non-selected item
 *                  (one step toward the top).
 *   - `'backward'` swap with the previous non-selected item (one step back).
 *
 * Selected items keep their *relative* order to each other. Returns the number
 * of pages that were actually modified.
 */
export function reorderItems(
  doc: BocetoDoc,
  ids: ReadonlySet<string>,
  mode: 'front' | 'back' | 'forward' | 'backward',
): number {
  if (ids.size === 0) return 0
  let touched = 0
  for (const page of doc.pages) {
    const before = page.elements
    if (!before.some((it) => ids.has(it.id))) continue
    const next = reorderArray(before, ids, mode)
    if (!sameRefs(before, next)) {
      page.elements = next
      touched++
    }
  }
  return touched
}

function reorderArray<T extends { id: string }>(
  items: readonly T[],
  ids: ReadonlySet<string>,
  mode: 'front' | 'back' | 'forward' | 'backward',
): T[] {
  if (mode === 'front') {
    const stay: T[] = []
    const moved: T[] = []
    for (const it of items) (ids.has(it.id) ? moved : stay).push(it)
    return [...stay, ...moved]
  }
  if (mode === 'back') {
    const stay: T[] = []
    const moved: T[] = []
    for (const it of items) (ids.has(it.id) ? moved : stay).push(it)
    return [...moved, ...stay]
  }
  // Step modes: walk and swap once per selected item against the
  // nearest non-selected neighbour. Iterating in the right direction
  // prevents repeatedly moving the same item.
  const arr = items.slice()
  if (mode === 'forward') {
    for (let i = arr.length - 2; i >= 0; i--) {
      if (ids.has(arr[i]!.id) && !ids.has(arr[i + 1]!.id)) {
        ;[arr[i], arr[i + 1]] = [arr[i + 1]!, arr[i]!]
      }
    }
  } else {
    for (let i = 1; i < arr.length; i++) {
      if (ids.has(arr[i]!.id) && !ids.has(arr[i - 1]!.id)) {
        ;[arr[i], arr[i - 1]] = [arr[i - 1]!, arr[i]!]
      }
    }
  }
  return arr
}

function sameRefs<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
