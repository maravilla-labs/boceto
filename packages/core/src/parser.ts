import type {
  Arrow,
  AttrValue,
  BocetoDoc,
  Component,
  ComponentBodyItem,
  ComponentInstance,
  Element,
  ElementType,
  Page,
  PageItem,
  ParseOptions,
} from './types'
import { ELEMENT_TYPES } from './types'
import { tokenize, type Token } from './tokenizer'

const ELEMENT_TYPE_SET: ReadonlySet<string> = new Set(ELEMENT_TYPES)

const FENCE_RE = /```boceto(?::([^\n]*))?\n([\s\S]*?)```/g
const PAGE_SEP_RE = /^---(?:\s+(.*))?$/

export class BocetoParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly source?: string,
  ) {
    super(message)
    this.name = 'BocetoParseError'
  }
}

interface RawBlock {
  /** Page name (from fence info string or `--- Name`); `undefined` means "defs-only candidate". */
  name?: string
  body: string
}

export function parse(source: string, options: ParseOptions = {}): BocetoDoc {
  if (options.raw) {
    return {
      pages: [parsePage('Page 1', 0, source, new Map())],
      components: [],
    }
  }

  const blocks = extractBlocks(source)

  // Pass 1: pull component definitions out of every block, collecting them
  // doc-wide. The remaining body of each block goes to page parsing.
  const components: Component[] = []
  const blocksForPages: RawBlock[] = blocks.map((block) => {
    const { components: blockComponents, body: bodyWithoutComponents } = extractComponentDefinitions(
      block.body,
    )
    components.push(...blockComponents)
    return { name: block.name, body: bodyWithoutComponents }
  })

  validateComponents(components)
  const componentMap = new Map<string, Component>()
  for (const c of components) componentMap.set(c.name, c)

  // Pass 2: parse pages with the component registry available so references
  // resolve to ComponentInstance items.
  const pages: Page[] = []
  let pageIndex = 0
  for (const block of blocksForPages) {
    const trimmedBody = block.body.trim()
    // A block whose only content was components produces no page.
    if (!trimmedBody) continue
    const name = block.name ?? `Page ${pageIndex + 1}`
    pages.push(parsePage(name, pageIndex, block.body, componentMap))
    pageIndex++
  }

  if (pages.length === 0) {
    pages.push({ id: 'p0', name: 'Page 1', elements: [], arrows: [] })
  }
  return { pages, components }
}

/**
 * Extract markdown fence blocks or `--- Name` standalone-file pages from the
 * raw source. Each returned `RawBlock` carries the original page name (if
 * any) and the unparsed body.
 */
function extractBlocks(source: string): RawBlock[] {
  const fenceMatches = [...source.matchAll(FENCE_RE)]
  if (fenceMatches.length > 0) {
    return fenceMatches.map((m) => ({
      name: m[1]?.trim() || undefined,
      body: m[2] ?? '',
    }))
  }

  if (!looksLikeStandalone(source)) {
    return []
  }

  const lines = source.split('\n')
  const blocks: RawBlock[] = []
  let current: RawBlock | null = null
  for (const raw of lines) {
    const sep = raw.match(PAGE_SEP_RE)
    if (sep) {
      if (current) blocks.push(current)
      current = { name: sep[1]?.trim() || undefined, body: '' }
      continue
    }
    if (current) current.body += (current.body ? '\n' : '') + raw
    else current = { body: raw }
  }
  if (current) blocks.push(current)
  return blocks
}

const STATEMENT_KEYWORDS = new Set([
  'element',
  'text',
  'arrow',
  'row',
  'col',
  'end',
  'component',
])

function looksLikeStandalone(source: string): boolean {
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('---')) return true
    const firstWord = line.split(/\s+/)[0] ?? ''
    return STATEMENT_KEYWORDS.has(firstWord)
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Component definition extraction (Pass 1)
// ─────────────────────────────────────────────────────────────────────────────

const COMPONENT_HEADER_RE = /^component\s+([A-Za-z][A-Za-z0-9_-]*)\s*(?:\(([^)]*)\))?\s*$/

/**
 * Walks `body` lines, extracts every `component NAME(params) ... end` block
 * into a `Component`, and returns the remaining body (with the component
 * lines stripped — replaced by blank lines so subsequent line-number error
 * messages stay accurate).
 */
function extractComponentDefinitions(body: string): {
  components: Component[]
  body: string
} {
  const lines = body.split('\n')
  const out: string[] = lines.slice() // mutated to blank-out component blocks
  const components: Component[] = []

  let i = 0
  while (i < lines.length) {
    const raw = lines[i] ?? ''
    const trimmed = raw.trim()
    if (!trimmed.startsWith('component')) {
      i++
      continue
    }
    const m = trimmed.match(COMPONENT_HEADER_RE)
    if (!m) {
      // Not a valid component header — leave the line alone, parser will
      // raise a "Unknown statement keyword" error during page parsing.
      i++
      continue
    }
    const name = m[1]!
    const paramsList = m[2]
      ? m[2]
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : []

    // Collect body lines until matching `end` (accounting for nested row/col).
    const bodyStart = i + 1
    let depth = 1 // treat the `component` itself as one level; row/col push
    let bodyEnd = -1
    for (let j = bodyStart; j < lines.length; j++) {
      const l = (lines[j] ?? '').trim()
      if (!l || l.startsWith('#')) continue
      const head = l.split(/\s+/)[0]
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
        raw,
      )
    }

    const componentBodyText = lines.slice(bodyStart, bodyEnd).join('\n')
    const { items, arrows } = parseComponentBody(componentBodyText)
    components.push({
      name,
      params: paramsList,
      body: [...items, ...arrows],
    })

    // Blank out the lines we consumed so they don't get re-parsed.
    for (let k = i; k <= bodyEnd; k++) out[k] = ''
    i = bodyEnd + 1
  }

  return { components, body: out.join('\n') }
}

/** Parse a component body — same grammar as a page body, no nested components. */
function parseComponentBody(body: string): { items: Element[]; arrows: Arrow[] } {
  const page = parsePage('__component__', 0, body, new Map())
  // Component bodies don't allow ComponentInstance (no nested components),
  // and the parser will have produced only Elements (component map was empty,
  // so unknown types throw).
  const items: Element[] = []
  for (const it of page.elements) {
    if ('kind' in it && it.kind === 'component-instance') {
      throw new BocetoParseError(
        `Nested component references are not allowed inside a component body`,
      )
    }
    items.push(it as Element)
  }
  return { items, arrows: page.arrows }
}

function validateComponents(components: Component[]): void {
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
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p)) {
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
// Page parsing (Pass 2)
// ─────────────────────────────────────────────────────────────────────────────

interface LayoutFrame {
  kind: 'row' | 'col'
  x: number
  y: number
  w: number
  h: number
  gap: number
  align: string
  children: Element[]
  startLine: number
}

function parsePage(
  name: string,
  pageIndex: number,
  body: string,
  componentMap: ReadonlyMap<string, Component>,
): Page {
  const items: PageItem[] = []
  const arrows: Arrow[] = []
  let autoCounter = 1
  const layoutStack: LayoutFrame[] = []
  const lines = body.split('\n')

  function pushItem(item: PageItem): void {
    if (layoutStack.length > 0) {
      // Layout frames only support flat Element children (composites are not
      // re-laid-out by row/col — that would be confusing). If the user puts a
      // composite reference inside a row/col, error out with a clear message.
      if ('kind' in item && item.kind === 'component-instance') {
        throw new BocetoParseError(
          `Composite references cannot appear inside a 'row' or 'col' block`,
        )
      }
      layoutStack[layoutStack.length - 1]!.children.push(item as Element)
    } else items.push(item)
  }

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const raw = lines[lineNo] ?? ''
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue

    const tokens = tokenize(trimmed)
    if (tokens.length === 0) continue
    const head = tokens[0]
    if (!head || head.quoted) {
      throw new BocetoParseError(
        `Expected statement keyword, got "${head?.value ?? ''}"`,
        lineNo + 1,
        raw,
      )
    }

    switch (head.value) {
      case 'element':
        pushItem(parseElementOrInstance(tokens, pageIndex, autoCounter++, lineNo, raw, componentMap))
        break
      case 'text':
        pushItem(parseText(tokens, pageIndex, autoCounter++, lineNo, raw))
        break
      case 'arrow':
        arrows.push(parseArrow(tokens, pageIndex, autoCounter++, lineNo, raw))
        break
      case 'row':
      case 'col':
        layoutStack.push(parseLayoutFrame(head.value, tokens, lineNo, raw))
        break
      case 'end': {
        const frame = layoutStack.pop()
        if (!frame) {
          throw new BocetoParseError(`'end' with no matching 'row' or 'col'`, lineNo + 1, raw)
        }
        applyLayout(frame).forEach((el) => pushItem(el))
        break
      }
      default:
        throw new BocetoParseError(`Unknown statement keyword "${head.value}"`, lineNo + 1, raw)
    }
  }

  if (layoutStack.length > 0) {
    const top = layoutStack[layoutStack.length - 1]!
    throw new BocetoParseError(
      `Unclosed '${top.kind}' (started on line ${top.startLine + 1}); expected 'end'`,
      top.startLine + 1,
    )
  }

  return { id: `p${pageIndex}`, name, elements: items, arrows }
}

function splitTypeAndId(tok: Token): { type: string; namedId: string | undefined } {
  const v = tok.value
  const hash = v.indexOf('#')
  if (hash < 0) return { type: v, namedId: undefined }
  return { type: v.slice(0, hash), namedId: v.slice(hash + 1) }
}

/**
 * Dispatches `element <type> ...` lines to either `parseElement` (built-in
 * type) or `parseComponentInstance` (a defined composite).
 */
function parseElementOrInstance(
  tokens: Token[],
  pageIndex: number,
  auto: number,
  lineNo: number,
  raw: string,
  componentMap: ReadonlyMap<string, Component>,
): PageItem {
  if (tokens.length < 7) {
    throw new BocetoParseError(
      `'element' requires: TYPE X Y W H "label" (got ${tokens.length - 1} args)`,
      lineNo + 1,
      raw,
    )
  }
  const typeTok = tokens[1]!
  const { type } = splitTypeAndId(typeTok)
  if (componentMap.has(type)) {
    return parseComponentInstance(tokens, pageIndex, auto, lineNo, raw, componentMap.get(type)!)
  }
  return parseElement(tokens, pageIndex, auto, lineNo, raw)
}

function parseElement(
  tokens: Token[],
  pageIndex: number,
  auto: number,
  lineNo: number,
  raw: string,
): Element {
  const [, typeTok, xTok, yTok, wTok, hTok, labelTok, ...rest] = tokens
  const { type, namedId } = splitTypeAndId(typeTok!)
  if (!ELEMENT_TYPE_SET.has(type)) {
    throw new BocetoParseError(`Unknown element type "${type}"`, lineNo + 1, raw)
  }
  if (namedId !== undefined && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(namedId)) {
    throw new BocetoParseError(
      `Named id "${namedId}" must match [A-Za-z][A-Za-z0-9_-]*`,
      lineNo + 1,
      raw,
    )
  }
  if (!labelTok!.quoted) {
    throw new BocetoParseError(`'element' label must be a quoted string`, lineNo + 1, raw)
  }

  let note: string | undefined
  let attrStart = 0
  if (rest.length > 0 && rest[0]!.quoted) {
    note = rest[0]!.value
    attrStart = 1
  }
  const attrs = parseAttrs(rest.slice(attrStart), lineNo, raw)
  const attrId = typeof attrs.id === 'string' ? attrs.id : undefined
  if (namedId !== undefined && attrId !== undefined && namedId !== attrId) {
    throw new BocetoParseError(
      `Conflicting ids: shorthand "${namedId}" vs id="${attrId}"`,
      lineNo + 1,
      raw,
    )
  }
  const id = namedId ?? attrId ?? `p${pageIndex}e${auto}`
  if ('id' in attrs) delete attrs.id

  return {
    id,
    type: type as ElementType,
    x: posInt(xTok!, 'x', lineNo, raw),
    y: posInt(yTok!, 'y', lineNo, raw),
    w: posInt(wTok!, 'w', lineNo, raw),
    h: posInt(hTok!, 'h', lineNo, raw),
    label: labelTok!.value,
    note,
    attrs,
  }
}

/**
 * Parse `element <componentName>[#id] X Y W H "" param1=val1 ...` into a
 * `ComponentInstance` with substituted, translated children.
 */
function parseComponentInstance(
  tokens: Token[],
  pageIndex: number,
  auto: number,
  lineNo: number,
  raw: string,
  component: Component,
): ComponentInstance {
  const [, typeTok, xTok, yTok, wTok, hTok, labelTok, ...rest] = tokens
  const { namedId } = splitTypeAndId(typeTok!)
  if (namedId !== undefined && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(namedId)) {
    throw new BocetoParseError(
      `Named id "${namedId}" must match [A-Za-z][A-Za-z0-9_-]*`,
      lineNo + 1,
      raw,
    )
  }
  if (!labelTok!.quoted) {
    throw new BocetoParseError(
      `Composite reference label slot must be present (use "")`,
      lineNo + 1,
      raw,
    )
  }
  // Skip an optional note slot (unused for composites but allowed for grammar parity).
  let attrStart = 0
  if (rest.length > 0 && rest[0]!.quoted) attrStart = 1
  const attrsRaw = parseAttrs(rest.slice(attrStart), lineNo, raw)
  const attrId = typeof attrsRaw.id === 'string' ? attrsRaw.id : undefined
  if (namedId !== undefined && attrId !== undefined && namedId !== attrId) {
    throw new BocetoParseError(
      `Conflicting ids: shorthand "${namedId}" vs id="${attrId}"`,
      lineNo + 1,
      raw,
    )
  }
  const id = namedId ?? attrId ?? `p${pageIndex}c${auto}`
  if ('id' in attrsRaw) delete attrsRaw.id

  // Coerce parameter values to strings (composite params are always string-keyed
  // — substitution happens in string contexts only).
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(attrsRaw)) params[k] = String(v)

  const x = posInt(xTok!, 'x', lineNo, raw)
  const y = posInt(yTok!, 'y', lineNo, raw)
  const w = posInt(wTok!, 'w', lineNo, raw)
  const h = posInt(hTok!, 'h', lineNo, raw)

  return {
    kind: 'component-instance',
    id,
    componentName: component.name,
    x,
    y,
    w,
    h,
    params,
    expanded: expandComponentBody(component, id, x, y, params),
  }
}

/**
 * Substitute `$name` / `${name}` in the component's body, translate each
 * child by `(instanceX, instanceY)`, and namespace its id so multiple
 * instances of the same component don't collide.
 */
function expandComponentBody(
  component: Component,
  instanceId: string,
  instanceX: number,
  instanceY: number,
  params: Record<string, string>,
): Element[] {
  const out: Element[] = []
  for (const item of component.body) {
    // Components carry `Element | Arrow` in their bodies. Arrows in component
    // bodies are passed through as-is (skipped here) — the renderer handles
    // them once the editor lands. For v0.1 we focus on element expansion.
    if ('from' in item && 'to' in item) continue
    const el = item
    const subbedAttrs: Record<string, AttrValue> = {}
    for (const [k, v] of Object.entries(el.attrs)) {
      subbedAttrs[k] = typeof v === 'string' ? substituteParams(v, params) : v
    }
    out.push({
      id: `${instanceId}.${el.id}`,
      type: el.type,
      x: el.x + instanceX,
      y: el.y + instanceY,
      w: el.w,
      h: el.h,
      label: substituteParams(el.label, params),
      note: el.note != null ? substituteParams(el.note, params) : undefined,
      attrs: subbedAttrs,
    })
  }
  return out
}

const VAR_BRACED_RE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g
const VAR_BARE_RE = /\$([A-Za-z_][A-Za-z0-9_]*)/g

function substituteParams(s: string, params: Record<string, string>): string {
  return s
    .replace(VAR_BRACED_RE, (_, name) => params[name] ?? '')
    .replace(VAR_BARE_RE, (_, name) => params[name] ?? '')
}

function parseText(
  tokens: Token[],
  pageIndex: number,
  auto: number,
  lineNo: number,
  raw: string,
): Element {
  if (tokens.length < 4) {
    throw new BocetoParseError(`'text' requires: X Y "text"`, lineNo + 1, raw)
  }
  const [, xTok, yTok, textTok, ...rest] = tokens
  if (!textTok!.quoted) {
    throw new BocetoParseError(`'text' content must be a quoted string`, lineNo + 1, raw)
  }
  const attrs = parseAttrs(rest, lineNo, raw)
  const id = typeof attrs.id === 'string' ? attrs.id : `p${pageIndex}e${auto}`
  if ('id' in attrs) delete attrs.id

  const w = typeof attrs.w === 'number' ? attrs.w : 200
  const h = typeof attrs.h === 'number' ? attrs.h : 24
  if ('w' in attrs) delete attrs.w
  if ('h' in attrs) delete attrs.h

  return {
    id,
    type: 'label',
    x: posInt(xTok!, 'x', lineNo, raw),
    y: posInt(yTok!, 'y', lineNo, raw),
    w,
    h,
    label: textTok!.value,
    attrs,
  }
}

function parseArrow(
  tokens: Token[],
  pageIndex: number,
  auto: number,
  lineNo: number,
  raw: string,
): Arrow {
  if (tokens.length < 3) {
    throw new BocetoParseError(`'arrow' requires: FROM_ID TO_ID`, lineNo + 1, raw)
  }
  const [, fromTok, toTok, labelTok] = tokens
  if (fromTok!.quoted || toTok!.quoted) {
    throw new BocetoParseError(`arrow IDs must be unquoted identifiers`, lineNo + 1, raw)
  }
  const label = labelTok && labelTok.quoted ? labelTok.value : undefined
  return {
    id: `p${pageIndex}a${auto}`,
    from: fromTok!.value,
    to: toTok!.value,
    label,
  }
}

function parseLayoutFrame(
  kind: 'row' | 'col',
  tokens: Token[],
  lineNo: number,
  raw: string,
): LayoutFrame {
  if (tokens.length < 5) {
    throw new BocetoParseError(`'${kind}' requires: X Y W H [gap=N align=...]`, lineNo + 1, raw)
  }
  const [, xTok, yTok, wTok, hTok, ...rest] = tokens
  const attrs = parseAttrs(rest, lineNo, raw)
  const gap = typeof attrs.gap === 'number' ? attrs.gap : 0
  const align = typeof attrs.align === 'string' ? attrs.align : kind === 'row' ? 'middle' : 'start'
  return {
    kind,
    x: posInt(xTok!, 'x', lineNo, raw),
    y: posInt(yTok!, 'y', lineNo, raw),
    w: posInt(wTok!, 'w', lineNo, raw),
    h: posInt(hTok!, 'h', lineNo, raw),
    gap,
    align,
    children: [],
    startLine: lineNo,
  }
}

function applyLayout(frame: LayoutFrame): Element[] {
  if (frame.children.length === 0) return []
  if (frame.kind === 'row') return layoutRow(frame)
  return layoutCol(frame)
}

function layoutRow(frame: LayoutFrame): Element[] {
  let cursor = frame.x
  return frame.children.map((c) => {
    const childY =
      frame.align === 'start'
        ? frame.y
        : frame.align === 'end'
          ? frame.y + frame.h - c.h
          : frame.y + Math.round((frame.h - c.h) / 2)
    const placed: Element = { ...c, x: cursor, y: childY }
    cursor += c.w + frame.gap
    return placed
  })
}

function layoutCol(frame: LayoutFrame): Element[] {
  let cursor = frame.y
  return frame.children.map((c) => {
    let childX = frame.x
    let childW = c.w
    if (frame.align === 'stretch') {
      childW = frame.w
    } else if (frame.align === 'end') {
      childX = frame.x + frame.w - c.w
    } else if (frame.align === 'middle') {
      childX = frame.x + Math.round((frame.w - c.w) / 2)
    }
    const placed: Element = { ...c, x: childX, y: cursor, w: childW }
    cursor += c.h + frame.gap
    return placed
  })
}

function parseAttrs(tokens: Token[], lineNo: number, raw: string): Record<string, AttrValue> {
  const attrs: Record<string, AttrValue> = {}
  for (const tok of tokens) {
    if (tok.quoted) continue
    const eq = tok.value.indexOf('=')
    if (eq < 1) {
      throw new BocetoParseError(
        `Expected key=value attribute, got "${tok.value}"`,
        lineNo + 1,
        raw,
      )
    }
    const key = tok.value.slice(0, eq)
    const valStr = tok.value.slice(eq + 1)
    const num = Number(valStr)
    attrs[key] = valStr !== '' && !Number.isNaN(num) ? num : valStr
  }
  return attrs
}

function posInt(tok: Token, name: string, lineNo: number, raw: string): number {
  const n = Number(tok.value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new BocetoParseError(
      `'${name}' must be a non-negative integer, got "${tok.value}"`,
      lineNo + 1,
      raw,
    )
  }
  return n
}
