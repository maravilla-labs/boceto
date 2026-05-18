import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { splitFrontMatter } from '../util/frontmatter'

/**
 * Recipe catalog: per-file markdown stored under the top-level `recipes/`
 * directory, each with YAML front-matter (slug, kind, title, summary, …).
 * Indexed once at first call and memoised — the catalog rarely changes
 * within a single server lifetime.
 */
export interface RecipeMeta {
  slug: string
  kind: 'mockup' | 'shell' | 'index'
  title: string
  summary: string
  /** Present on mockups, omitted on shells / index. */
  size?: string
}

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Resolve the `recipes/` directory. Three valid layouts depending on how
 * we're invoked:
 *
 *   - tsup-bundled (`packages/mcp/dist/server.js`)   → `../recipes` (sibling of dist/)
 *   - source via vitest (`packages/mcp/src/tools/`)  → `../../recipes` (sibling of src/)
 *   - workspace dev fallback                          → `<repo>/recipes`
 *
 * Walk the candidates in order and return the first that exists. Cached
 * after the first scan.
 */
function recipesRoot(): string {
  const candidates = [
    resolve(here, '..', 'recipes'),
    resolve(here, '..', '..', 'recipes'),
    resolve(here, '..', '..', '..', '..', 'recipes'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  throw new Error(
    `MCP recipes directory not found — looked in:\n  ${candidates.join('\n  ')}\nRun \`pnpm --filter @boceto/mcp prepack\` to bundle them.`,
  )
}

let cachedCatalog: { meta: RecipeMeta; body: string }[] | null = null

function loadCatalog(): { meta: RecipeMeta; body: string }[] {
  if (cachedCatalog) return cachedCatalog
  const root = recipesRoot()
  const files = readdirSync(root).filter((f) => f.endsWith('.md'))
  const out: { meta: RecipeMeta; body: string }[] = []
  for (const f of files) {
    const text = readFileSync(resolve(root, f), 'utf8')
    const parsed = parseRecipeFile(text)
    if (!parsed) continue
    out.push(parsed)
  }
  // Sort: index first, then mockups, then shells, alphabetic within each group.
  const order: Record<RecipeMeta['kind'], number> = { index: 0, mockup: 1, shell: 2 }
  out.sort((a, b) => {
    const ka = order[a.meta.kind] ?? 3
    const kb = order[b.meta.kind] ?? 3
    if (ka !== kb) return ka - kb
    return a.meta.slug.localeCompare(b.meta.slug)
  })
  cachedCatalog = out
  return out
}

/**
 * Validate one recipe file: extract front-matter via the shared splitter and
 * cast it into the typed `RecipeMeta` shape. Files missing any required key
 * are silently skipped (the catalog tolerates non-recipe markdown in the
 * directory — e.g. notes or drafts without front-matter).
 */
function parseRecipeFile(text: string): { meta: RecipeMeta; body: string } | null {
  const fm = splitFrontMatter(text)
  if (!fm) return null
  const { meta, body } = fm
  if (!meta.slug || !meta.title || !meta.kind || !meta.summary) return null
  const m2: RecipeMeta = {
    slug: meta.slug,
    kind: meta.kind as RecipeMeta['kind'],
    title: meta.title,
    summary: meta.summary,
    ...(meta.size ? { size: meta.size } : {}),
  }
  return { meta: m2, body }
}

// ── Tool: boceto_list_recipes ────────────────────────────────────────

export const listRecipesInputSchema = {} as const

export interface ListRecipesResult {
  recipes: RecipeMeta[]
  total: number
}

export function runListRecipes(_: z.infer<z.ZodObject<typeof listRecipesInputSchema>>): ListRecipesResult {
  const catalog = loadCatalog()
  return { recipes: catalog.map((c) => c.meta), total: catalog.length }
}

// ── Tool: boceto_read_recipe ─────────────────────────────────────────

export const readRecipeInputSchema = {
  slug: z
    .string()
    .describe('Recipe slug (e.g. "login", "dashboard", "appshell", "dialog"). Use boceto_list_recipes to discover available slugs.'),
}

export type ReadRecipeResult =
  | {
      ok: true
      meta: RecipeMeta
      /** The full markdown body of the recipe — typically a short prose intro + one or two fenced ```boceto blocks. */
      body: string
    }
  | { ok: false; error: string }

export function runReadRecipe(args: { slug: string }): ReadRecipeResult {
  const catalog = loadCatalog()
  const found = catalog.find((c) => c.meta.slug === args.slug)
  if (!found) {
    const available = catalog.map((c) => c.meta.slug).join(', ')
    return {
      ok: false,
      error: `Unknown recipe slug: "${args.slug}". Available: ${available}`,
    }
  }
  return { ok: true, meta: found.meta, body: found.body }
}
