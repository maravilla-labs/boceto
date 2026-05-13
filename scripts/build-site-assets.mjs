#!/usr/bin/env node
/**
 * Build the static-site assets the GitHub Pages site (`/site`) depends on.
 *
 * Rebuilds the two packages whose bundles are loaded directly via
 * `<script type="module">` (no app bundler in the loop), then copies the
 * relevant `dist/*.js` files into `site/assets/`.
 *
 *  - `@boceto/core`'s `browser` entry → `site/assets/boceto-core.js`
 *    (yoga-layout inlined; powers the playground's parse/render APIs)
 *
 *  - `@boceto/view`'s `auto` entry → `site/assets/boceto-view.js`
 *    (defines the `<boceto-view>` custom element used by all site pages)
 *
 * Source maps come along for the ride so devtools links survive.
 *
 * Run with `pnpm site:assets`. Idempotent: safe to run on every commit.
 */

import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const siteAssets = resolve(repoRoot, 'site/assets')

/**
 * (sourcePackage, distFile, destFile) triples copied verbatim along with
 * any sibling `.map` source-map files.
 */
const COPIES = [
  ['packages/core', 'dist/browser.js', 'boceto-core.js'],
  ['packages/view', 'dist/auto.js', 'boceto-view.js'],
]

function step(msg) {
  process.stdout.write(`\n▸ ${msg}\n`)
}

step('Building @boceto/core and @boceto/view')
execSync('pnpm --filter @boceto/core --filter @boceto/view build', {
  cwd: repoRoot,
  stdio: 'inherit',
})

step('Copying bundles into site/assets/')
mkdirSync(siteAssets, { recursive: true })
for (const [pkg, src, destName] of COPIES) {
  const absSrc = resolve(repoRoot, pkg, src)
  const absDest = resolve(siteAssets, destName)
  copyFileSync(absSrc, absDest)
  console.log(`  ${pkg}/${src} → site/assets/${destName}`)
  // Best-effort copy of the source map (skip silently if absent).
  try {
    copyFileSync(`${absSrc}.map`, `${absDest}.map`)
    console.log(`  ${pkg}/${src}.map → site/assets/${destName}.map`)
  } catch {
    /* no map — fine */
  }
}

step('Done')
