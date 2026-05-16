#!/usr/bin/env node
/**
 * Bundle the TipTap demo island for the docs site.
 *
 * The site is a static HTML deployment with no app bundler. To embed a live
 * TipTap + `@boceto/tiptap` editor on `editor.html` we pre-bundle everything
 * — React, ReactDOM, TipTap, StarterKit, and `@boceto/tiptap` — into a
 * single self-contained ESM file at `site/assets/tiptap-island.js`.
 *
 * The entry (`site/src/tiptap-island.tsx`) auto-mounts onto an element
 * with id `tt-island` when present, so `editor.html` just loads the bundle
 * via `<script type="module">` and drops a `<div id="tt-island">` where it
 * wants the demo.
 *
 * Run via `pnpm site:tiptap`.
 */

import * as esbuild from 'esbuild'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

console.log('▸ Bundling site/src/tiptap-island.tsx → site/assets/tiptap-island.js')
await esbuild.build({
  absWorkingDir: repoRoot,
  entryPoints: ['site/src/tiptap-island.tsx'],
  outfile: 'site/assets/tiptap-island.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  minify: true,
  sourcemap: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
})
console.log('▸ Done')
