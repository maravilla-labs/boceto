/**
 * Pass 2 — parse a single page body into `Page.elements` + `Page.arrows`.
 *
 * Statement dispatch lives here; the heavy lifting is delegated to focused
 * parsers in `./elements` and `./layout`. The parser tracks a stack of
 * **open frames** — `row`/`col` containers, block-form composite call sites,
 * and named-slot sub-blocks at those call sites — which routes each parsed
 * statement to the right destination.
 */

import type {
  Arrow,
  Component,
  ComponentInstance,
  Element,
  Page,
  PageItem,
  Slot,
} from '../types'
import { DEFAULT_SLOT, isComponentInstance } from '../types'
import { tokenize } from '../tokenizer'
import { BocetoParseError } from './errors'
import { parseArrow, parseElementOrInstance, parseText } from './elements'
import type { LayoutFrame } from './layout'
import { parseLayoutFrame } from './layout'
import { expandInstance } from './components'
import { NAMED_ID_RE } from './attrs'

/**
 * One of the three things that can be "open" on the parse stack:
 *
 *  - `layout` — a `row`/`col` container accumulating children.
 *  - `instance` — a block-form composite call (line ending with `:`)
 *    accumulating slot content. Bare children flow into the default slot;
 *    `slot NAME … end` sub-blocks push a `slot` frame and route children
 *    into a named slot.
 *  - `slot` — a `slot NAME … end` sub-block nested inside an `instance`
 *    frame. Holds the children that fill one named slot.
 */
type OpenFrame =
  | { ftype: 'layout'; frame: LayoutFrame }
  | {
      ftype: 'instance'
      startLine: number
      instance: ComponentInstance
      /** Bare children at the call site (children not wrapped in `slot NAME … end`). */
      defaultSlot: PageItem[]
      /** Named slot content keyed by slot name. */
      namedSlots: Map<string, PageItem[]>
    }
  | { ftype: 'slot'; startLine: number; name: string; children: PageItem[] }
  | {
      ftype: 'element-container'
      startLine: number
      element: Element
      children: PageItem[]
    }

export interface ParsePageOptions {
  /**
   * When true, the parser accepts the standalone `slot [NAME]` statement as
   * a body marker (produces a `Slot` item in the result). Used when parsing
   * `component … end` bodies. False (default) rejects `slot` at the top
   * level — it's only valid inside an open `instance` frame as the opener
   * of a `slot NAME … end` sub-block.
   */
  allowSlotMarker?: boolean
}

export function parsePage(
  name: string,
  pageIndex: number,
  body: string,
  componentMap: ReadonlyMap<string, Component>,
  options: ParsePageOptions = {},
): Page {
  const items: (PageItem | Slot)[] = []
  const arrows: Arrow[] = []
  let autoCounter = 1
  const stack: OpenFrame[] = []
  const lines = body.split('\n')
  const allowSlotMarker = options.allowSlotMarker === true

  /**
   * Route a parsed item to the right destination based on the current top
   * frame. Slot markers are routed too (component body parsing relies on
   * them landing in `items`); page-level callers filter them out.
   */
  function pushItem(item: PageItem | Slot, lineNo: number, raw: string): void {
    if (stack.length === 0) {
      items.push(item)
      return
    }
    const top = stack[stack.length - 1]!
    if (top.ftype === 'slot') {
      if (isSlotMarker(item)) {
        throw new BocetoParseError(
          `'slot' markers belong in component bodies, not in slot-fill blocks`,
          lineNo + 1,
          raw,
        )
      }
      top.children.push(item)
      return
    }
    if (top.ftype === 'instance') {
      if (isSlotMarker(item)) {
        throw new BocetoParseError(
          `'slot' markers belong in component bodies, not in composite call sites`,
          lineNo + 1,
          raw,
        )
      }
      top.defaultSlot.push(item)
      return
    }
    if (top.ftype === 'element-container') {
      if (isSlotMarker(item)) {
        throw new BocetoParseError(
          `'slot' markers belong in component bodies, not inside an element's children block`,
          lineNo + 1,
          raw,
        )
      }
      top.children.push(item)
      return
    }
    // layout
    if (isSlotMarker(item)) {
      throw new BocetoParseError(
        `'slot' markers belong in component bodies, not inside a 'row' or 'col'`,
        lineNo + 1,
        raw,
      )
    }
    top.frame.children.push(item)
  }

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const raw = lines[lineNo] ?? ''
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue

    const tokens = tokenize(trimmed)
    if (tokens.length === 0) continue

    // Block-form opener: a standalone trailing `:` token signals "this line
    // opens a block of children, closed by `end`". The tokenizer splits on
    // whitespace, so `:` survives as its own token only when preceded by
    // space. That keeps `:` legal inside attribute values without ambiguity.
    let blockOpen = false
    const last = tokens[tokens.length - 1]!
    if (!last.quoted && last.value === ':') {
      blockOpen = true
      tokens.pop()
    }

    const head = tokens[0]
    if (!head || head.quoted) {
      throw new BocetoParseError(
        `Expected statement keyword, got "${head?.value ?? ''}"`,
        lineNo + 1,
        raw,
      )
    }

    // `row#id` / `col#id` are valid heads — strip the `#id` for the keyword
    // switch but pass the full token onward to `parseLayoutFrame`.
    const headKeyword = head.value.split('#')[0]!

    switch (headKeyword) {
      case 'element': {
        const item = parseElementOrInstance(
          tokens,
          pageIndex,
          autoCounter++,
          lineNo,
          raw,
          componentMap,
        )
        if (blockOpen) {
          if (isComponentInstance(item)) {
            // Composite call site with `:` — opens a slot/children block.
            stack.push({
              ftype: 'instance',
              startLine: lineNo,
              instance: item,
              defaultSlot: [],
              namedSlots: new Map(),
            })
          } else {
            // Built-in element with `:` — opens a children block. The element
            // acts as a container; its chrome renders normally and the body
            // children flex- or absolute-layout inside the content rect.
            stack.push({
              ftype: 'element-container',
              startLine: lineNo,
              element: item as Element,
              children: [],
            })
          }
        } else {
          pushItem(item, lineNo, raw)
        }
        break
      }
      case 'text':
        if (blockOpen) {
          throw new BocetoParseError(`'text' does not accept a children block`, lineNo + 1, raw)
        }
        pushItem(parseText(tokens, pageIndex, autoCounter++, lineNo, raw), lineNo, raw)
        break
      case 'arrow':
        if (blockOpen) {
          throw new BocetoParseError(`'arrow' does not accept a children block`, lineNo + 1, raw)
        }
        arrows.push(parseArrow(tokens, pageIndex, autoCounter++, lineNo, raw))
        break
      case 'row':
      case 'col': {
        if (blockOpen) {
          // `row 0 0 ...:` is redundant — `row`/`col` already opens a block.
          // Quietly tolerate to keep the rule simple.
        }
        const frame = parseLayoutFrame(headKeyword, tokens, pageIndex, autoCounter++, lineNo, raw)
        stack.push({ ftype: 'layout', frame })
        break
      }
      case 'slot': {
        if (stack.length > 0 && stack[stack.length - 1]!.ftype === 'instance') {
          // At a call site: `slot NAME` opens a sub-block that fills a named
          // slot. The default slot is filled by bare children — no `slot`
          // keyword needed for that.
          const slotName = parseSlotName(tokens, lineNo, raw, /* requireName */ true)!
          stack.push({ ftype: 'slot', startLine: lineNo, name: slotName, children: [] })
          break
        }
        if (allowSlotMarker) {
          // Standalone slot marker inside a component body. `slot` alone =
          // anonymous default slot; `slot NAME` = named slot.
          const slotName = parseSlotName(tokens, lineNo, raw, /* requireName */ false)
          const slot: Slot = { kind: 'slot' }
          if (slotName) slot.name = slotName
          pushItem(slot, lineNo, raw)
          break
        }
        throw new BocetoParseError(
          `'slot' is only valid inside a component body or inside a composite call's children block`,
          lineNo + 1,
          raw,
        )
      }
      case 'end': {
        const frame = stack.pop()
        if (!frame) {
          throw new BocetoParseError(
            `'end' with no matching 'row', 'col', 'component', composite call, or 'slot' block`,
            lineNo + 1,
            raw,
          )
        }
        if (frame.ftype === 'layout') {
          const { startLine: _drop, ...container } = frame.frame
          pushItem(container, lineNo, raw)
        } else if (frame.ftype === 'element-container') {
          // Attach the collected children to the element and push it.
          frame.element.children = frame.children
          pushItem(frame.element, lineNo, raw)
        } else if (frame.ftype === 'instance') {
          // Finalize the call-site slot content and re-expand the instance
          // with it. The instance was already expanded once (single-line
          // path) without slots; redo with the populated slot map.
          const slotContent: Record<string, PageItem[]> = {}
          if (frame.defaultSlot.length > 0) slotContent[DEFAULT_SLOT] = frame.defaultSlot
          for (const [k, v] of frame.namedSlots) slotContent[k] = v

          if (Object.keys(slotContent).length > 0) {
            const comp = componentMap.get(frame.instance.componentName)
            if (!comp) {
              throw new BocetoParseError(
                `Unknown component "${frame.instance.componentName}"`,
                lineNo + 1,
                raw,
              )
            }
            const re = expandInstance(
              comp,
              frame.instance.id,
              frame.instance.x,
              frame.instance.y,
              frame.instance.params,
              componentMap,
              new Set(),
              slotContent,
            )
            frame.instance.expanded = re
            frame.instance.slots = slotContent
          }
          pushItem(frame.instance, lineNo, raw)
        } else {
          // slot frame — attach its children to the parent instance frame.
          const parent = stack[stack.length - 1]
          if (!parent || parent.ftype !== 'instance') {
            throw new BocetoParseError(
              `'slot ${frame.name} … end' must close inside a composite call's children block`,
              lineNo + 1,
              raw,
            )
          }
          if (parent.namedSlots.has(frame.name)) {
            throw new BocetoParseError(
              `Duplicate 'slot ${frame.name}' at this composite call site`,
              lineNo + 1,
              raw,
            )
          }
          parent.namedSlots.set(frame.name, frame.children)
        }
        break
      }
      default:
        throw new BocetoParseError(`Unknown statement keyword "${head.value}"`, lineNo + 1, raw)
    }
  }

  if (stack.length > 0) {
    const top = stack[stack.length - 1]!
    if (top.ftype === 'layout') {
      throw new BocetoParseError(
        `Unclosed '${top.frame.direction}' (started on line ${top.frame.startLine + 1}); expected 'end'`,
        top.frame.startLine + 1,
      )
    }
    if (top.ftype === 'instance') {
      throw new BocetoParseError(
        `Unclosed composite call (started on line ${top.startLine + 1}); expected 'end'`,
        top.startLine + 1,
      )
    }
    if (top.ftype === 'element-container') {
      throw new BocetoParseError(
        `Unclosed 'element ${top.element.type}' block (started on line ${top.startLine + 1}); expected 'end'`,
        top.startLine + 1,
      )
    }
    throw new BocetoParseError(
      `Unclosed 'slot ${top.name}' (started on line ${top.startLine + 1}); expected 'end'`,
      top.startLine + 1,
    )
  }

  // `items` may contain `Slot` markers if `allowSlotMarker` was set. We hand
  // them through as PageItems via the union; downstream component-body
  // collection is the one place that actually expects them.
  return { id: `p${pageIndex}`, name, elements: items as PageItem[], arrows }
}

function isSlotMarker(item: PageItem | Slot): item is Slot {
  return 'kind' in item && item.kind === 'slot'
}

/**
 * Parse the optional NAME from a `slot [NAME]` line. NAME must match the
 * standard identifier rule; absent name returns `undefined` (anonymous).
 * When `requireName` is true (call-site `slot NAME ... end`), absence is
 * a parse error.
 */
function parseSlotName(
  tokens: ReturnType<typeof tokenize>,
  lineNo: number,
  raw: string,
  requireName: boolean,
): string | undefined {
  if (tokens.length === 1) {
    if (requireName) {
      throw new BocetoParseError(
        `'slot' at a call site requires a NAME (use 'slot NAME ... end')`,
        lineNo + 1,
        raw,
      )
    }
    return undefined
  }
  if (tokens.length > 2) {
    throw new BocetoParseError(`'slot' takes at most one argument (the slot name)`, lineNo + 1, raw)
  }
  const nameTok = tokens[1]!
  if (nameTok.quoted) {
    throw new BocetoParseError(`Slot name must be an unquoted identifier`, lineNo + 1, raw)
  }
  if (!NAMED_ID_RE.test(nameTok.value)) {
    throw new BocetoParseError(
      `Slot name "${nameTok.value}" must match [A-Za-z][A-Za-z0-9_-]*`,
      lineNo + 1,
      raw,
    )
  }
  return nameTok.value
}
