/**
 * Pass 1 — component definitions.
 *
 * Two sub-passes so composites can reference each other regardless of source
 * order (and reference yet-unparsed siblings):
 *
 *   1a. `collectComponentDefinitions` walks every block and pulls every
 *       `component NAME(...) ... end` out as a header + raw body text. The
 *       block has the consumed lines blanked so subsequent error line numbers
 *       stay accurate.
 *   1b. `parseComponentBodies` parses each body with the *full* component
 *       registry available, so nested composite references resolve.
 *
 * Expansion (`expandInstance`) walks the parsed tree recursively, substituting
 * `$param` placeholders and translating coordinates to the call-site origin.
 * A `visiting` set detects reference cycles and reports them with the full
 * chain.
 */

import type {
  AttrValue,
  Arrow,
  Component,
  ComponentBodyItem,
  ComponentDefaults,
  ComponentInstance,
  ComponentShell,
  Element,
  FlexAlign,
  FlexContainer,
  FlexDirection,
  FlexJustify,
  FlexWrap,
  PageItem,
} from '../types'
import {
  DEFAULT_SLOT,
  ELEMENT_TYPES,
  isComponentInstance,
  isFlexContainer,
  isSlot,
} from '../types'
import type { Slot } from '../types'
import { tokenize } from '../tokenizer'
import { BocetoParseError } from './errors'
import type { RawBlock } from './blocks'
import {
  FLEX_ALIGN_VALUES,
  FLEX_DIRECTION_VALUES,
  FLEX_JUSTIFY_VALUES,
  FLEX_WRAP_VALUES,
  consumeEnum,
  consumeOptionalNumber,
  extractFlexChildProps,
  parseAttrs,
} from './attrs'
import { parsePage } from './page'

const COMPONENT_HEADER_RE = /^component\s+([A-Za-z][A-Za-z0-9_-]*)\s*(?:\(([^)]*)\))?\s*(.*)$/
const PARAM_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const ELEMENT_TYPE_SET: ReadonlySet<string> = new Set(ELEMENT_TYPES)

/** A component definition before its body has been parsed. */
interface RawComponent {
  name: string
  params: string[]
  /** Raw attrs portion of the header line, after `name(params)`. Parsed in pass 1b. */
  headerAttrs: string
  /** The original header line, used as `raw` context for parse errors. */
  headerRaw: string
  /** Body text, with the surrounding `component … end` removed. */
  body: string
  /** Line in the original block where the `component` header appeared (0-based). */
  headerLine: number
}

/**
 * Walk every block, pull every component definition out as a raw header +
 * body text, blank the consumed lines, and return the rest for page parsing.
 */
export function collectComponentDefinitions(blocks: RawBlock[]): {
  raw: RawComponent[]
  blocks: RawBlock[]
} {
  const raw: RawComponent[] = []
  const rest: RawBlock[] = blocks.map((block) => {
    const { raw: blockRaw, body } = extractFromOneBlock(block.body)
    raw.push(...blockRaw)
    return { name: block.name, body }
  })
  return { raw, blocks: rest }
}

/** Pull every `component … end` out of one block body. */
function extractFromOneBlock(body: string): { raw: RawComponent[]; body: string } {
  const lines = body.split('\n')
  const out: string[] = lines.slice() // mutated to blank-out component blocks
  const raw: RawComponent[] = []

  let i = 0
  while (i < lines.length) {
    const rawLine = lines[i] ?? ''
    const trimmed = rawLine.trim()
    if (!trimmed.startsWith('component')) {
      i++
      continue
    }
    const m = trimmed.match(COMPONENT_HEADER_RE)
    if (!m) {
      // Not a valid component header — leave the line alone, page parsing
      // will raise a clearer error.
      i++
      continue
    }
    const name = m[1]!
    const params = m[2]
      ? m[2]
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : []
    const headerAttrs = (m[3] ?? '').trim()

    const bodyStart = i + 1
    let depth = 1
    let bodyEnd = -1
    for (let j = bodyStart; j < lines.length; j++) {
      const l = (lines[j] ?? '').trim()
      if (!l || l.startsWith('#')) continue
      const head = l.split(/\s+/)[0]!.split('#')[0]
      if (head === 'row' || head === 'col') depth++
      else if (head === 'end') {
        depth--
        if (depth === 0) {
          bodyEnd = j
          break
        }
      } else if (head === 'component') {
        throw new BocetoParseError(
          `Nested 'component' definitions are not allowed in v0.1`,
          j + 1,
          lines[j] ?? '',
        )
      }
    }
    if (bodyEnd < 0) {
      throw new BocetoParseError(
        `Unclosed 'component ${name}' (started on line ${i + 1}); expected 'end'`,
        i + 1,
        rawLine,
      )
    }

    raw.push({
      name,
      params,
      headerAttrs,
      headerRaw: rawLine,
      body: lines.slice(bodyStart, bodyEnd).join('\n'),
      headerLine: i,
    })

    for (let k = i; k <= bodyEnd; k++) out[k] = ''
    i = bodyEnd + 1
  }

  return { raw, body: out.join('\n') }
}

/**
 * Pass 1b — once every component header is known, parse each body with the
 * full registry available so nested composite references resolve. Bodies may
 * contain `Element`s, `Arrow`s, `FlexContainer`s, and `ComponentInstance`s
 * (recursive); the instances are kept as unresolved references and expanded
 * on demand by `expandInstance`.
 *
 * Header attrs (`direction`, `gap`, `padding`, `justify`, `align`, `wrap`,
 * `w`, `h`, `min-*`, `max-*`, `grow`, `shrink`, `basis`, `align-self`) are
 * parsed here and split into `Component.shell` (only when `direction` is set)
 * and `Component.defaults`.
 */
export function parseComponentBodies(raw: RawComponent[]): Component[] {
  // Pass 1b-α: parse every component's header attrs first, so the registry
  // visible during body parsing already carries `shell` and `defaults`.
  // Required so e.g. an `AppShell` body's `element Header 0 0 0 0 ""` call
  // site picks up Header's `h=56` default when looking up the component.
  const components: Component[] = raw.map((r) => {
    const { shell, defaults } = parseComponentHeaderAttrs(r)
    const c: Component = { name: r.name, params: r.params, body: [] }
    if (shell) c.shell = shell
    if (defaults) c.defaults = defaults
    return c
  })
  const componentMap: ReadonlyMap<string, Component> = new Map(
    components.map((c) => [c.name, c] as const),
  )

  // Pass 1b-β: parse each component's body with the full registry available.
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!
    const page = parsePage('__component__', 0, r.body, componentMap, {
      allowSlotMarker: true,
    })
    const body: ComponentBodyItem[] = []
    for (const item of page.elements) {
      // `parsePage` returns `PageItem`s; component bodies allow the same set
      // (Element, FlexContainer, ComponentInstance — no arrows yet since
      // arrows go to `page.arrows`).
      body.push(item as ComponentBodyItem)
    }
    for (const ar of page.arrows) body.push(ar)
    components[i]!.body = body
  }
  return components
}

/**
 * Parse the attrs portion of a `component` header line into a `shell` (only
 * when `direction` is set) and a `defaults` block. Rejects unknown keys with
 * a message that names the offending component.
 */
function parseComponentHeaderAttrs(r: RawComponent): {
  shell?: ComponentShell
  defaults?: ComponentDefaults
} {
  if (!r.headerAttrs) return {}
  const attrs = parseAttrs(tokenize(r.headerAttrs), r.headerLine, r.headerRaw)

  // Shell mode is opted into by declaring `direction`.
  let shell: ComponentShell | undefined
  if ('direction' in attrs) {
    const direction = consumeEnum<FlexDirection>(
      attrs,
      'direction',
      FLEX_DIRECTION_VALUES,
      'component',
      r.headerLine,
      r.headerRaw,
    )!
    const padding = consumeOptionalNumber(attrs, 'padding', 'component', r.headerLine, r.headerRaw) ?? 0
    const gap = consumeOptionalNumber(attrs, 'gap', 'component', r.headerLine, r.headerRaw) ?? 0
    const justify =
      consumeEnum<FlexJustify>(attrs, 'justify', FLEX_JUSTIFY_VALUES, 'component', r.headerLine, r.headerRaw) ??
      'start'
    const align =
      consumeEnum<FlexAlign>(attrs, 'align', FLEX_ALIGN_VALUES, 'component', r.headerLine, r.headerRaw) ??
      (direction === 'row' ? 'middle' : 'start')
    const wrap =
      consumeEnum<FlexWrap>(attrs, 'wrap', FLEX_WRAP_VALUES, 'component', r.headerLine, r.headerRaw) ??
      'nowrap'
    shell = { direction, padding, gap, justify, align, wrap }
  }

  // Defaults — size + per-child flex props.
  const defaults: ComponentDefaults = {}
  if ('w' in attrs) defaults.w = consumeDimDefault(attrs, 'w', r.headerLine, r.headerRaw)
  if ('h' in attrs) defaults.h = consumeDimDefault(attrs, 'h', r.headerLine, r.headerRaw)
  Object.assign(defaults, extractFlexChildProps(attrs, r.headerLine, r.headerRaw))

  const extra = Object.keys(attrs)
  if (extra.length > 0) {
    throw new BocetoParseError(
      `Unknown 'component ${r.name}' attribute(s): ${extra.map((k) => `"${k}"`).join(', ')}`,
      r.headerLine + 1,
      r.headerRaw,
    )
  }

  return {
    shell,
    defaults: Object.keys(defaults).length > 0 ? defaults : undefined,
  }
}

/** Pull `w` or `h` from a component header — non-negative integer or `'auto'`. */
function consumeDimDefault(
  attrs: Record<string, AttrValue>,
  key: 'w' | 'h',
  lineNo: number,
  raw: string,
): number | 'auto' {
  const v = attrs[key]
  delete attrs[key]
  if (v === 'auto') return 'auto'
  if (typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v >= 0) return v
  throw new BocetoParseError(
    `'component' attribute '${key}' must be a non-negative integer or "auto", got "${String(v)}"`,
    lineNo + 1,
    raw,
  )
}

export function validateComponents(components: readonly Component[]): void {
  const seen = new Set<string>()
  for (const c of components) {
    if (ELEMENT_TYPE_SET.has(c.name)) {
      throw new BocetoParseError(
        `Component name "${c.name}" collides with built-in element type`,
      )
    }
    if (seen.has(c.name)) {
      throw new BocetoParseError(`Duplicate component definition: "${c.name}"`)
    }
    seen.add(c.name)
    const paramsSeen = new Set<string>()
    for (const p of c.params) {
      if (!PARAM_RE.test(p)) {
        throw new BocetoParseError(`Component "${c.name}" has invalid param "${p}"`)
      }
      if (paramsSeen.has(p)) {
        throw new BocetoParseError(`Component "${c.name}" has duplicate param "${p}"`)
      }
      paramsSeen.add(p)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Expansion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively expand a component reference into a tree of `PageItem`s.
 *
 *  - `$name` / `${name}` placeholders in labels, notes, attrs, and nested
 *    composite params are substituted using the supplied `params` map.
 *  - Coordinates are translated by `(originX, originY)` so the result lands
 *    at the call site.
 *  - Element IDs are namespaced with the instance id chain (`A.B.id`) so
 *    multiple instances don't collide.
 *  - **Nested `ComponentInstance` items are preserved as shells** with
 *    recursively-resolved `expanded` subtrees. They are NOT inlined, so the
 *    parent's flex-shell layout (when applicable) sees each nested instance
 *    as a single child rather than its constituent leaves.
 *  - `FlexContainer` items survive in the tree (Yoga lays them out later).
 *  - Reference cycles throw a clear error listing the full chain.
 */
export function expandInstance(
  component: Component,
  instanceId: string,
  originX: number,
  originY: number,
  params: Record<string, string>,
  componentMap: ReadonlyMap<string, Component>,
  visiting: ReadonlySet<string> = new Set(),
  slotContent: Record<string, PageItem[]> = {},
): PageItem[] {
  if (visiting.has(component.name)) {
    const chain = [...visiting, component.name].join(' → ')
    throw new BocetoParseError(`Cyclic component reference: ${chain}`)
  }
  const next = new Set(visiting)
  next.add(component.name)
  // Track which slots in the body we've seen — used below to check that the
  // call site doesn't supply content for a slot the component doesn't expose.
  const declaredSlotNames = new Set<string>()

  const out: PageItem[] = []
  for (const item of component.body) {
    if ('from' in item && 'to' in item) continue // Arrow — TODO once editor wires arrows
    if (isSlot(item)) {
      // Inline this slot's call-site content. Each child is a `PageItem`
      // that itself may need recursive expansion (it could be a nested
      // composite, a flex container, or a leaf element). $param placeholders
      // inside slot content come from the **call-site's** caller context,
      // which is already represented by `params` here.
      const slotName = item.name ?? DEFAULT_SLOT
      declaredSlotNames.add(slotName)
      const slotChildren = slotContent[slotName] ?? []
      for (const sc of slotChildren) {
        out.push(...expandPageItem(sc, instanceId, originX, originY, params, componentMap, next))
      }
      continue
    }
    if (isComponentInstance(item)) {
      const nested = componentMap.get(item.componentName)
      if (!nested) {
        throw new BocetoParseError(`Unknown component "${item.componentName}"`)
      }
      // Substitute outer params into the nested call site's params first,
      // then recursively resolve the nested instance's own body.
      const nestedParams: Record<string, string> = {}
      for (const [k, v] of Object.entries(item.params)) {
        nestedParams[k] = substituteParams(v, params)
      }
      const nestedInstanceId = `${instanceId}.${item.id}`
      const nestedItemX = typeof item.x === 'number' ? item.x : 0
      const nestedItemY = typeof item.y === 'number' ? item.y : 0
      const nestedExpanded = expandInstance(
        {
          ...nested,
          // Pass the (unexpanded) call-site slot content through. Nested
          // instances may themselves declare slots — those get filled by
          // whatever the *outer* nested call site supplied for them.
        },
        nestedInstanceId,
        originX + nestedItemX,
        originY + nestedItemY,
        nestedParams,
        componentMap,
        next,
        item.slots, // slot content from the nested call site
      )
      out.push({
        ...item,
        id: nestedInstanceId,
        x: originX + nestedItemX,
        y: originY + nestedItemY,
        params: nestedParams,
        expanded: nestedExpanded,
      })
      continue
    }
    if (isFlexContainer(item)) {
      out.push(translateFlexContainer(item, originX, originY, params, instanceId))
      continue
    }
    out.push(translateElement(item, originX, originY, params, instanceId))
  }

  // Reject call-site slot content the body doesn't expose. Catches typos
  // like `slot heaer ... end` (missing "d") and "this component doesn't
  // accept children" mistakes.
  for (const slotName of Object.keys(slotContent)) {
    if (!declaredSlotNames.has(slotName)) {
      const label = slotName === DEFAULT_SLOT ? 'default slot' : `slot "${slotName}"`
      throw new BocetoParseError(
        `Component "${component.name}" has no ${label} — call site supplied children for it`,
      )
    }
  }

  return out
}

/**
 * Expand a single `PageItem` from a slot's call-site content. Mirrors the
 * three branches of `expandInstance`'s body loop but for a single item.
 */
function expandPageItem(
  item: PageItem,
  instanceId: string,
  originX: number,
  originY: number,
  params: Record<string, string>,
  componentMap: ReadonlyMap<string, Component>,
  visiting: ReadonlySet<string>,
): PageItem[] {
  if (isComponentInstance(item)) {
    const nested = componentMap.get(item.componentName)
    if (!nested) {
      throw new BocetoParseError(`Unknown component "${item.componentName}"`)
    }
    const nestedParams: Record<string, string> = {}
    for (const [k, v] of Object.entries(item.params)) {
      nestedParams[k] = substituteParams(v, params)
    }
    const nestedInstanceId = `${instanceId}.${item.id}`
    const nestedItemX = typeof item.x === 'number' ? item.x : 0
    const nestedItemY = typeof item.y === 'number' ? item.y : 0
    return [
      {
        ...item,
        id: nestedInstanceId,
        x: originX + nestedItemX,
        y: originY + nestedItemY,
        params: nestedParams,
        expanded: expandInstance(
          nested,
          nestedInstanceId,
          originX + nestedItemX,
          originY + nestedItemY,
          nestedParams,
          componentMap,
          visiting,
          item.slots,
        ),
      },
    ]
  }
  if (isFlexContainer(item)) {
    return [translateFlexContainer(item, originX, originY, params, instanceId)]
  }
  return [translateElement(item, originX, originY, params, instanceId)]
}

function translateElement(
  el: Element,
  dx: number,
  dy: number,
  params: Record<string, string>,
  idPrefix: string,
): Element {
  const subbedAttrs: Record<string, AttrValue> = {}
  for (const [k, v] of Object.entries(el.attrs)) {
    subbedAttrs[k] = typeof v === 'string' ? substituteParams(v, params) : v
  }
  return {
    ...el,
    id: `${idPrefix}.${el.id}`,
    x: el.x + dx,
    y: el.y + dy,
    label: substituteParams(el.label, params),
    note: el.note != null ? substituteParams(el.note, params) : undefined,
    attrs: subbedAttrs,
  }
}

function translateFlexContainer(
  c: FlexContainer,
  dx: number,
  dy: number,
  params: Record<string, string>,
  idPrefix: string,
): FlexContainer {
  return {
    ...c,
    id: `${idPrefix}.${c.id}`,
    x: c.x + dx,
    y: c.y + dy,
    children: c.children.map((child) => translateChild(child, dx, dy, params, idPrefix)),
  }
}

function translateChild(
  item: PageItem,
  dx: number,
  dy: number,
  params: Record<string, string>,
  idPrefix: string,
): PageItem {
  if (isFlexContainer(item)) return translateFlexContainer(item, dx, dy, params, idPrefix)
  if (isComponentInstance(item)) {
    // Composite reference inside an expanded subtree — keep it as a shell so
    // a later page-level expansion can resolve it. (In practice the parent
    // `expandInstance` call has already inlined these.)
    return {
      ...item,
      id: `${idPrefix}.${item.id}`,
      x: item.x + dx,
      y: item.y + dy,
    }
  }
  return translateElement(item, dx, dy, params, idPrefix)
}

const VAR_BRACED_RE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g
const VAR_BARE_RE = /\$([A-Za-z_][A-Za-z0-9_]*)/g

export function substituteParams(s: string, params: Record<string, string>): string {
  return s
    .replace(VAR_BRACED_RE, (_, name) => params[name] ?? '')
    .replace(VAR_BARE_RE, (_, name) => params[name] ?? '')
}
