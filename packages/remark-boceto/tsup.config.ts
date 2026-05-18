import { defineConfig } from 'tsup'

export default defineConfig({
  // Two entry points so the main plugin stays free of Node-only code and
  // the node-side adapters (`node:fs/promises`, `tinyglobby`) live behind
  // a separate subpath import. Browser / Tauri / react-markdown consumers
  // only ever touch `./index`; Node consumers (Astro, Next, etc.) reach
  // for `./node-adapters` when they want the built-in fs + glob.
  entry: ['src/index.ts', 'src/node-adapters.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  // tinyglobby + node:* live in `node-adapters.ts` and stay external —
  // never inlined into the published dist. Node consumers' bundlers
  // resolve them at install time; browser consumers never load the file.
  external: [
    'node:fs/promises',
    'node:fs',
    'node:path',
    'node:url',
    'tinyglobby',
  ],
})
