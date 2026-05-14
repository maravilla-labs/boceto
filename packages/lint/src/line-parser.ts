import { ELEMENT_TYPES } from '@boceto/core'

/**
 * Lightweight per-line classifier for the linter. We use our own tokenizer
 * (not `@boceto/core`'s) because we need character offsets for every
 * token — rules attach those offsets to issues so editors can underline
 * the exact problem span. The escape-sequence rules in `readQuoted`
 * mirror core's tokenizer verbatim so quoted-string handling matches
 * what `parse()` accepts.
 */

export type LineKind =
  | 'comment'
  | 'blank'
  | 'element'
  | 'text'
  | 'arrow'
  | 'row'
  | 'col'
  | 'end'
  | 'component'
  | 'slot'
  | 'unknown'

/**
 * A token with character offsets relative to the *trimmed* line text
 * (line minus its leading indent). `raw` preserves the original surface
 * representation (including surrounding `"..."` for quoted tokens).
 */
export interface RangedToken {
  /** Logical value — unquoted contents for `"..."`, otherwise the literal text. */
  value: string
  /** True iff the surface form was a fully quoted `"..."` string. */
  quoted: boolean
  /** 0-based start offset within the trimmed line. Inclusive. */
  start: number
  /** 0-based end offset within the trimmed line. Exclusive. */
  end: number
  /** Original surface text including any surrounding quotes. */
  raw: string
  /**
   * `false` iff this token contains an unterminated quoted segment —
   * either a pure quoted token (`"...`) whose closing `"` is missing,
   * or a bare token like `key="value` with an embedded segment that
   * was never closed. The Boceto parser silently tolerates the missing
   * closing quote (reads to end-of-line and accepts what it got); the
   * linter warns about it via the `unterminated-string` rule.
   *
   * `undefined` on tokens with no quoted content (treat as "closed").
   */
  closed?: boolean
  /**
   * 0-based offset of the opening `"` for the unclosed segment (within
   * the trimmed line). Used by the rule to underline starting at the
   * orphan quote rather than the whole token. `undefined` when `closed
   * !== false`.
   */
  unclosedAt?: number
}

export interface ParsedLine {
  kind: LineKind
  /** 1-based line number in the original source. */
  lineNo: number
  /** Raw line text including leading whitespace. */
  raw: string
  /** Line text with leading whitespace trimmed. */
  trimmed: string
  /** Tokens AFTER the leading keyword. */
  tokens: RangedToken[]
  /** The leading-keyword token itself (e.g. `element`). null for blank/comment/unknown. */
  keyword: RangedToken | null
  /** Length of leading whitespace — used when computing absolute columns. */
  indent: string
  /**
   * For `element` lines: parsed type token + its offsets so rules can
   * pinpoint just the type identifier.
   */
  typeToken: { type: string; id?: string; token: RangedToken } | null
}

const ELEMENT_TYPE_SET = new Set<string>(ELEMENT_TYPES as readonly string[])

export function isKnownElementType(t: string): boolean {
  return ELEMENT_TYPE_SET.has(t)
}

const KEYWORDS = new Set<LineKind>([
  'element',
  'text',
  'arrow',
  'row',
  'col',
  'end',
  'component',
  'slot',
])

/**
 * Tokenize a line into ranged tokens. Mirrors `@boceto/core`'s tokenizer
 * for quoted-string handling, with the addition that every token carries
 * its `[start, end)` offset within the trimmed line.
 */
function tokenizeWithOffsets(trimmed: string): RangedToken[] {
  const out: RangedToken[] = []
  const len = trimmed.length
  let i = 0
  while (i < len) {
    while (i < len && /\s/.test(trimmed[i]!)) i++
    if (i >= len) break

    // Pure quoted string at the token start.
    if (trimmed[i] === '"') {
      const start = i
      const r = readQuoted(trimmed, i + 1)
      out.push({
        value: r.value,
        quoted: true,
        start,
        end: r.end,
        raw: trimmed.slice(start, r.end),
        closed: r.closed,
        unclosedAt: r.closed ? undefined : start,
      })
      i = r.end
      continue
    }

    // Bare token (may contain embedded quoted segments).
    const start = i
    let buf = ''
    let innerClosed = true
    let innerUnclosedAt: number | undefined
    while (i < len && !/\s/.test(trimmed[i]!)) {
      if (trimmed[i] === '"') {
        const openedAt = i
        const inner = readQuoted(trimmed, i + 1)
        buf += inner.value
        i = inner.end
        if (!inner.closed) {
          innerClosed = false
          if (innerUnclosedAt === undefined) innerUnclosedAt = openedAt
          // readQuoted ran to end-of-line — the bare-token loop will exit.
        }
      } else {
        buf += trimmed[i]!
        i++
      }
    }
    out.push({
      value: buf,
      quoted: false,
      start,
      end: i,
      raw: trimmed.slice(start, i),
      closed: innerClosed,
      unclosedAt: innerClosed ? undefined : innerUnclosedAt,
    })
  }
  return out
}

function readQuoted(
  line: string,
  start: number,
): { value: string; end: number; closed: boolean } {
  const len = line.length
  let j = start
  let buf = ''
  while (j < len) {
    const c = line[j]
    if (c === '\\' && j + 1 < len) {
      const next = line[j + 1]
      if (next === '"' || next === '\\') {
        buf += next
        j += 2
        continue
      }
      if (next === 'n') {
        buf += '\n'
        j += 2
        continue
      }
      if (next === 't') {
        buf += '\t'
        j += 2
        continue
      }
    }
    if (c === '"') break
    buf += c
    j++
  }
  // `closed` is true iff we exited the loop by finding a `"`. If we
  // ran off the end of the line without seeing one, the string is
  // unterminated — the parser silently accepts that but the linter
  // surfaces it as a warning.
  const closed = j < len && line[j] === '"'
  return { value: buf, end: closed ? j + 1 : j, closed }
}

export function parseLine(raw: string, lineNo: number): ParsedLine {
  const indent = raw.match(/^\s*/)?.[0] ?? ''
  const trimmed = raw.slice(indent.length)

  if (trimmed === '') return base('blank', lineNo, raw, trimmed, indent, null, [])
  if (trimmed.startsWith('#')) return base('comment', lineNo, raw, trimmed, indent, null, [])

  const all = tokenizeWithOffsets(trimmed)
  if (all.length === 0) return base('blank', lineNo, raw, trimmed, indent, null, [])

  const headToken = all[0]!
  const head = headToken.value
  if (!KEYWORDS.has(head as LineKind)) {
    return base('unknown', lineNo, raw, trimmed, indent, null, [])
  }
  const kind = head as LineKind
  const rest = all.slice(1)

  // For element lines, parse the `type[#id]` token.
  let typeToken: ParsedLine['typeToken'] = null
  if (kind === 'element' && rest.length > 0) {
    const tt = rest[0]!
    const t = tt.value
    const hash = t.indexOf('#')
    typeToken =
      hash >= 0 ? { type: t.slice(0, hash), id: t.slice(hash + 1), token: tt } : { type: t, token: tt }
  }

  return {
    kind,
    lineNo,
    raw,
    trimmed,
    tokens: rest,
    keyword: headToken,
    indent,
    typeToken,
  }
}

function base(
  kind: LineKind,
  lineNo: number,
  raw: string,
  trimmed: string,
  indent: string,
  keyword: RangedToken | null,
  tokens: RangedToken[],
): ParsedLine {
  return { kind, lineNo, raw, trimmed, tokens, keyword, indent, typeToken: null }
}

/**
 * Count how many leading tokens are positional args (not key=value
 * attribute pairs). Quoted tokens always count as positional even when
 * they contain `=`.
 */
export function countPositional(tokens: RangedToken[]): number {
  let n = 0
  for (const t of tokens) {
    if (!t.quoted && t.value.includes('=')) break
    n++
  }
  return n
}

/**
 * Convert a (line, 0-based offset within trimmed) coordinate to a
 * 1-based absolute column number for the original raw line.
 */
export function columnFromOffset(indent: string, offsetInTrimmed: number): number {
  return indent.length + offsetInTrimmed + 1
}
