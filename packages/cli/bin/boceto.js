#!/usr/bin/env node
/**
 * Entry shim. Defers all work to dist/cli.js so this file stays
 * dependency-free and starts cold quickly under `npx boceto`.
 */
import('../dist/cli.js').then(({ main }) => main()).catch((err) => {
  console.error('[boceto] failed to start:', err)
  process.exit(1)
})
