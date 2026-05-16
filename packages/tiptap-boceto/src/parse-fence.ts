/**
 * Extract the optional page name from a fenced code block's className list.
 *
 * Returns:
 *   - the page name for `language-boceto:<name>`
 *   - `""` for plain `language-boceto`
 *   - `null` when no boceto language class is found at all
 *
 * Tokenizes the class string because `rehype-highlight` (and similar) add
 * adjacent classes like `hljs` alongside `language-X`.
 */
export function findBocetoName(className: string | undefined | null): string | null {
  if (!className) return null
  for (const token of className.split(/\s+/)) {
    if (token === 'language-boceto') return ''
    if (token.startsWith('language-boceto:')) {
      return token.slice('language-boceto:'.length)
    }
  }
  return null
}
