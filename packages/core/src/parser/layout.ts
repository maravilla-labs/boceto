/**
 * `row` / `col` line parsing — produces an in-progress `FlexContainer` builder
 * that the page loop fills with children and finalizes on `end`.
 */

import type { FlexAlign, FlexContainer, FlexJustify, FlexWrap } from '../types'
import type { Token } from '../tokenizer'
import { BocetoParseError } from './errors'
import { posInt, posIntOrAuto } from './primitives'
import {
  FLEX_ALIGN_VALUES,
  FLEX_JUSTIFY_VALUES,
  FLEX_WRAP_VALUES,
  NAMED_ID_RE,
  consumeEnum,
  consumeOptionalNumber,
  extractFlexChildProps,
  parseAttrs,
  splitTypeAndId,
} from './attrs'

/**
 * In-progress builder for a `FlexContainer`. We accumulate children as the
 * page parser walks lines, then on `end` push the finished container as a
 * `PageItem`. `startLine` is kept for unclosed-block error messages.
 */
export interface LayoutFrame extends FlexContainer {
  startLine: number
}

export function parseLayoutFrame(
  kind: 'row' | 'col',
  tokens: Token[],
  pageIndex: number,
  auto: number,
  lineNo: number,
  raw: string,
): LayoutFrame {
  if (tokens.length < 5) {
    throw new BocetoParseError(
      `'${kind}' requires: X Y W H [gap=N align=... justify=... padding=N wrap=... ...]`,
      lineNo + 1,
      raw,
    )
  }

  const headTok = tokens[0]!
  const { namedId } = splitTypeAndId(headTok)
  if (namedId !== undefined && !NAMED_ID_RE.test(namedId)) {
    throw new BocetoParseError(
      `Named id "${namedId}" must match [A-Za-z][A-Za-z0-9_-]*`,
      lineNo + 1,
      raw,
    )
  }

  const [, xTok, yTok, wTok, hTok, ...rest] = tokens
  const attrs = parseAttrs(rest, lineNo, raw)

  const attrId = typeof attrs.id === 'string' ? attrs.id : undefined
  if (namedId !== undefined && attrId !== undefined && namedId !== attrId) {
    throw new BocetoParseError(
      `Conflicting ids: shorthand "${namedId}" vs id="${attrId}"`,
      lineNo + 1,
      raw,
    )
  }
  const id = namedId ?? attrId ?? `p${pageIndex}f${auto}`
  if ('id' in attrs) delete attrs.id

  const gap = consumeOptionalNumber(attrs, 'gap', kind, lineNo, raw) ?? 0
  const padding = consumeOptionalNumber(attrs, 'padding', kind, lineNo, raw) ?? 0
  const align =
    consumeEnum<FlexAlign>(attrs, 'align', FLEX_ALIGN_VALUES, kind, lineNo, raw) ??
    (kind === 'row' ? 'middle' : 'start')
  const justify =
    consumeEnum<FlexJustify>(attrs, 'justify', FLEX_JUSTIFY_VALUES, kind, lineNo, raw) ?? 'start'
  const wrap =
    consumeEnum<FlexWrap>(attrs, 'wrap', FLEX_WRAP_VALUES, kind, lineNo, raw) ?? 'nowrap'

  // Per-child flex props (only meaningful when this container is itself a
  // child of another container; harmless otherwise). Also consumes min-w/h
  // and max-w/h, which double as container constraints.
  const childFlex = extractFlexChildProps(attrs, lineNo, raw)

  // Any leftover keys are an authoring error — fail loud (matches today's
  // strict-attribute behavior for element typos).
  const extra = Object.keys(attrs)
  if (extra.length > 0) {
    throw new BocetoParseError(
      `Unknown '${kind}' attribute(s): ${extra.map((k) => `"${k}"`).join(', ')}`,
      lineNo + 1,
      raw,
    )
  }

  return {
    kind: 'flex-container',
    id,
    direction: kind,
    x: posInt(xTok!, 'x', lineNo, raw),
    y: posInt(yTok!, 'y', lineNo, raw),
    w: posIntOrAuto(wTok!, 'w', lineNo, raw),
    h: posIntOrAuto(hTok!, 'h', lineNo, raw),
    padding,
    gap,
    justify,
    align,
    wrap,
    ...childFlex,
    children: [],
    startLine: lineNo,
  }
}
