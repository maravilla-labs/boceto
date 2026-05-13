import type {
  AttrValue,
  BocetoDoc,
  Component,
  ComponentDefaults,
  ComponentInstance,
  Element,
  FlexContainer,
  Page,
  PageItem,
  Slot,
} from './types'
import { DEFAULT_SLOT, isComponentInstance, isFlexContainer, isSlot } from './types'

export interface SerializeOptions {
  /**
   * Output format. `markdown` (default) wraps content in fenced `boceto`
   * blocks; `boceto` emits a standalone .boceto file with `---` page
   * separators.
   */
  format?: 'markdown' | 'boceto'
}

export function serialize(doc: BocetoDoc, options: SerializeOptions = {}): string {
  const format = options.format ?? 'markdown'
  const blocks: string[] = []
  const componentMap = new Map(doc.components.map((c) => [c.name, c] as const))

  // Component definitions go in their own leading block (no page name) so
  // diffs of authored vs round-tripped output stay clean and definitions
  // don't get mixed with page content.
  if (doc.components.length > 0) {
    const defs = doc.components.map((c) => serializeComponent(c, componentMap)).join('\n\n')
    blocks.push(format === 'markdown' ? '```boceto\n' + defs + '\n```' : defs)
  }

  for (const page of doc.pages) {
    blocks.push(serializePage(page, format, componentMap))
  }
  return format === 'markdown' ? blocks.join('\n\n') : blocks.join('\n\n')
}

function serializePage(
  page: Page,
  format: 'markdown' | 'boceto',
  componentMap: ReadonlyMap<string, Component>,
): string {
  const body = serializePageBody(page, componentMap)
  if (format === 'markdown') return '```boceto:' + page.name + '\n' + body + '\n```'
  return `--- ${page.name}\n${body}`
}

function serializePageBody(page: Page, componentMap: ReadonlyMap<string, Component>): string {
  const lines: string[] = []
  for (const item of page.elements) appendItem(lines, item, 0, componentMap)
  for (const ar of page.arrows) {
    const label = ar.label ? ` ${quote(ar.label)}` : ''
    lines.push(`arrow ${ar.from} ${ar.to}${label}`)
  }
  return lines.join('\n')
}

function appendItem(
  lines: string[],
  item: PageItem,
  indent: number,
  componentMap: ReadonlyMap<string, Component>,
): void {
  const pad = '  '.repeat(indent)
  if (isFlexContainer(item)) {
    const [open, ...rest] = serializeFlexContainer(item, indent, componentMap).split('\n')
    lines.push(pad + open)
    for (const r of rest) lines.push(r)
    return
  }
  if (isComponentInstance(item)) {
    lines.push(pad + serializeInstance(item, componentMap))
    return
  }
  // Element — single-line by default, block-form when it has children.
  const rendered = serializeElement(item, componentMap, indent).split('\n')
  lines.push(pad + rendered[0])
  for (let i = 1; i < rendered.length; i++) lines.push(rendered[i]!)
}

function serializeComponent(
  c: Component,
  componentMap: ReadonlyMap<string, Component>,
): string {
  const parts: string[] = [
    'component',
    `${c.name}${c.params.length ? '(' + c.params.join(', ') + ')' : ''}`,
  ]
  // Shell (direction-triggered). Emit non-default values only; defaults
  // (align/justify/wrap/gap=0/padding=0) are omitted to keep output clean.
  if (c.shell) {
    const s = c.shell
    parts.push(`direction=${s.direction}`)
    if (s.padding !== 0) parts.push(`padding=${s.padding}`)
    if (s.gap !== 0) parts.push(`gap=${s.gap}`)
    const defaultAlign = s.direction === 'row' ? 'middle' : 'start'
    if (s.align !== defaultAlign) parts.push(`align=${s.align}`)
    if (s.justify !== 'start') parts.push(`justify=${s.justify}`)
    if (s.wrap !== 'nowrap') parts.push(`wrap=${s.wrap}`)
  }
  if (c.defaults) {
    const d = c.defaults
    if (d.w !== undefined) parts.push(`w=${formatDim(d.w)}`)
    if (d.h !== undefined) parts.push(`h=${formatDim(d.h)}`)
    appendFlexChildAttrs(parts, d)
  }
  const header = parts.join(' ')
  const bodyLines: string[] = []
  for (const item of c.body) {
    if ('from' in item && 'to' in item) {
      const label = item.label ? ` ${quote(item.label)}` : ''
      bodyLines.push(`  arrow ${item.from} ${item.to}${label}`)
      continue
    }
    if (isSlot(item)) {
      bodyLines.push('  ' + (item.name ? `slot ${item.name}` : 'slot'))
      continue
    }
    if (isFlexContainer(item)) {
      const nested = serializeFlexContainer(item, 1, componentMap).split('\n')
      for (const n of nested) bodyLines.push(n)
      continue
    }
    if (isComponentInstance(item)) {
      bodyLines.push('  ' + serializeInstance(item, componentMap))
      continue
    }
    const rendered = serializeElement(item, componentMap, 1).split('\n')
    bodyLines.push('  ' + rendered[0])
    for (let j = 1; j < rendered.length; j++) bodyLines.push(rendered[j]!)
  }
  bodyLines.push('end')
  return `${header}\n${bodyLines.join('\n')}`
}

const AUTO_ID_RE = /^p\d+e\d+$/
const AUTO_INSTANCE_ID_RE = /^p\d+c\d+$/
const AUTO_FLEX_ID_RE = /^p\d+f\d+$/
const NAMED_ID_RE = /^[A-Za-z][A-Za-z0-9_-]*$/

function serializeElement(
  el: Element,
  componentMap?: ReadonlyMap<string, Component>,
  indent: number = 0,
): string {
  const isAuto = AUTO_ID_RE.test(el.id) || el.id.includes('.') /* expanded child */
  if (!isAuto && !NAMED_ID_RE.test(el.id)) {
    throw new Error(
      `Cannot serialize element with id "${el.id}": ids must match [A-Za-z][A-Za-z0-9_-]*`,
    )
  }
  const typeToken = isAuto ? el.type : `${el.type}#${el.id}`

  const parts = [
    'element',
    typeToken,
    String(el.x),
    String(el.y),
    String(el.w),
    String(el.h),
    quote(el.label),
  ]
  if (el.note !== undefined && el.note !== '') parts.push(quote(el.note))
  // Container attrs (only meaningful when children present, but we always
  // emit them when set so round-trip stays clean).
  if (el.direction != null) parts.push(`direction=${el.direction}`)
  if (el.gap != null) parts.push(`gap=${el.gap}`)
  if (el.padding != null) parts.push(`padding=${el.padding}`)
  if (el.justify != null) parts.push(`justify=${el.justify}`)
  if (el.align != null) parts.push(`align=${el.align}`)
  if (el.wrap != null) parts.push(`wrap=${el.wrap}`)
  appendFlexChildAttrs(parts, el)
  for (const [k, v] of Object.entries(el.attrs)) parts.push(`${k}=${formatAttr(v)}`)

  // No children — single-line form.
  if (!el.children || el.children.length === 0) {
    return parts.join(' ')
  }
  // Block form: `element ... :` + indented children + `end`.
  const pad = '  '.repeat(indent + 1)
  const lines = [parts.join(' ') + ' :']
  const cm = componentMap ?? new Map<string, Component>()
  for (const child of el.children) {
    lines.push(...serializeSlotChild(child, cm, indent + 1).map((l) => pad + l))
  }
  lines.push('  '.repeat(indent) + 'end')
  return lines.join('\n')
}

function serializeFlexContainer(
  c: FlexContainer,
  indent: number,
  componentMap: ReadonlyMap<string, Component>,
): string {
  const isAuto = AUTO_FLEX_ID_RE.test(c.id)
  if (!isAuto && !NAMED_ID_RE.test(c.id)) {
    throw new Error(
      `Cannot serialize flex container with id "${c.id}": ids must match [A-Za-z][A-Za-z0-9_-]*`,
    )
  }
  const kind = c.direction
  const head = isAuto ? kind : `${kind}#${c.id}`

  const parts = [head, String(c.x), String(c.y), formatDim(c.w), formatDim(c.h)]

  // Defaults — omit when equal to default so output stays clean.
  const defaultAlign = c.direction === 'row' ? 'middle' : 'start'
  if (c.gap !== 0) parts.push(`gap=${c.gap}`)
  if (c.padding !== 0) parts.push(`padding=${c.padding}`)
  if (c.align !== defaultAlign) parts.push(`align=${c.align}`)
  if (c.justify !== 'start') parts.push(`justify=${c.justify}`)
  if (c.wrap !== 'nowrap') parts.push(`wrap=${c.wrap}`)
  appendFlexChildAttrs(parts, c)

  const open = parts.join(' ')
  const lines = [open]
  const pad = '  '.repeat(indent + 1)
  for (const child of c.children) {
    if (isFlexContainer(child)) {
      const nested = serializeFlexContainer(child, indent + 1, componentMap).split('\n')
      lines.push(pad + nested[0])
      for (let i = 1; i < nested.length; i++) lines.push(nested[i]!)
    } else if (isComponentInstance(child)) {
      lines.push(pad + serializeInstance(child, componentMap))
    } else {
      const rendered = serializeElement(child, componentMap, indent + 1).split('\n')
      lines.push(pad + rendered[0])
      for (let i = 1; i < rendered.length; i++) lines.push(rendered[i]!)
    }
  }
  lines.push('  '.repeat(indent) + 'end')
  return lines.join('\n')
}

function appendFlexChildAttrs(
  parts: string[],
  item: {
    grow?: number
    shrink?: number
    basis?: number | 'auto'
    alignSelf?: string
    minW?: number
    minH?: number
    maxW?: number
    maxH?: number
  },
): void {
  if (item.grow != null) parts.push(`grow=${item.grow}`)
  if (item.shrink != null) parts.push(`shrink=${item.shrink}`)
  if (item.basis != null) parts.push(`basis=${item.basis}`)
  if (item.alignSelf != null) parts.push(`align-self=${item.alignSelf}`)
  if (item.minW != null) parts.push(`min-w=${item.minW}`)
  if (item.minH != null) parts.push(`min-h=${item.minH}`)
  if (item.maxW != null) parts.push(`max-w=${item.maxW}`)
  if (item.maxH != null) parts.push(`max-h=${item.maxH}`)
}

function formatDim(d: number | 'auto'): string {
  return d === 'auto' ? 'auto' : String(d)
}

function serializeInstance(
  ci: ComponentInstance,
  componentMap: ReadonlyMap<string, Component>,
  indent: number = 0,
): string {
  const isAuto = AUTO_INSTANCE_ID_RE.test(ci.id)
  if (!isAuto && !NAMED_ID_RE.test(ci.id)) {
    throw new Error(
      `Cannot serialize component instance with id "${ci.id}": ids must match [A-Za-z][A-Za-z0-9_-]*`,
    )
  }
  const typeToken = isAuto ? ci.componentName : `${ci.componentName}#${ci.id}`

  // Skip attrs that came from the component's defaults — they round-trip via
  // the definition. Values matching a default are emitted as `auto` (for w/h)
  // or omitted entirely (for flex-child props).
  const defaults: ComponentDefaults | undefined = componentMap.get(ci.componentName)?.defaults
  const w = defaults && eqDim(ci.w, defaults.w) ? 'auto' : ci.w
  const h = defaults && eqDim(ci.h, defaults.h) ? 'auto' : ci.h

  const parts = [
    'element',
    typeToken,
    String(ci.x),
    String(ci.y),
    formatDim(w),
    formatDim(h),
    '""',
  ]
  appendFlexChildAttrsSkippingDefaults(parts, ci, defaults)
  for (const [k, v] of Object.entries(ci.params)) parts.push(`${k}=${formatAttr(v)}`)

  // No call-site slot content → single-line form, full back-compat.
  if (!ci.slots || Object.keys(ci.slots).length === 0) {
    return parts.join(' ')
  }

  // Block form: trailing `:` opens, `end` closes. Default-slot bare children
  // first; named-slot blocks after, each as `slot NAME … end`. The `:` is
  // emitted as a standalone token (with a leading space) so the tokenizer
  // doesn't glue it onto the preceding attr.
  const pad = '  '.repeat(indent + 1)
  const lines: string[] = [parts.join(' ') + ' :']
  const defaultChildren = ci.slots[DEFAULT_SLOT] ?? []
  for (const child of defaultChildren) {
    lines.push(...serializeSlotChild(child, componentMap, indent + 1).map((l) => pad + l))
  }
  for (const [slotName, children] of Object.entries(ci.slots)) {
    if (slotName === DEFAULT_SLOT) continue
    lines.push(`${pad}slot ${slotName}`)
    const innerPad = '  '.repeat(indent + 2)
    for (const child of children) {
      lines.push(...serializeSlotChild(child, componentMap, indent + 2).map((l) => innerPad + l))
    }
    lines.push(`${pad}end`)
  }
  lines.push('  '.repeat(indent) + 'end')
  return lines.join('\n')
}

/**
 * Serialize one slot-fill child to its constituent lines (returned without
 * outer indentation so the caller can apply it). Mirrors the dispatch in
 * `appendItem` but without leading padding.
 */
function serializeSlotChild(
  item: PageItem,
  componentMap: ReadonlyMap<string, Component>,
  indent: number,
): string[] {
  if (isFlexContainer(item)) {
    return serializeFlexContainer(item, indent, componentMap).split('\n')
  }
  if (isComponentInstance(item)) {
    return serializeInstance(item, componentMap, indent).split('\n')
  }
  return serializeElement(item, componentMap, indent).split('\n')
}

function eqDim(a: number | 'auto', b: number | 'auto' | undefined): boolean {
  return a === b
}

function appendFlexChildAttrsSkippingDefaults(
  parts: string[],
  ci: ComponentInstance,
  defaults: ComponentDefaults | undefined,
): void {
  const defs = defaults ?? {}
  if (ci.grow != null && ci.grow !== defs.grow) parts.push(`grow=${ci.grow}`)
  if (ci.shrink != null && ci.shrink !== defs.shrink) parts.push(`shrink=${ci.shrink}`)
  if (ci.basis != null && ci.basis !== defs.basis) parts.push(`basis=${ci.basis}`)
  if (ci.alignSelf != null && ci.alignSelf !== defs.alignSelf) parts.push(`align-self=${ci.alignSelf}`)
  if (ci.minW != null && ci.minW !== defs.minW) parts.push(`min-w=${ci.minW}`)
  if (ci.minH != null && ci.minH !== defs.minH) parts.push(`min-h=${ci.minH}`)
  if (ci.maxW != null && ci.maxW !== defs.maxW) parts.push(`max-w=${ci.maxW}`)
  if (ci.maxH != null && ci.maxH !== defs.maxH) parts.push(`max-h=${ci.maxH}`)
}

function quote(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

function formatAttr(v: AttrValue): string {
  if (typeof v === 'number') return String(v)
  if (/[\s"\\]/.test(v)) {
    return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }
  return v
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export PageItem helpers for callers that need them
// ─────────────────────────────────────────────────────────────────────────────

export type { PageItem }
