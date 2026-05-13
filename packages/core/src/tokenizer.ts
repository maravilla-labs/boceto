export interface Token {
  value: string
  /**
   * True only when the entire token is a stand-alone quoted string (e.g.
   * `"hello world"`). Mixed tokens like `key="value with spaces"` are NOT
   * marked quoted — `quoted: true` means "this slot is allowed to be a
   * label/note in `element` syntax", and `key="..."` is an attribute, not a
   * label.
   */
  quoted: boolean
}

/**
 * Tokenize a single statement line.
 *
 * - Whitespace separates tokens.
 * - A double-quoted string is a token: `"hello world"` → one token with the
 *   contents (escapes resolved) and `quoted: true`.
 * - A bare run of non-whitespace is a token: `box` → `{ value: 'box', quoted: false }`.
 * - A bare run that contains a quoted segment is a single mixed token —
 *   useful for attribute values containing whitespace:
 *
 *     `items="Item one|Item two"` → `{ value: 'items=Item one|Item two', quoted: false }`
 *
 *   The parser's `parseAttrs` then splits on `=` to get the key/value pair,
 *   preserving any whitespace that came from the quoted segment.
 *
 * Inside quotes, `\"` and `\\` are escape sequences. No other escapes.
 */
export function tokenize(line: string): Token[] {
  const out: Token[] = []
  const len = line.length
  let i = 0

  while (i < len) {
    const ch = line[i]
    if (ch === ' ' || ch === '\t') {
      i++
      continue
    }

    // Pure quoted token: a token that *starts* with `"` is a stand-alone string.
    if (ch === '"') {
      const { value, end } = readQuoted(line, i + 1)
      out.push({ value, quoted: true })
      i = end
      continue
    }

    // Bare or mixed token: read until whitespace, but if we hit a `"` along
    // the way (e.g. `key="value with spaces"`), absorb the quoted segment
    // into the same token instead of breaking on whitespace inside it.
    let buf = ''
    while (i < len && line[i] !== ' ' && line[i] !== '\t') {
      if (line[i] === '"') {
        const { value, end } = readQuoted(line, i + 1)
        buf += value
        i = end
      } else {
        buf += line[i]
        i++
      }
    }
    out.push({ value: buf, quoted: false })
  }

  return out
}

/**
 * Reads characters until an unescaped closing `"`. Returns the unescaped
 * contents and the index of the character *after* the closing quote (or end
 * of line if the quote is unterminated — silently tolerated for now).
 */
function readQuoted(line: string, start: number): { value: string; end: number } {
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
    }
    if (c === '"') break
    buf += c
    j++
  }
  return { value: buf, end: j + 1 }
}
