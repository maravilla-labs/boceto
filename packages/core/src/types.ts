/**
 * Boceto v0.1 element types. See spec §5.
 */
export const ELEMENT_TYPES = [
  // Layout
  'box', 'card', 'modal', 'navbar', 'divider', 'sidebar',
  // Typography
  'heading', 'label', 'breadcrumb',
  // Form
  'input', 'textarea', 'button', 'primary-button', 'select', 'checkbox', 'radio',
  'switch', 'slider', 'search', 'segmented-control',
  // Media
  'image', 'video', 'avatar',
  // Content
  'list', 'table', 'tabs', 'badge', 'progress', 'pagination', 'alert',
  'chip', 'code-block', 'accordion', 'chat-bubble', 'calendar',
  // Navigation / overlays
  'dropdown-menu', 'tooltip', 'toast',
  // Feedback
  'spinner', 'skeleton',
  // Data viz
  'chart-bar', 'chart-line', 'chart-donut',
  // Mobile chrome
  'phone-frame', 'status-bar', 'home-indicator', 'fab', 'app-icon',
  // System chrome
  'window-frame', 'browser-frame', 'terminal',
  // Form (long-tail)
  'combobox', 'date-picker', 'color-picker', 'file-upload', 'rating',
  'otp-input', 'tag-input', 'stepper-input', 'range-slider',
  // Content (long-tail)
  'tree', 'stepper', 'carousel', 'popover', 'kbd', 'quote',
  'status-dot', 'notification-bell', 'mention', 'ai-suggestion', 'presence-cursor',
  // Data viz (long-tail)
  'chart-area', 'chart-sparkline', 'gantt', 'heatmap', 'map', 'code-diff',
  // AR / spatial
  'glass-window', 'gaze-cursor', 'pinch-indicator', 'volumetric-scene',
  'passthrough-frame', 'voice-input',
] as const

export type ElementType = (typeof ELEMENT_TYPES)[number]

export type AttrValue = string | number

/**
 * Resolved layout box written by `applyFlexLayout()` when an item is laid out
 * inside a `FlexContainer`. Top-level items (not inside a container) have no
 * `computed` field — renderers fall back to the declared `x/y/w/h`.
 */
export interface ComputedBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Per-child flex props. Only meaningful when the element is a child of a
 * `FlexContainer`. Outside a container these are ignored.
 */
export interface FlexChildProps {
  /** `flex-grow`. Default 0. */
  grow?: number
  /** `flex-shrink`. Default 1. */
  shrink?: number
  /** `flex-basis` in pixels, or `'auto'` (default). */
  basis?: number | 'auto'
  /** Per-child override of the container's `align`. Default `'auto'`. */
  alignSelf?: 'auto' | 'start' | 'middle' | 'end' | 'stretch'
  /** Min/max constraints on the main and cross axes (pixels). */
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

export interface Element extends FlexChildProps {
  id: string
  type: ElementType
  /** Declared X. When inside a `FlexContainer`, used as the "preferred" main-axis size for row direction or cross-axis size for col. */
  x: number
  y: number
  /**
   * Declared width / height. `0` means "no preferred size" (flex grow/basis,
   * align=stretch, or block-form layout decides the final value, written to
   * `computed`). The DSL accepts the literal token `auto` and parses it to
   * `0` so it round-trips through serialize as `0`.
   */
  w: number
  h: number
  label: string
  note?: string
  attrs: Record<string, AttrValue>
  /** Filled by `applyFlexLayout()` when this element is laid out by a container. */
  computed?: ComputedBox
  /**
   * Block-form children. Present when the source line used a trailing `:` to
   * open a children block. The element's chrome (border/header/etc.) draws
   * normally; children render inside its content rect — either flex-laid-out
   * (when `direction` is set, matching `FlexContainer` semantics) or
   * absolute (children's declared `(x,y)` are relative to the content rect).
   */
  children?: PageItem[]
  /**
   * Flex-container attrs for the children rect. Only consulted when
   * `children` is present. `direction` set ⇒ flex layout; unset ⇒
   * absolute body (children at declared local coords).
   */
  direction?: FlexDirection
  gap?: number
  padding?: number
  justify?: FlexJustify
  align?: FlexAlign
  wrap?: FlexWrap
}

/**
 * Flex direction for a `FlexContainer`.
 *  - `row` — children flow left → right (main axis = X).
 *  - `col` — children flow top → bottom (main axis = Y).
 */
export type FlexDirection = 'row' | 'col'
export type FlexJustify = 'start' | 'middle' | 'end' | 'between' | 'around' | 'evenly'
export type FlexAlign = 'start' | 'middle' | 'end' | 'stretch'
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse'

/**
 * First-class layout container produced from `row` / `col` source blocks.
 * Unlike v0.1's parser-sugar row/col, FlexContainers **round-trip** through
 * parse → serialize → parse and survive as items in `Page.elements`.
 *
 * Layout is computed by a separate `applyFlexLayout(doc)` pass (powered by
 * Yoga); renderers consume the `computed` box on each container/child.
 */
export interface FlexContainer extends FlexChildProps {
  kind: 'flex-container'
  /** Auto-generated (`p<N>f<N>`) or supplied via `row#id` / `col#id` shorthand. */
  id: string
  /** Source keyword that produced this container; also the main-axis direction. */
  direction: FlexDirection
  /** Declared frame (top-left + outer size). When width or height is `auto`, layout sizes it from children. */
  x: number
  y: number
  /** Pixel value, or `'auto'` to size from children along the main/cross axis. */
  w: number | 'auto'
  h: number | 'auto'
  /** Inner padding (pixels, applied to all four edges). Default 0. */
  padding: number
  /** Gap between children (pixels). Default 0. */
  gap: number
  /** Main-axis distribution. Default `'start'`. */
  justify: FlexJustify
  /** Cross-axis alignment. Defaults: row → `'middle'`, col → `'start'` (back-compat with v0.1 row/col). */
  align: FlexAlign
  /** Wrap mode. Default `'nowrap'`. */
  wrap: FlexWrap
  /** Recursive — children may be elements, composite instances, or nested containers. */
  children: PageItem[]
  /** Filled by `applyFlexLayout()`. */
  computed?: ComputedBox
}

export interface Arrow {
  id: string
  from: string
  to: string
  label?: string
}

/**
 * Optional flex-shell descriptor on a `Component`. When present, the component
 * acts as a flex container: at layout time the body becomes flex children of
 * an implicit root sized to the *resolved* instance box (so the body adapts
 * when the instance is grown / shrunk / wrapped by a parent container).
 */
export interface ComponentShell {
  direction: FlexDirection
  padding: number
  gap: number
  justify: FlexJustify
  align: FlexAlign
  wrap: FlexWrap
}

/**
 * Default sizing + per-child flex props applied to every `ComponentInstance`
 * whose call site doesn't override them. Mirrors `FlexChildProps` plus
 * `w`/`h`/`minW`/`minH`/`maxW`/`maxH`. Used to give a component sensible
 * intrinsic size + constraints (e.g. a panel with `w=300 min-w=200 max-w=600`).
 */
export interface ComponentDefaults {
  w?: number | 'auto'
  h?: number | 'auto'
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  grow?: number
  shrink?: number
  basis?: number | 'auto'
  alignSelf?: 'auto' | 'start' | 'middle' | 'end' | 'stretch'
}

/**
 * A user-defined composite component. Defined once in a `component NAME(p1, p2)
 * [shell-attrs] [defaults] ... end` block; referenced by name from page bodies.
 * The renderer never sees `Component` directly — the parser expands
 * references into a `ComponentInstance` carrying a recursively-expanded
 * subtree, and the layout pass resolves boxes against the component's shell
 * (if any) using the instance's computed size.
 */
export interface Component {
  /** Identifier, must not collide with built-in `ElementType` values. */
  name: string
  /** Parameter names, unique. Used in `$name` / `${name}` substitutions inside the body. */
  params: string[]
  /** Template body — coordinates are relative to the component's (0, 0) origin. */
  body: ComponentBodyItem[]
  /**
   * Optional flex-shell. When set, the body lays out as flex children of an
   * implicit root sized to the instance's resolved box. Absent ⇒ body uses
   * absolute coords (origin = instance top-left).
   */
  shell?: ComponentShell
  /** Defaults applied to instances that don't supply their own values. */
  defaults?: ComponentDefaults
}

/**
 * Statements allowed inside a `component ... end` block. Pre-substitution:
 * `$name` placeholders are still literal in `body` items. Composites may
 * reference other composites (`ComponentInstance`) and may use `row`/`col`
 * layout containers; nesting is unrestricted other than reference cycles
 * (which the parser detects and rejects). `Slot` markers identify where the
 * call-site children should be inlined during expansion.
 */
export type ComponentBodyItem = Element | Arrow | FlexContainer | ComponentInstance | Slot

/**
 * Marker inside a component body that indicates where call-site children
 * render. Replaced during `expandInstance` with the recursively-expanded
 * contents of the matching slot.
 *
 * - `name === undefined` (or `''`) is the **anonymous default slot**. At the
 *   call site, bare children (children not wrapped in a `slot NAME ... end`
 *   sub-block) fill this slot.
 * - `name === 'header' | 'footer' | …` is a **named slot**. At the call site,
 *   children inside a `slot header ... end` sub-block fill this slot.
 */
export interface Slot {
  kind: 'slot'
  /** Undefined or empty string = anonymous default slot. */
  name?: string
}

/** Anonymous slot key used in `ComponentInstance.slots`. */
export const DEFAULT_SLOT = '' as const

/**
 * A composite call site after parser expansion. The renderer treats this like
 * a group: it iterates `expanded` (already-substituted, already-translated
 * Element list) and never needs to know the component definition.
 */
export interface ComponentInstance {
  kind: 'component-instance'
  /** Call-site id (auto or supplied via `componentName#instanceId`). */
  id: string
  /** Matches a `Component.name` in the document. */
  componentName: string
  x: number
  y: number
  /**
   * Declared width / height. `'auto'` means "use the component default (if
   * declared) or let the parent flex layout decide". Layout writes the final
   * pixel value to `computed`.
   */
  w: number | 'auto'
  h: number | 'auto'
  /** Parameter values supplied at the call site. */
  params: Record<string, string>
  /**
   * Recursively-expanded children with coordinates translated to this
   * instance's origin. The tree may contain `Element`s and `FlexContainer`s
   * (nested layout) — nested `ComponentInstance`s are themselves expanded
   * recursively, so no `ComponentInstance` appears in `expanded` of a
   * page-level instance. Element IDs are namespaced `<instanceId>.<bodyId>`
   * so multiple instances don't collide. Empty array when the instance lives
   * inside a component body and has not yet been expanded.
   */
  expanded: PageItem[]
  /**
   * Call-site slot content, keyed by slot name. Anonymous slot uses key
   * `DEFAULT_SLOT` (empty string). The values are the **unexpanded** children
   * as parsed; expansion inlines them into the corresponding `Slot` markers
   * in the component body. Absent when the call site is single-line (no `:`
   * block).
   */
  slots?: Record<string, PageItem[]>
  /** Per-child flex props if this instance is a direct child of a `FlexContainer`. */
  grow?: number
  shrink?: number
  basis?: number | 'auto'
  alignSelf?: 'auto' | 'start' | 'middle' | 'end' | 'stretch'
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  /** Filled by `applyFlexLayout()` when this instance is laid out by a container. */
  computed?: ComputedBox
}

/**
 * Items found in `Page.elements`. One of:
 *  - `Element` — a leaf primitive (`'kind'` field absent).
 *  - `ComponentInstance` — composite call site (`kind: 'component-instance'`).
 *  - `FlexContainer` — layout container holding `children` (`kind: 'flex-container'`).
 *
 * Use the `isComponentInstance` / `isFlexContainer` type guards to
 * discriminate.
 */
export type PageItem = Element | ComponentInstance | FlexContainer

export interface Page {
  id: string
  name: string
  elements: PageItem[]
  arrows: Arrow[]
}

export interface BocetoDoc {
  pages: Page[]
  /** All component definitions in source order. Empty array if none defined. */
  components: Component[]
}

export interface ParseOptions {
  /**
   * When true, treat input as a single boceto block (no fence markers, no
   * `--- Page` separators). Default false: input is treated as either markdown
   * containing fenced blocks or a standalone .boceto file.
   */
  raw?: boolean
  /**
   * Additional source(s) whose `component … end` definitions feed the
   * component registry before `source` is parsed. Use this when `source` is a
   * single block that references components defined in **sibling** blocks
   * (e.g. one TipTap node citing a component defined in another). Pages
   * derived from `imports` are discarded — only the definitions are merged.
   *
   * Each entry may be a fenced markdown block (` ```boceto … ``` `) or raw
   * DSL; both round-trip through `extractBlocks`.
   *
   * Ignored when `raw` is set (raw mode skips Pass-1 entirely).
   */
  imports?: string | string[]
}

/** Type guard: returns true if a `PageItem` is a `ComponentInstance`. */
export function isComponentInstance(item: PageItem): item is ComponentInstance {
  return 'kind' in item && item.kind === 'component-instance'
}

/** Type guard: returns true if a `PageItem` is a `FlexContainer`. */
export function isFlexContainer(item: PageItem): item is FlexContainer {
  return 'kind' in item && item.kind === 'flex-container'
}

/**
 * Type guard for `Slot` markers. Slots only appear in `Component.body` (and
 * transitively in raw `ComponentInstance.expanded` before expansion). They
 * should never reach the renderer — expansion replaces them with the
 * matching call-site children.
 */
export function isSlot(item: PageItem | Slot | Arrow): item is Slot {
  return 'kind' in item && item.kind === 'slot'
}

/**
 * Resolved layout box for a `PageItem`. Returns `item.computed` if the layout
 * pass has populated it; otherwise falls back to the declared `{x,y,w,h}`.
 * Container `w`/`h: 'auto'` collapse to 0 when no computed value exists yet.
 */
export function layoutBox(item: Element | ComponentInstance | FlexContainer): ComputedBox {
  if (item.computed) return item.computed
  const w = typeof item.w === 'number' ? item.w : 0
  const h = typeof item.h === 'number' ? item.h : 0
  return { x: item.x, y: item.y, w, h }
}

/**
 * Walk a `PageItem` tree and yield every leaf `Element` ready for the
 * renderer, with its `x/y/w/h` resolved against `applyFlexLayout()` output.
 *
 *  - Top-level `Element`s pass through with their declared coords.
 *  - `FlexContainer`s descend recursively into their `children`.
 *  - `ComponentInstance`s recurse into their `expanded` subtree, translating
 *    each item by the delta between the instance's declared `x/y` and its
 *    `computed.x/y` (so composites laid out by a parent container appear in
 *    the right place).
 *
 * Returned `Element`s are shallow copies with `x/y/w/h` overridden — the
 * source items in the doc are not mutated.
 */
export function* iterateRenderables(
  items: readonly PageItem[],
  offsetX: number = 0,
  offsetY: number = 0,
): Iterable<Element> {
  for (const item of items) {
    if (isFlexContainer(item)) {
      // FlexContainer children that have been laid out by Yoga already carry
      // absolute computed coords; descend without adding offset for those.
      // Items still without computed (e.g. inside an unrun absolute-body
      // subtree) inherit the parent offset to translate declared coords.
      yield* iterateRenderables(item.children, offsetX, offsetY)
      continue
    }
    if (isComponentInstance(item)) {
      // Delta only applies to body items that DON'T have absolute computed
      // coords yet. Items with computed (shell layout produced absolute
      // boxes) are already in page-space — passing the delta would
      // double-translate them.
      const box = layoutBox(item)
      const dx = box.x - item.x + offsetX
      const dy = box.y - item.y + offsetY
      yield* iterateRenderables(item.expanded, dx, dy)
      continue
    }
    // Element. Computed coords (from layout pass) are absolute — render
    // them directly. Declared coords with no computed get the inherited
    // offset (delta from an ancestor's repositioning).
    let yielded: Element
    if (item.computed) {
      yielded = {
        ...item,
        x: item.computed.x,
        y: item.computed.y,
        w: item.computed.w,
        h: item.computed.h,
      }
    } else if (offsetX !== 0 || offsetY !== 0) {
      yielded = { ...item, x: item.x + offsetX, y: item.y + offsetY }
    } else {
      yielded = item
    }
    yield yielded
    // Element-as-container: chrome rendered first (above), then descend into
    // children. Their computed coords (set by the layout pass) are absolute
    // page-space — no extra delta needed unless they're absolute-body
    // children with no computed value yet, in which case the parent's
    // resolved origin shifts them.
    if (item.children && item.children.length > 0) {
      const dx = yielded.x - item.x + offsetX
      const dy = yielded.y - item.y + offsetY
      yield* iterateRenderables(item.children, dx, dy)
    }
  }
}

/**
 * Compute the union bounding box of every renderable on a page (after a
 * layout pass has run). Walks the same tree as `iterateRenderables`, so the
 * returned box mirrors exactly what the renderer would paint. Useful for
 * auto-sizing surfaces (e.g. `<boceto-view fit="content">`) to whatever the
 * mockup actually occupies.
 *
 * Returns `null` when the page has no renderables — callers should fall back
 * to their declared / default dimensions.
 */
export function pageContentBox(
  items: readonly PageItem[],
): { x: number; y: number; w: number; h: number } | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  let any = false
  for (const el of iterateRenderables(items)) {
    const ex0 = el.x
    const ey0 = el.y
    const ex1 = el.x + el.w
    const ey1 = el.y + el.h
    if (ex0 < x0) x0 = ex0
    if (ey0 < y0) y0 = ey0
    if (ex1 > x1) x1 = ex1
    if (ey1 > y1) y1 = ey1
    any = true
  }
  if (!any) return null
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * Find a `PageItem` by `id` anywhere in a tree. Walks into `FlexContainer`
 * children and `ComponentInstance.expanded` subtrees; returns `undefined` if
 * no match. Used by renderers to resolve arrow endpoints.
 */
export function findItemById(
  items: readonly PageItem[],
  id: string,
): Element | ComponentInstance | FlexContainer | undefined {
  for (const item of items) {
    if (item.id === id) return item
    if (isFlexContainer(item)) {
      const hit = findItemById(item.children, id)
      if (hit) return hit
    } else if (isComponentInstance(item)) {
      const hit = findItemById(item.expanded, id)
      if (hit) return hit
    } else if (item.children && item.children.length > 0) {
      // Element-as-container — walk into its children too.
      const hit = findItemById(item.children, id)
      if (hit) return hit
    }
  }
  return undefined
}
