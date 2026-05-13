import type { Token } from '../tokenizer'
import { BocetoParseError } from './errors'

/**
 * Parse a positional integer token (e.g. the `X Y W H` slots on `element` or
 * `row` lines). Rejects negatives, NaN, fractions, and non-numeric tokens.
 */
export function posInt(tok: Token, name: string, lineNo: number, raw: string): number {
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

/**
 * Like `posInt`, but additionally accepts the literal token `auto` (used for
 * `FlexContainer` width/height when the container should size to its
 * children).
 */
export function posIntOrAuto(
  tok: Token,
  name: string,
  lineNo: number,
  raw: string,
): number | 'auto' {
  if (!tok.quoted && tok.value === 'auto') return 'auto'
  return posInt(tok, name, lineNo, raw)
}
