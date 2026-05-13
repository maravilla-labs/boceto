import { defineConfig } from 'tsup'

// Two outputs from one package:
//   - `index` (ESM+CJS, with .d.ts): library entry. Workspace deps stay external
//     so consumers share a single @boceto/core instance.
//   - `auto`  (ESM only, no .d.ts): browser <script type="module"> entry.
//     Workspace deps are inlined so the file works without an import map.
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
    entry: ['src/auto.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
    target: 'es2022',
    noExternal: [/^@boceto\//],
  },
])
