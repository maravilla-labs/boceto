import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Static catalog of MCP resources we serve. Each `uri` is the user-facing
 * `boceto://…` identifier the client lists / fetches; resolution walks the
 * lookup paths in order (bundled-in-package first, workspace fallback
 * second) so the same code works in dev and after publish.
 */
export interface ResourceEntry {
  uri: string
  name: string
  description: string
  mimeType: string
  /** Locations to look for the file, relative to the named root. Tried in order. */
  paths: { root: 'package' | 'repo'; rel: string }[]
}

/**
 * The skill that ships in the package (trimmed bundle: SKILL.md + grammar +
 * layout + the component-doc pattern). Element catalog + components grammar
 * + per-recipe files live OUTSIDE the skill bundle — they're catalog-style
 * content the MCP server owns.
 */
export const RESOURCES: ResourceEntry[] = [
  // ── Skill (always-loaded teaching layer) ─────────────────────────────
  {
    uri: 'boceto://skill/SKILL.md',
    name: 'Boceto skill — overview',
    description:
      'Top-level skill instructions: trigger phrases, output contract, the non-negotiables (six-slot rule, canonical types, integers / quoted labels), components-first authoring, MCP-vs-offline guidance.',
    mimeType: 'text/markdown',
    paths: [
      { root: 'package', rel: 'skill/SKILL.md' },
      { root: 'repo', rel: 'skill/boceto/SKILL.md' },
    ],
  },
  {
    uri: 'boceto://skill/references/grammar.md',
    name: 'Boceto skill — formal grammar',
    description:
      'Tokens, escape sequences, IDs, attribute syntax, comments, multi-page docs, component header attributes.',
    mimeType: 'text/markdown',
    paths: [
      { root: 'package', rel: 'skill/references/grammar.md' },
      { root: 'repo', rel: 'skill/boceto/references/grammar.md' },
    ],
  },
  {
    uri: 'boceto://skill/references/layout.md',
    name: 'Boceto skill — layout reference',
    description:
      'Flex containers (`row` / `col`), auto / grow sizing, alignment, wrap-as-grid, element-as-container.',
    mimeType: 'text/markdown',
    paths: [
      { root: 'package', rel: 'skill/references/layout.md' },
      { root: 'repo', rel: 'skill/boceto/references/layout.md' },
    ],
  },
  {
    uri: 'boceto://skill/references/component-doc-pattern.md',
    name: 'Boceto skill — component documentation pattern',
    description:
      'The literate output pattern for composite components: heading + description + ```boceto definition + example usage + Used-in line. Use whenever the output includes a `component` declaration.',
    mimeType: 'text/markdown',
    paths: [
      { root: 'package', rel: 'skill/references/component-doc-pattern.md' },
      { root: 'repo', rel: 'skill/boceto/references/component-doc-pattern.md' },
    ],
  },

  // ── Catalog references (canonical, MCP-served) ───────────────────────
  {
    uri: 'boceto://references/elements.md',
    name: 'Boceto reference — element catalog',
    description:
      'All 83 element types, grouped by category, with default sizes, type-specific attributes, and ASCII renderings. Prefer `boceto_list_elements` / `boceto_describe_element` over reading this when you only need one or two entries.',
    mimeType: 'text/markdown',
    paths: [
      { root: 'package', rel: 'references/elements.md' },
      { root: 'repo', rel: 'references/elements.md' },
    ],
  },
  {
    uri: 'boceto://references/components.md',
    name: 'Boceto reference — components grammar',
    description:
      'Full grammar for composite `component` definitions: positional + named slots, defaults, body items, parser limitations (slot nesting, element-as-container inside bodies, param-name rules).',
    mimeType: 'text/markdown',
    paths: [
      { root: 'package', rel: 'references/components.md' },
      { root: 'repo', rel: 'references/components.md' },
    ],
  },

  // ── Recipes — index resource. Individual recipes use the tools API. ──
  {
    uri: 'boceto://recipes/index.md',
    name: 'Boceto recipes — index + decision guide',
    description:
      'List of every shipped recipe (mockups + shells) with summaries, plus the decision guide and adaptation patterns. The individual recipe bodies are best fetched via the `boceto_list_recipes` and `boceto_read_recipe` tools.',
    mimeType: 'text/markdown',
    paths: [
      { root: 'package', rel: 'recipes/index.md' },
      { root: 'repo', rel: 'recipes/index.md' },
    ],
  },

  // ── Formal spec ──────────────────────────────────────────────────────
  {
    uri: 'boceto://spec/boceto-spec.md',
    name: 'Boceto formal spec',
    description:
      'The authoritative formal DSL specification — load only when you need to settle a disagreement between the skill and the parser, or when implementing a tool that consumes Boceto.',
    mimeType: 'text/markdown',
    paths: [
      { root: 'package', rel: 'spec/boceto-spec.md' },
      { root: 'repo', rel: 'spec/boceto-spec.md' },
    ],
  },
]

const here = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(here, '..')
const REPO_ROOT = resolve(PKG_ROOT, '..', '..')

export function resolveResourcePath(entry: ResourceEntry): string {
  for (const p of entry.paths) {
    const root = p.root === 'package' ? PKG_ROOT : REPO_ROOT
    const abs = resolve(root, p.rel)
    if (existsSync(abs)) return abs
  }
  const tried = entry.paths
    .map((p) => `  ${p.root === 'package' ? PKG_ROOT : REPO_ROOT}/${p.rel}`)
    .join('\n')
  throw new Error(
    `MCP resource source missing for ${entry.uri} — looked in:\n${tried}\nRun \`pnpm --filter @boceto/mcp prepack\` to bundle the canon into the package.`,
  )
}

export function readResource(entry: ResourceEntry): string {
  return readFileSync(resolveResourcePath(entry), 'utf8')
}

export function findResource(uri: string): ResourceEntry | undefined {
  return RESOURCES.find((r) => r.uri === uri)
}
