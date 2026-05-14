#!/usr/bin/env node
/**
 * Copy the canonical skill source (/skill/boceto in this repo) into
 * ./skill so that `npm pack` / `npm publish` bundles a self-contained
 * copy. Runs from the package's `prepack` script.
 *
 * In dev (workspace), the CLI prefers reading from /skill/boceto directly.
 * After publish, the same CLI resolves to the bundled ./skill copy.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const repoSkill = resolve(pkgRoot, '..', '..', 'skill', 'boceto')
const bundleDest = resolve(pkgRoot, 'skill')

if (!existsSync(repoSkill)) {
  console.error(`[sync-skill] source missing: ${repoSkill}`)
  process.exit(1)
}

rmSync(bundleDest, { recursive: true, force: true })
mkdirSync(bundleDest, { recursive: true })
cpSync(repoSkill, bundleDest, { recursive: true })
console.log(`[sync-skill] copied ${repoSkill} → ${bundleDest}`)
