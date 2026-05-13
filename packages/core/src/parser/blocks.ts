/**
 * Pass 0 — pull source blocks out of the input text.
 *
 * Boceto content can live in two shapes:
 *   - Markdown fenced blocks: ` ```boceto[:Page Name]\n…\n``` `.
 *   - Standalone `.boceto` files: a sequence of statements optionally
 *     separated by `--- Page Name` lines.
 *
 * `extractBlocks` returns one `RawBlock` per page, preserving the original
 * page name when present.
 */

const FENCE_RE = /```boceto(?::([^\n]*))?\n([\s\S]*?)```/g
const PAGE_SEP_RE = /^---(?:\s+(.*))?$/

const STATEMENT_KEYWORDS = new Set([
  'element',
  'text',
  'arrow',
  'row',
  'col',
  'end',
  'component',
  'slot',
])

export interface RawBlock {
  /** Page name (from fence info string or `--- Name`); `undefined` means "defs-only candidate". */
  name?: string
  body: string
}

/**
 * Extract markdown fence blocks or `--- Name` standalone-file pages from the
 * raw source. Each returned `RawBlock` carries the original page name (if
 * any) and the unparsed body.
 */
export function extractBlocks(source: string): RawBlock[] {
  const fenceMatches = [...source.matchAll(FENCE_RE)]
  if (fenceMatches.length > 0) {
    return fenceMatches.map((m) => ({
      name: m[1]?.trim() || undefined,
      body: m[2] ?? '',
    }))
  }

  if (!looksLikeStandalone(source)) return []

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

/**
 * Heuristic check for "is this a standalone .boceto file?" — true if the
 * first non-comment line is either `---` or starts with a known statement
 * keyword.
 */
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
