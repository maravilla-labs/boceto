import { defineConfig } from 'tsup'

// Two outputs from one package:
//   - `index` (ESM+CJS, with .d.ts): library entry. yoga-layout stays external so
//     downstream packages share a single instance and bundlers can dedupe.
//   - `browser` (ESM only): self-contained build for `<script type="module">`
//     usage on static sites (e.g. the playground). yoga-layout is inlined so
//     no import map is required.
export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    target: 'es2022',
  },
  {
    entry: ['src/browser.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
    target: 'es2022',
    noExternal: ['yoga-layout'],
  },
])
