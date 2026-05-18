import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { splitFrontMatter } from '../util/frontmatter'

/**
 * Editor-integration catalog. One markdown file per host stack
 * (TipTap+React, plain web components, React, docs-site) plus an `index`
 * decision tree, all under the top-level `integrations/` directory. Same
 * loader pattern as the DSL recipes — agents discover with
 * `boceto_list_integrations` and fetch full bodies via
 * `boceto_read_integration`.
 */
export interface IntegrationMeta {
  slug: string
  kind: 'index' | 'stack'
  /** Display title, e.g. "TipTap + React" or "Plain web components". */
  title: string
  /** One-line summary surfaced by the list tool. */
  summary: string
  /** Optional stack hint for filtering / decoration in clients. */
  stack?: string
}

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Resolve the `integrations/` directory. Mirrors `recipesRoot()` in
 * `tools/recipes.ts` — three candidate layouts for bundled, source-via-vitest,
 * and workspace-dev fallback. First existing path wins; cached after the
 * first scan.
 */
function integrationsRoot(): string {
  const candidates = [
    resolve(here, '..', 'integrations'),
    resolve(here, '..', '..', 'integrations'),
    resolve(here, '..', '..', '..', '..', 'integrations'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  throw new Error(
    `MCP integrations directory not found — looked in:\n  ${candidates.join('\n  ')}\nRun \`pnpm --filter @boceto/mcp prepack\` to bundle them.`,
  )
}

let cachedCatalog: { meta: IntegrationMeta; body: string }[] | null = null

function loadCatalog(): { meta: IntegrationMeta; body: string }[] {
  if (cachedCatalog) return cachedCatalog
  const root = integrationsRoot()
  const files = readdirSync(root).filter((f) => f.endsWith('.md'))
  const out: { meta: IntegrationMeta; body: string }[] = []
  for (const f of files) {
    const text = readFileSync(resolve(root, f), 'utf8')
    const parsed = parseIntegrationFile(text)
    if (!parsed) continue
    out.push(parsed)
  }
  // Sort: index first, then stack recipes alphabetically. The index is the
  // recommended landing point so agents picking the first entry get the
  // decision tree.
  const order: Record<IntegrationMeta['kind'], number> = { index: 0, stack: 1 }
  out.sort((a, b) => {
    const ka = order[a.meta.kind] ?? 2
    const kb = order[b.meta.kind] ?? 2
    if (ka !== kb) return ka - kb
    return a.meta.slug.localeCompare(b.meta.slug)
  })
  cachedCatalog = out
  return out
}

function parseIntegrationFile(text: string): { meta: IntegrationMeta; body: string } | null {
  const fm = splitFrontMatter(text)
  if (!fm) return null
  const { meta, body } = fm
  if (!meta.slug || !meta.title || !meta.kind || !meta.summary) return null
  const m: IntegrationMeta = {
    slug: meta.slug,
    kind: meta.kind as IntegrationMeta['kind'],
    title: meta.title,
    summary: meta.summary,
    ...(meta.stack ? { stack: meta.stack } : {}),
  }
  return { meta: m, body }
}

// ── Tool: boceto_list_integrations ────────────────────────────────────────

export const listIntegrationsInputSchema = {} as const

export interface ListIntegrationsResult {
  integrations: IntegrationMeta[]
  total: number
}

export function runListIntegrations(
  _: z.infer<z.ZodObject<typeof listIntegrationsInputSchema>>,
): ListIntegrationsResult {
  const catalog = loadCatalog()
  return { integrations: catalog.map((c) => c.meta), total: catalog.length }
}

// ── Tool: boceto_read_integration ─────────────────────────────────────────

export const readIntegrationInputSchema = {
  slug: z
    .string()
    .describe(
      'Integration slug (e.g. "tiptap-react", "web-components", "react", "docs-site", "index"). Use boceto_list_integrations to discover the available slugs.',
    ),
}

export type ReadIntegrationResult =
  | {
      ok: true
      meta: IntegrationMeta
      /** Full markdown body — install commands, wiring code, custom-element / event surface, peer deps, gotchas. */
      body: string
    }
  | { ok: false; error: string }

export function runReadIntegration(args: { slug: string }): ReadIntegrationResult {
  const catalog = loadCatalog()
  const found = catalog.find((c) => c.meta.slug === args.slug)
  if (!found) {
    const available = catalog.map((c) => c.meta.slug).join(', ')
    return {
      ok: false,
      error: `Unknown integration slug: "${args.slug}". Available: ${available}`,
    }
  }
  return { ok: true, meta: found.meta, body: found.body }
}
