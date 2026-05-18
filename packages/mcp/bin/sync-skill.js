#!/usr/bin/env node
/**
 * Copy the canon (skill, references, recipes, integrations, spec) into the
 * package so the published artifact is self-contained. Runs from `prepack`
 * — in workspace dev mode the server resolves the canonical sources directly.
 */
import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const repoRoot = resolve(pkgRoot, '..', '..')

/**
 * Each pair is `[source-relative-to-repo, dest-relative-to-package]`. The
 * destinations match the `bundledPath` values used by src/resources.ts so
 * they resolve cleanly in published consumers.
 */
const COPIES = [
  // Skill (trimmed bundle — SKILL.md + grammar + layout + component-doc-pattern).
  ['skill/boceto', 'skill'],
  // Canonical references the MCP serves but that aren't part of the skill bundle.
  ['references', 'references'],
  // Per-recipe markdown files. Splits served via the recipes tools.
  ['recipes', 'recipes'],
  // Editor-integration recipes. Served via boceto_list_integrations /
  // boceto_read_integration and as `boceto://integrations/<slug>.md` resources.
  ['integrations', 'integrations'],
]

const SPEC_COPIES = [['spec/boceto-spec.md', 'spec/boceto-spec.md']]

for (const [src, dest] of COPIES) {
  const absSrc = resolve(repoRoot, src)
  const absDest = resolve(pkgRoot, dest)
  if (!existsSync(absSrc)) {
    console.error(`[sync-skill] source missing: ${absSrc}`)
    process.exit(1)
  }
  rmSync(absDest, { recursive: true, force: true })
  mkdirSync(absDest, { recursive: true })
  cpSync(absSrc, absDest, { recursive: true })
  console.log(`[sync-skill] ${src}/ → ${dest}/`)
}

for (const [src, dest] of SPEC_COPIES) {
  const absSrc = resolve(repoRoot, src)
  const absDest = resolve(pkgRoot, dest)
  if (!existsSync(absSrc)) {
    console.error(`[sync-skill] source missing: ${absSrc}`)
    process.exit(1)
  }
  mkdirSync(dirname(absDest), { recursive: true })
  copyFileSync(absSrc, absDest)
  console.log(`[sync-skill] ${src} → ${dest}`)
}
