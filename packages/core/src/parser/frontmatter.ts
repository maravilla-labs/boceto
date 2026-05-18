/**
 * Strip a leading `---\n…\n---\n` YAML frontmatter block so the parser only
 * ever sees DSL content. Frontmatter is metadata for higher-level consumers
 * (see `imports/`); parsing itself ignores it entirely.
 *
 * Standalone `.boceto` files commonly carry import declarations in
 * frontmatter — if we left it in, `extractBlocks` would mis-detect the leading
 * `---` as a page separator and split the metadata into a bogus page.
 */

const OPEN_RE = /^---[ \t]*\r?\n/
const CLOSE_RE = /\r?\n---[ \t]*(\r?\n|$)/

export function stripFrontmatter(source: string): string {
  const open = source.match(OPEN_RE)
  if (!open || open.index !== 0) return source
  const afterOpen = source.slice(open[0].length)
  const close = afterOpen.match(CLOSE_RE)
  if (!close || close.index === undefined) return source
  return afterOpen.slice(close.index + close[0].length)
}
