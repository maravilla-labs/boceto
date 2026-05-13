/**
 * Yoga-powered layout pass for Boceto `FlexContainer` items.
 *
 * Yoga's WASM binary is loaded **exactly once per process** via a memoized
 * `loadYoga()` call. All `<boceto-view>` instances, the remark plugin, and
 * any other consumer share the same `Yoga` runtime.
 *
 * Usage:
 *
 *     await initYoga()             // call once at app start
 *     const laid = applyFlexLayout(parse(source))
 *     render(laid)                 // computed coords are on each item
 */

import {
  loadYoga,
  Align,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  PositionType,
  Wrap,
} from 'yoga-layout/load'
import type { Node as YogaNode, Yoga } from 'yoga-layout/load'
import type {
  BocetoDoc,
  Component,
  ComponentInstance,
  Element,
  FlexAlign,
  FlexContainer,
  FlexDirection as BocetoDirection,
  FlexJustify,
  FlexWrap,
  Page,
  PageItem,
} from '../types'
import { isComponentInstance, isFlexContainer } from '../types'
import { chromeInsets } from '../elements/insets'

/**
 * Helper: an Element that has been opened with `:` and has children attached
 * by the parser. Treated by the layout pass as a flex (or absolute) container
 * with its chrome insets added to the author's padding.
 */
function isElementContainer(item: PageItem): item is Element {
  return (
    !isFlexContainer(item) &&
    !isComponentInstance(item) &&
    (item as Element).children != null &&
    (item as Element).children!.length > 0
  )
}

type ComponentMap = ReadonlyMap<string, Component>

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Yoga runtime
// ─────────────────────────────────────────────────────────────────────────────

let yogaPromise: Promise<Yoga> | null = null
let yogaInstance: Yoga | null = null

/**
 * Load the Yoga WASM module. Idempotent and concurrency-safe: every caller
 * receives the same `Yoga` instance, and `loadYoga()` is invoked at most once
 * per process.
 *
 * Must be awaited before the first call to `applyFlexLayout()`.
 */
export async function initYoga(): Promise<void> {
  if (yogaInstance) return
  if (!yogaPromise) yogaPromise = loadYoga()
  yogaInstance = await yogaPromise
}

/** Returns `true` once Yoga has finished loading. */
export function isYogaReady(): boolean {
  return yogaInstance !== null
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walk every page, run Yoga over each `FlexContainer` subtree, and write
 * `computed: {x,y,w,h}` onto every container and every direct/indirect child.
 *
 * Items not inside a container are left unchanged — their declared `x/y/w/h`
 * remain authoritative. Returns the same `doc` reference (mutates in place;
 * the layout pass adds fields and never removes them).
 *
 * Throws if `initYoga()` has not finished.
 */
export function applyFlexLayout(doc: BocetoDoc): BocetoDoc {
  if (!yogaInstance) {
    throw new Error(
      `Boceto: applyFlexLayout() called before Yoga is ready. ` +
        `Call \`await initYoga()\` once at app start before laying out documents.`,
    )
  }
  const Yoga = yogaInstance
  const componentMap: ComponentMap = new Map(doc.components.map((c) => [c.name, c] as const))
  for (const page of doc.pages) layoutPage(Yoga, page, componentMap)
  return doc
}

function layoutPage(Yoga: Yoga, page: Page, componentMap: ComponentMap): void {
  for (const item of page.elements) layoutTopLevelItem(Yoga, item, componentMap)
}

/**
 * Lay out one top-level page item. The Yoga tree includes everything reachable
 * via FlexContainer children and shell-component bodies — a single pass so
 * intrinsic sizes (e.g. `h=auto` headers) propagate to ancestors.
 *
 *  - `FlexContainer` → build a tree rooted here.
 *  - `ComponentInstance` with shell → build a tree rooted here (treat the
 *    instance itself as the shell container).
 *  - `ComponentInstance` without shell → absolute body; descend for any
 *    FlexContainers / nested instances inside its body.
 *  - `Element` → nothing to lay out.
 */
function layoutTopLevelItem(Yoga: Yoga, item: PageItem, componentMap: ComponentMap): void {
  if (isFlexContainer(item)) {
    const root = buildYogaNode(Yoga, item, /* isRoot */ true, componentMap)
    const rootW = typeof item.w === 'number' ? item.w : ('auto' as const)
    const rootH = typeof item.h === 'number' ? item.h : ('auto' as const)
    root.calculateLayout(rootW, rootH, /* Direction.LTR */ 1)
    writeComputedFromNode(item, root, item.x, item.y, componentMap)
    root.freeRecursive()
    return
  }
  if (isElementContainer(item)) {
    // Element-as-container: chrome renders normally, but the children are
    // laid out as flex (or absolute) inside the content rect.
    const root = buildYogaNode(Yoga, item, /* isRoot */ true, componentMap)
    const rootW = typeof item.w === 'number' && item.w > 0 ? item.w : ('auto' as const)
    const rootH = typeof item.h === 'number' && item.h > 0 ? item.h : ('auto' as const)
    root.calculateLayout(rootW, rootH, /* Direction.LTR */ 1)
    writeComputedFromNode(item, root, item.x, item.y, componentMap)
    root.freeRecursive()
    return
  }
  if (isComponentInstance(item)) {
    const comp = componentMap.get(item.componentName)
    if (!comp) return
    if (comp.shell) {
      // Same recipe as FlexContainer — the instance IS the shell root.
      const root = buildYogaNode(Yoga, item, /* isRoot */ true, componentMap)
      const rootW = typeof item.w === 'number' ? item.w : ('auto' as const)
      const rootH = typeof item.h === 'number' ? item.h : ('auto' as const)
      root.calculateLayout(rootW, rootH, /* Direction.LTR */ 1)
      writeComputedFromNode(item, root, item.x, item.y, componentMap)
      root.freeRecursive()
    } else {
      // Absolute body: items keep their declared positions. Just descend for
      // any FlexContainers / nested shell-instances in the body.
      descendForAbsoluteBody(Yoga, item.expanded, componentMap)
    }
  }
}

/**
 * Walk the body of an absolute-body component instance. Items keep their
 * declared (translated-at-expansion) positions; we only need to run layout
 * for any `FlexContainer` or shell-component that lives in the body, because
 * the outer Yoga tree didn't see them.
 */
function descendForAbsoluteBody(
  Yoga: Yoga,
  items: readonly PageItem[],
  componentMap: ComponentMap,
): void {
  for (const child of items) {
    if (isFlexContainer(child) && !child.computed) {
      layoutTopLevelItem(Yoga, child, componentMap)
    } else if (isComponentInstance(child) && !child.computed) {
      layoutTopLevelItem(Yoga, child, componentMap)
    } else if (isElementContainer(child) && !child.computed) {
      layoutTopLevelItem(Yoga, child, componentMap)
    }
  }
}

/**
 * Build a Yoga node mirroring `item`'s subtree.
 *
 *  - `FlexContainer` → flex container node + recurse on children.
 *  - `ComponentInstance` with shell → flex container node (using the
 *    component's shell attrs as the container, plus the instance's own
 *    flex-child props as a child of the parent) + recurse on `expanded`.
 *  - `ComponentInstance` without shell → leaf with declared w/h.
 *  - `Element` → leaf.
 */
function buildYogaNode(
  Yoga: Yoga,
  item: PageItem,
  isRoot: boolean,
  componentMap: ComponentMap,
): YogaNode {
  const node = Yoga.Node.create()

  if (isFlexContainer(item)) {
    applyContainerStyles(
      node,
      item.direction,
      item.justify,
      item.align,
      item.wrap,
      item.gap,
      item.padding,
    )
    // `0` declared on W/H means "no explicit size" (let flex decide), same as
    // for Elements. `'auto'` does too. Treating them identically lets authors
    // write `row 0 0 0 H ...` inside a parent container without collapsing.
    if (typeof item.w === 'number' && item.w > 0) node.setWidth(item.w)
    if (typeof item.h === 'number' && item.h > 0) node.setHeight(item.h)
    if (item.minW != null) node.setMinWidth(item.minW)
    if (item.minH != null) node.setMinHeight(item.minH)
    if (item.maxW != null) node.setMaxWidth(item.maxW)
    if (item.maxH != null) node.setMaxHeight(item.maxH)
    if (!isRoot) applyChildFlexProps(node, item)
    for (let i = 0; i < item.children.length; i++) {
      node.insertChild(buildYogaNode(Yoga, item.children[i]!, /* isRoot */ false, componentMap), i)
    }
    return node
  }

  if (isComponentInstance(item)) {
    const comp = componentMap.get(item.componentName)
    if (comp?.shell) {
      // Shell-component: treat as a flex container with the shell's attrs.
      // The body items are the Yoga children.
      const s = comp.shell
      applyContainerStyles(node, s.direction, s.justify, s.align, s.wrap, s.gap, s.padding)
      if (typeof item.w === 'number' && item.w > 0) node.setWidth(item.w)
      if (typeof item.h === 'number' && item.h > 0) node.setHeight(item.h)
      if (item.minW != null) node.setMinWidth(item.minW)
      if (item.minH != null) node.setMinHeight(item.minH)
      if (item.maxW != null) node.setMaxWidth(item.maxW)
      if (item.maxH != null) node.setMaxHeight(item.maxH)
      if (!isRoot) applyChildFlexProps(node, item)
      for (let i = 0; i < item.expanded.length; i++) {
        node.insertChild(
          buildYogaNode(Yoga, item.expanded[i]!, /* isRoot */ false, componentMap),
          i,
        )
      }
      return node
    }
    // Non-shell instance — leaf.
    if (typeof item.w === 'number' && item.w > 0) node.setWidth(item.w)
    if (typeof item.h === 'number' && item.h > 0) node.setHeight(item.h)
    applyChildFlexProps(node, item)
    return node
  }

  // Element. Two modes:
  //   - container (has children): build a flex container node + recurse.
  //     Chrome insets (modal's title bar, card header, etc.) are added to
  //     the author's padding so children land inside the visible chrome.
  //   - leaf: just declare size and child-flex props.
  const el = item
  if (el.children && el.children.length > 0) {
    const insets = chromeInsets(el.type)
    const authorPad = el.padding ?? 0
    const direction = el.direction
    if (direction) {
      // Flex container mode.
      applyContainerStyles(
        node,
        direction,
        el.justify ?? 'start',
        el.align ?? (direction === 'row' ? 'middle' : 'start'),
        el.wrap ?? 'nowrap',
        el.gap ?? 0,
        /* padding handled per-edge below */ 0,
      )
    }
    // Per-edge padding = author padding + chrome inset on that edge.
    node.setPadding(Edge.Top, authorPad + insets.top)
    node.setPadding(Edge.Right, authorPad + insets.right)
    node.setPadding(Edge.Bottom, authorPad + insets.bottom)
    node.setPadding(Edge.Left, authorPad + insets.left)
    if (typeof el.w === 'number' && el.w > 0) node.setWidth(el.w)
    if (typeof el.h === 'number' && el.h > 0) node.setHeight(el.h)
    if (el.minW != null) node.setMinWidth(el.minW)
    if (el.minH != null) node.setMinHeight(el.minH)
    if (el.maxW != null) node.setMaxWidth(el.maxW)
    if (el.maxH != null) node.setMaxHeight(el.maxH)
    if (!isRoot) applyChildFlexProps(node, el)
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i]!
      if (!direction) {
        // Absolute body — children keep their declared (x, y) inside the
        // content rect. Use Yoga's absolute positioning per child.
        const childNode = buildYogaNode(Yoga, child, /* isRoot */ false, componentMap)
        childNode.setPositionType(PositionType.Absolute)
        const cx = 'x' in child && typeof child.x === 'number' ? child.x : 0
        const cy = 'y' in child && typeof child.y === 'number' ? child.y : 0
        childNode.setPosition(Edge.Left, cx)
        childNode.setPosition(Edge.Top, cy)
        node.insertChild(childNode, i)
      } else {
        node.insertChild(buildYogaNode(Yoga, child, /* isRoot */ false, componentMap), i)
      }
    }
    return node
  }
  // Leaf element.
  if (typeof el.w === 'number' && el.w > 0) node.setWidth(el.w)
  if (typeof el.h === 'number' && el.h > 0) node.setHeight(el.h)
  applyChildFlexProps(node, el)
  return node
}

function applyContainerStyles(
  node: YogaNode,
  direction: BocetoDirection,
  justify: FlexJustify,
  align: FlexAlign,
  wrap: FlexWrap,
  gap: number,
  padding: number,
): void {
  node.setFlexDirection(toYogaDirection(direction))
  node.setJustifyContent(toYogaJustify(justify))
  node.setAlignItems(toYogaAlign(align))
  node.setFlexWrap(toYogaWrap(wrap))
  if (gap > 0) node.setGap(Gutter.All, gap)
  if (padding > 0) node.setPadding(Edge.All, padding)
}

function applyChildFlexProps(
  node: YogaNode,
  item: Element | ComponentInstance | FlexContainer,
): void {
  if (item.grow != null) node.setFlexGrow(item.grow)
  if (item.shrink != null) node.setFlexShrink(item.shrink)
  if (item.basis != null) {
    if (item.basis === 'auto') node.setFlexBasis('auto')
    else node.setFlexBasis(item.basis)
  }
  if (item.alignSelf != null && item.alignSelf !== 'auto') {
    node.setAlignSelf(toYogaAlign(item.alignSelf))
  }
  if (item.minW != null) node.setMinWidth(item.minW)
  if (item.minH != null) node.setMinHeight(item.minH)
  if (item.maxW != null) node.setMaxWidth(item.maxW)
  if (item.maxH != null) node.setMaxHeight(item.maxH)
}

/**
 * Read computed values from the Yoga tree and write absolute `{x,y,w,h}`
 * onto each Boceto item. Yoga reports child positions in *local* (relative
 * to parent) coords; we accumulate the origin as we descend. The tree mirrors
 * the structure built by `buildYogaNode`:
 *
 *  - `FlexContainer` → recurse on `children`.
 *  - `ComponentInstance` with shell → recurse on `expanded` (Yoga sees the
 *    body items as direct children).
 *  - `ComponentInstance` without shell → no recursion; after writing the
 *    instance's own box, translate the absolute-body subtree by the delta
 *    between declared and computed origin so leaf renderables land at the
 *    right place.
 *  - `Element` → leaf, just write its computed box.
 */
function writeComputedFromNode(
  item: PageItem,
  node: YogaNode,
  originX: number,
  originY: number,
  componentMap: ComponentMap,
): void {
  const w = node.getComputedWidth()
  const h = node.getComputedHeight()
  item.computed = { x: originX, y: originY, w, h }

  if (isFlexContainer(item)) {
    for (let i = 0; i < item.children.length; i++) {
      const child = item.children[i]!
      const childNode = node.getChild(i)
      writeComputedFromNode(
        child,
        childNode,
        originX + childNode.getComputedLeft(),
        originY + childNode.getComputedTop(),
        componentMap,
      )
    }
    return
  }

  if (isComponentInstance(item)) {
    const comp = componentMap.get(item.componentName)
    if (comp?.shell) {
      for (let i = 0; i < item.expanded.length; i++) {
        const child = item.expanded[i]!
        const childNode = node.getChild(i)
        writeComputedFromNode(
          child,
          childNode,
          originX + childNode.getComputedLeft(),
          originY + childNode.getComputedTop(),
          componentMap,
        )
      }
      return
    }
    // Absolute body — Yoga didn't see the body. The body items have declared
    // coords baked at expansion (relative to the instance's *declared* origin).
    // If the instance is now at a different computed origin, translate the
    // body items so they land at the right page-space coords.
    const dx = originX - item.x
    const dy = originY - item.y
    if (dx !== 0 || dy !== 0) translateAbsoluteBody(item.expanded, dx, dy)
    // Recurse: a FlexContainer or shell-instance inside an absolute body still
    // needs its own layout pass.
    descendForAbsoluteBody(yogaSingleton(), item.expanded, componentMap)
    return
  }

  // Element-as-container: Yoga laid out the children as part of this tree.
  // Recurse into children with the resolved origin so they get absolute
  // page-space coords.
  if (isElementContainer(item)) {
    for (let i = 0; i < item.children!.length; i++) {
      const child = item.children![i]!
      const childNode = node.getChild(i)
      writeComputedFromNode(
        child,
        childNode,
        originX + childNode.getComputedLeft(),
        originY + childNode.getComputedTop(),
        componentMap,
      )
    }
  }
}

/**
 * Translate every Element / FlexContainer / ComponentInstance in an
 * absolute-body subtree by `(dx, dy)`. Used when the parent instance was
 * repositioned by Yoga and its absolute-body children need to follow.
 */
function translateAbsoluteBody(items: readonly PageItem[], dx: number, dy: number): void {
  for (const item of items) {
    if (isFlexContainer(item)) {
      // Translate the container's declared anchor so its later layout pass
      // (in descendForAbsoluteBody) lands in the right place.
      item.x += dx
      item.y += dy
      translateAbsoluteBody(item.children, dx, dy)
      continue
    }
    if (isComponentInstance(item)) {
      item.x += dx
      item.y += dy
      translateAbsoluteBody(item.expanded, dx, dy)
      continue
    }
    // Element
    item.x += dx
    item.y += dy
  }
}

function yogaSingleton(): Yoga {
  if (!yogaInstance) {
    throw new Error(
      `Boceto: layout pass called before Yoga is ready. ` +
        `Call \`await initYoga()\` once at app start.`,
    )
  }
  return yogaInstance
}

// ─────────────────────────────────────────────────────────────────────────────
// Enum mapping (Boceto → Yoga)
// ─────────────────────────────────────────────────────────────────────────────

function toYogaDirection(d: BocetoDirection): FlexDirection {
  return d === 'row' ? FlexDirection.Row : FlexDirection.Column
}

function toYogaJustify(j: FlexJustify): Justify {
  switch (j) {
    case 'start':
      return Justify.FlexStart
    case 'middle':
      return Justify.Center
    case 'end':
      return Justify.FlexEnd
    case 'between':
      return Justify.SpaceBetween
    case 'around':
      return Justify.SpaceAround
    case 'evenly':
      return Justify.SpaceEvenly
  }
}

function toYogaAlign(a: FlexAlign): Align {
  switch (a) {
    case 'start':
      return Align.FlexStart
    case 'middle':
      return Align.Center
    case 'end':
      return Align.FlexEnd
    case 'stretch':
      return Align.Stretch
  }
}

function toYogaWrap(w: FlexWrap): Wrap {
  switch (w) {
    case 'nowrap':
      return Wrap.NoWrap
    case 'wrap':
      return Wrap.Wrap
    case 'wrap-reverse':
      return Wrap.WrapReverse
  }
}
