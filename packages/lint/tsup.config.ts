import { defineConfig } from 'tsup'

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
    // Browser-bundled entry — inlines @boceto/core so the playground
    // (and any other static page) can load via one <script type="module">.
    entry: ['src/browser.ts'],
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
