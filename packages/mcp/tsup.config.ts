import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/server.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    target: 'es2022',
    // Yoga and the MCP SDK both ship as ESM; keep them as runtime deps so
    // we don't bundle Yoga's WASM into the server build.
    external: [
      '@modelcontextprotocol/sdk',
      'zod',
      'yoga-layout',
    ],
  },
])
