/**
 * Shared front-matter parser used by both the DSL `recipes` catalog
 * (`tools/recipes.ts`) and the editor `integrations` catalog
 * (`tools/integrations.ts`). Both stores use the same lightweight format:
 *
 *     ---
 *     slug: "settings"
 *     kind: "mockup"
 *     title: "Settings screen"
 *     summary: "Sidebar + Profile + Preferences switches."
 *     ---
 *     <body markdown>
 *
 * Each line is `key: <json-value>` — we write them via `JSON.stringify` in
 * the splitter so quoting + escapes round-trip cleanly without pulling in a
 * full YAML parser. Unknown / extra keys pass through to the caller; the
 * caller validates which fields it requires.
 */

export interface FrontMatter {
  meta: Record<string, string>
  body: string
}

const FM_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

export function splitFrontMatter(text: string): FrontMatter | null {
  const m = text.match(FM_RE)
  if (!m) return null
  const head = m[1]!
  const body = m[2] ?? ''
  const meta: Record<string, string> = {}
  for (const raw of head.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).trim()
    const valRaw = line.slice(colon + 1).trim()
    try {
      meta[key] = typeof valRaw === 'string' ? JSON.parse(valRaw) : String(valRaw)
    } catch {
      // Strip optional surrounding quotes if JSON.parse choked (e.g. a value
      // that's bare unquoted text).
      meta[key] = valRaw.replace(/^"|"$/g, '')
    }
  }
  return { meta, body: body.replace(/^\n+/, '') }
}
