import type { AttrValue, FlexAlign, FlexDirection, FlexJustify, FlexWrap } from '../types'
import type { Token } from '../tokenizer'
import { BocetoParseError } from './errors'

// Shared enum value tables — used by `row`/`col` parsing in `layout.ts` and by
// `component` header parsing in `components.ts`. Kept here so both call sites
// share a single source of truth.
export const FLEX_DIRECTION_VALUES: readonly FlexDirection[] = ['row', 'col']
export const FLEX_JUSTIFY_VALUES: readonly FlexJustify[] = [
  'start',
  'middle',
  'end',
  'between',
  'around',
  'evenly',
]
export const FLEX_ALIGN_VALUES: readonly FlexAlign[] = ['start', 'middle', 'end', 'stretch']
export const FLEX_WRAP_VALUES: readonly FlexWrap[] = ['nowrap', 'wrap', 'wrap-reverse']

/**
 * Parse a sequence of `key=value` attribute tokens into a plain bag. Values
 * that round-trip cleanly through `Number()` become numbers; everything else
 * stays a string. Quoted tokens are skipped (they belong to the preceding
 * slot — label or note).
 *
 * Callers typically pull out the keys they understand (mutating the bag via
 * `delete`) and leave the rest in `attrs` for the renderer.
 */
export function parseAttrs(
  tokens: Token[],
  lineNo: number,
  raw: string,
): Record<string, AttrValue> {
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

/**
 * Split a `TYPE#ID` head token into its parts. Returns `{ type, namedId }`;
 * `namedId` is `undefined` when no `#id` shorthand is present.
 */
export function splitTypeAndId(tok: Token): {
  type: string
  namedId: string | undefined
} {
  const v = tok.value
  const hash = v.indexOf('#')
  if (hash < 0) return { type: v, namedId: undefined }
  return { type: v.slice(0, hash), namedId: v.slice(hash + 1) }
}

const ALIGN_SELF_VALUES: readonly ('auto' | FlexAlign)[] = [
  'auto',
  'start',
  'middle',
  'end',
  'stretch',
]

/**
 * Pull the per-child flex attributes (`grow`, `shrink`, `basis`, `align-self`,
 * `min-w/h`, `max-w/h`) out of an attrs bag and onto typed fields. Mutates
 * `attrs` (deletes consumed keys) so the leftover bag stays clean for
 * round-trip serialization of unrelated attrs.
 */
export function extractFlexChildProps(
  attrs: Record<string, AttrValue>,
  lineNo: number,
  raw: string,
): {
  grow?: number
  shrink?: number
  basis?: number | 'auto'
  alignSelf?: 'auto' | FlexAlign
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
} {
  const out: ReturnType<typeof extractFlexChildProps> = {}
  if ('grow' in attrs) {
    out.grow = consumeNonNegativeNumber(attrs, 'grow', lineNo, raw)
  }
  if ('shrink' in attrs) {
    out.shrink = consumeNonNegativeNumber(attrs, 'shrink', lineNo, raw)
  }
  if ('basis' in attrs) {
    const v = attrs.basis
    if (v === 'auto') out.basis = 'auto'
    else if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out.basis = v
    else {
      throw new BocetoParseError(
        `'basis' must be a non-negative number or "auto", got "${String(v)}"`,
        lineNo + 1,
        raw,
      )
    }
    delete attrs.basis
  }
  if ('align-self' in attrs) {
    const v = attrs['align-self']
    if (typeof v !== 'string' || !(ALIGN_SELF_VALUES as readonly string[]).includes(v)) {
      throw new BocetoParseError(
        `'align-self' must be one of ${ALIGN_SELF_VALUES.map((a) => `"${a}"`).join(', ')}; got "${String(v)}"`,
        lineNo + 1,
        raw,
      )
    }
    out.alignSelf = v as 'auto' | FlexAlign
    delete attrs['align-self']
  }
  for (const [key, field] of [
    ['min-w', 'minW'],
    ['min-h', 'minH'],
    ['max-w', 'maxW'],
    ['max-h', 'maxH'],
  ] as const) {
    if (key in attrs) {
      out[field] = consumeNonNegativeNumber(attrs, key, lineNo, raw)
    }
  }
  return out
}

/**
 * Pull `key` out of an attrs bag, requiring a non-negative number. Throws a
 * descriptive `BocetoParseError` for any other value.
 */
export function consumeNonNegativeNumber(
  attrs: Record<string, AttrValue>,
  key: string,
  lineNo: number,
  raw: string,
): number {
  const v = attrs[key]
  delete attrs[key]
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    throw new BocetoParseError(
      `'${key}' must be a non-negative number, got "${String(v)}"`,
      lineNo + 1,
      raw,
    )
  }
  return v
}

/**
 * Pull `key` out of an attrs bag, requiring a value from the given enum.
 * Returns `undefined` if absent.
 */
export function consumeEnum<T extends string>(
  attrs: Record<string, AttrValue>,
  key: string,
  allowed: readonly T[],
  ownerKeyword: string,
  lineNo: number,
  raw: string,
): T | undefined {
  if (!(key in attrs)) return undefined
  const v = attrs[key]
  delete attrs[key]
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new BocetoParseError(
      `'${ownerKeyword}' attribute '${key}' must be one of ${allowed.map((a) => `"${a}"`).join(', ')}; got "${String(v)}"`,
      lineNo + 1,
      raw,
    )
  }
  return v as T
}

/** Optional non-negative number from the attrs bag. */
export function consumeOptionalNumber(
  attrs: Record<string, AttrValue>,
  key: string,
  ownerKeyword: string,
  lineNo: number,
  raw: string,
): number | undefined {
  if (!(key in attrs)) return undefined
  const v = attrs[key]
  delete attrs[key]
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    throw new BocetoParseError(
      `'${ownerKeyword}' attribute '${key}' must be a non-negative number, got "${String(v)}"`,
      lineNo + 1,
      raw,
    )
  }
  return v
}

export const NAMED_ID_RE = /^[A-Za-z][A-Za-z0-9_-]*$/
