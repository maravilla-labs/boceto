import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  // Keep Node built-ins + tinyglobby out of the bundle. The plugin only
  // touches them via lazy dynamic imports for the default fs/glob adapters
  // — bundling them statically would drag `fs`, `path`, etc. into every
  // browser bundle of any consumer that imports `@boceto/remark`. Vite +
  // Rollup choke on the resulting Node-only statements.
  external: [
    'node:fs/promises',
    'node:fs',
    'node:path',
    'node:url',
    'tinyglobby',
  ],
})
