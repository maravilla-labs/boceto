/**
 * Statement-level parsers for `element`, `text`, `arrow`, and composite
 * (component-reference) call sites. Each returns a fully-built `PageItem` or
 * `Arrow` value; the surrounding page loop handles dispatching.
 */

import type {
  Arrow,
  AttrValue,
  Component,
  ComponentDefaults,
  ComponentInstance,
  Element,
  ElementType,
  PageItem,
} from '../types'
import { ELEMENT_TYPES } from '../types'
import type { Token } from '../tokenizer'
import { BocetoParseError } from './errors'
import { posInt, posIntOrAuto } from './primitives'
import {
  FLEX_ALIGN_VALUES,
  FLEX_DIRECTION_VALUES,
  FLEX_JUSTIFY_VALUES,
  FLEX_WRAP_VALUES,
  NAMED_ID_RE,
  consumeEnum,
  consumeOptionalNumber,
  extractFlexChildProps,
  parseAttrs,
  splitTypeAndId,
} from './attrs'
import type { FlexAlign, FlexDirection, FlexJustify, FlexWrap } from '../types'
import { expandInstance } from './components'

const ELEMENT_TYPE_SET: ReadonlySet<string> = new Set(ELEMENT_TYPES)

/**
 * Dispatches `element <type> ...` lines to either `parseElement` (built-in
 * type) or `parseComponentInstance` (a defined composite).
 */
export function parseElementOrInstance(
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
  const component = componentMap.get(type)
  if (component) {
    return parseComponentInstance(tokens, pageIndex, auto, lineNo, raw, component, componentMap)
  }
  return parseElement(tokens, pageIndex, auto, lineNo, raw)
}

export function parseElement(
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
  if (namedId !== undefined && !NAMED_ID_RE.test(namedId)) {
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

  const flex = extractFlexChildProps(attrs, lineNo, raw)
  // Container attrs on element lines. Only meaningful when the element is
  // opened in block-form (`element ... :`) so it actually has children to
  // lay out, but we extract them unconditionally — when no children are
  // attached, they're ignored by the layout pass.
  const container = extractContainerAttrs(attrs, type, lineNo, raw)

  return {
    id,
    type: type as ElementType,
    x: posInt(xTok!, 'x', lineNo, raw),
    y: posInt(yTok!, 'y', lineNo, raw),
    // `auto` is accepted on built-in elements (especially useful when the
    // element has block-form children and should size to its content). It's
    // stored as `0`, which the layout pass already treats as "no preferred
    // size" — semantically identical to `auto` everywhere else.
    w: autoOrPosInt(wTok!, 'w', lineNo, raw),
    h: autoOrPosInt(hTok!, 'h', lineNo, raw),
    label: labelTok!.value,
    note,
    attrs,
    ...flex,
    ...container,
  }
}

/**
 * Like `posInt`, but accepts the literal `auto` (stored as `0`). Used for
 * `element` W/H slots so authors can write `auto` for "no preferred size".
 */
function autoOrPosInt(tok: Token, name: string, lineNo: number, raw: string): number {
  const result = posIntOrAuto(tok, name, lineNo, raw)
  return result === 'auto' ? 0 : result
}

/**
 * Extract optional flex-container attrs (`direction`, `gap`, `padding`,
 * `justify`, `align`, `wrap`) from an element's attrs bag. These let any
 * element act as a container for block-form children:
 *
 *   element box 0 0 400 200 "" direction=col padding=12 gap=8 :
 *     element heading 0 0 0 24 "Hello"
 *   end
 *
 * Consumed keys are deleted from `attrs` so they don't pollute the renderer.
 */
function extractContainerAttrs(
  attrs: Record<string, AttrValue>,
  ownerKeyword: string,
  lineNo: number,
  raw: string,
): {
  direction?: FlexDirection
  gap?: number
  padding?: number
  justify?: FlexJustify
  align?: FlexAlign
  wrap?: FlexWrap
} {
  const out: ReturnType<typeof extractContainerAttrs> = {}
  const direction = consumeEnum<FlexDirection>(
    attrs,
    'direction',
    FLEX_DIRECTION_VALUES,
    ownerKeyword,
    lineNo,
    raw,
  )
  if (direction) out.direction = direction
  const gap = consumeOptionalNumber(attrs, 'gap', ownerKeyword, lineNo, raw)
  if (gap != null) out.gap = gap
  const padding = consumeOptionalNumber(attrs, 'padding', ownerKeyword, lineNo, raw)
  if (padding != null) out.padding = padding
  const justify = consumeEnum<FlexJustify>(
    attrs,
    'justify',
    FLEX_JUSTIFY_VALUES,
    ownerKeyword,
    lineNo,
    raw,
  )
  if (justify) out.justify = justify
  const align = consumeEnum<FlexAlign>(attrs, 'align', FLEX_ALIGN_VALUES, ownerKeyword, lineNo, raw)
  if (align) out.align = align
  const wrap = consumeEnum<FlexWrap>(attrs, 'wrap', FLEX_WRAP_VALUES, ownerKeyword, lineNo, raw)
  if (wrap) out.wrap = wrap
  return out
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
  componentMap: ReadonlyMap<string, Component>,
): ComponentInstance {
  const [, typeTok, xTok, yTok, wTok, hTok, labelTok, ...rest] = tokens
  const { namedId } = splitTypeAndId(typeTok!)
  if (namedId !== undefined && !NAMED_ID_RE.test(namedId)) {
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

  // Pull per-instance flex-child overrides out before the rest become params,
  // so e.g. `grow=1` configures Yoga layout instead of becoming a $grow
  // string param the component never declared.
  const callFlex = extractFlexChildProps(attrsRaw, lineNo, raw)

  // Coerce remaining attrs to string params (composite params are always
  // string-keyed — substitution happens in string contexts only).
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(attrsRaw)) params[k] = String(v)

  const x = posInt(xTok!, 'x', lineNo, raw)
  const y = posInt(yTok!, 'y', lineNo, raw)
  const wTokVal = posIntOrAuto(wTok!, 'w', lineNo, raw)
  const hTokVal = posIntOrAuto(hTok!, 'h', lineNo, raw)
  // At an instance call site, `0` and `auto` mean the same thing: no
  // explicit size — defer to the component default, then to layout. An
  // explicit 0-size instance has no meaningful rendering, so collapsing
  // them is unambiguous and lets authors write `0 0` without losing
  // defaults.
  const wExplicit = wTokVal === 'auto' || wTokVal === 0 ? undefined : wTokVal
  const hExplicit = hTokVal === 'auto' || hTokVal === 0 ? undefined : hTokVal

  // Effective sizing/flex props: call-site value wins over the component's
  // defaults declared on the `component` header.
  const defaults: ComponentDefaults = component.defaults ?? {}
  const effective: Partial<ComponentInstance> = {
    grow: callFlex.grow ?? defaults.grow,
    shrink: callFlex.shrink ?? defaults.shrink,
    basis: callFlex.basis ?? defaults.basis,
    alignSelf: callFlex.alignSelf ?? defaults.alignSelf,
    minW: callFlex.minW ?? defaults.minW,
    minH: callFlex.minH ?? defaults.minH,
    maxW: callFlex.maxW ?? defaults.maxW,
    maxH: callFlex.maxH ?? defaults.maxH,
  }

  // Origin for body expansion: declared (x, y). Layout pass overlays
  // computed coords on top via `computed`.
  return {
    kind: 'component-instance',
    id,
    componentName: component.name,
    x,
    y,
    w: wExplicit ?? defaults.w ?? 'auto',
    h: hExplicit ?? defaults.h ?? 'auto',
    params,
    expanded: expandInstance(component, id, x, y, params, componentMap),
    ...stripUndefined(effective),
  }
}

/** Drop `undefined` values so we don't spread them into the result object. */
function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

export function parseText(
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

  const flex = extractFlexChildProps(attrs, lineNo, raw)

  return {
    id,
    type: 'label',
    x: posInt(xTok!, 'x', lineNo, raw),
    y: posInt(yTok!, 'y', lineNo, raw),
    w,
    h,
    label: textTok!.value,
    attrs,
    ...flex,
  }
}

export function parseArrow(
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
