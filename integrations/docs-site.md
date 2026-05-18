---
slug: "docs-site"
kind: "stack"
stack: "docs"
title: "Docs site (remark or markdown-it)"
summary: "Turn ```boceto fences into <boceto-view> or inline SVG at build time. Cross-file imports via YAML frontmatter, with caching."
---

# Rendering boceto inside a docs site

Use this recipe when boceto sources live in markdown and your stack already runs `remark` (Next, Astro, Docusaurus, MDX) or `markdown-it` (Vitepress, Eleventy). The plugins turn ```boceto fences into either a `<boceto-view>` custom element (interactive client-side) or an inline `<svg>` (zero-JS, ideal for SSGs).

## Which plugin?

| Stack | Plugin |
|---|---|
| Next / Astro / Docusaurus / MDX / Nuxt Content | `@boceto/remark` |
| Vitepress / Eleventy / 11ty / generic markdown-it pipeline | `@boceto/markdown-it` |

## Install

```bash
# remark stack
pnpm add @boceto/core @boceto/view @boceto/remark unified

# markdown-it stack
pnpm add @boceto/core @boceto/view @boceto/markdown-it markdown-it
```

Peer deps: `unified` `^11.0.0` (remark), `markdown-it` `^14.0.0`. For client-side rendering you also need `@boceto/view` (`<boceto-view>` lives there) and a one-liner that calls `defineBocetoView()`.

## Remark wiring

```ts
// astro.config.mjs / next.config.mjs / docusaurus.config.ts
import remarkBoceto from '@boceto/remark'
import { defaultFsAdapter, defaultGlobAdapter } from '@boceto/remark/node-adapters'
import { LibraryCache } from '@boceto/core'

const bocetoCache = new LibraryCache()

export default {
  remarkPlugins: [
    [
      remarkBoceto,
      {
        mode: 'svg',                       // or 'wc' for client-side <boceto-view>
        resolveImports: {
          cache: bocetoCache,
          // `@boceto/remark`'s main entry ships no Node-only code so
          // browser / react-markdown consumers can bundle it cleanly.
          // Node SSG pipelines import the built-in adapters here.
          fs: defaultFsAdapter,
          glob: defaultGlobAdapter,
        },
      },
    ],
  ],
}
```

- `mode: 'svg'` — server-side renders each fence to an `<svg>` element. Zero client-side JS, works in any reader (GitHub, RSS, SSG).
- `mode: 'wc'` (default) — emits `<boceto-view code="…">`. Requires the host page to call `defineBocetoView()` from `@boceto/view`.

When `resolveImports` is set (with `fs` + `glob` adapters), frontmatter `boceto.import` declarations are walked and merged into the parse registry automatically. Same-file sibling fences always share their `component … end` definitions — no setup needed.

> `@boceto/remark` ships **no implicit Node defaults** so its dist stays free of `node:fs` / `tinyglobby` static imports — browser / Tauri / react-markdown consumers can bundle it cleanly. Node SSG consumers (Astro / Next / Docusaurus) import `defaultFsAdapter` + `defaultGlobAdapter` from `@boceto/remark/node-adapters` and pass them as shown above. Browser / Tauri hosts inject their own adapters (a Tauri `read_doc` command, a browser `fetch` of a public asset, an in-memory map for tests, …).

### Per-fence overrides

```md
```boceto Login fit=content width=1280 height=720 padding=24
element navbar 0 0 1200 56 "MyApp"
```
```

Keys: `fit` (`content` | `fixed`), `width`, `height`, `padding`. Anything else in the fence-info string is treated as the page name.

### Watch-mode HMR

The plugin writes the set of consulted paths to `file.data.bocetoImports`. Subscribe with your dev server's file watcher and call `cache.invalidateDependents(changedPath)` to drop the affected entries when a library file changes.

## Markdown-it wiring

```ts
import MarkdownIt from 'markdown-it'
import bocetoIt, { prewarmBocetoCache } from '@boceto/markdown-it'
import { LibraryCache, initYoga } from '@boceto/core'
import { glob } from 'tinyglobby'
import { readFile } from 'node:fs/promises'

await initYoga()                              // required for mode: 'svg'
const cache = new LibraryCache()

// Pre-resolve a page's frontmatter imports ahead of the sync render call:
const { importedComponents, importedPaths } = await prewarmBocetoCache({
  filePath: '/site/pages/courses.md',
  source: pageSrc,
  fs: { readFile: async (p) => new Uint8Array(await readFile(p)) },
  glob,
  cache,
  projectRoot: '/site',
})

const md = new MarkdownIt().use(bocetoIt, { mode: 'svg' })
const html = md.render(pageSrc, { bocetoImportedComponents: importedComponents })
```

markdown-it's render path is synchronous, so the host must `prewarmBocetoCache(…)` (which reads/parses library files) before calling `md.render(…)`. Same-file fence aggregation runs synchronously inside the plugin.

## Frontmatter contract

```yaml
---
title: Courses page
boceto:
  import:
    - ./00-component-library.md
    - ./shared/*-component.md
    - ../platform/components/*.boceto
---
```

- Relative paths (resolved against the importing file's directory).
- Globs (`*`, `?`, `[abc]`, `{a,b}`) expanded by `tinyglobby` (or any glob impl you inject).
- Paths must stay within a configurable `projectRoot` (escapes throw `BocetoImportError`).
- Duplicate component names across imports raise `BocetoImportError` with both source paths.
- `.boceto` standalone files support the same frontmatter when the file starts with `---`.

See `boceto://references/components.md` for the full cross-document contract.

## What ships at runtime

If you used `mode: 'svg'`: nothing. The HTML contains complete SVG inline — no JS, no fonts, no external requests.

If you used `mode: 'wc'`: include the `<boceto-view>` runtime once per page:

```html
<script type="module">
  import { defineBocetoView } from '@boceto/view'
  defineBocetoView()
</script>
```

## Performance contract

- `LibraryCache` parses each library file exactly once per build.
- Hashes are sha256 over file bytes (Web Crypto when available).
- `cache.invalidateDependents(path)` drops the changed file plus every entry that transitively depends on it.
- The cache is durable across `process()` / `render()` calls — share one instance for the whole build.

## Custom elements / events you ship

- `mode: 'svg'` ships no custom elements (it's a pure HTML pipeline).
- `mode: 'wc'` ships `<boceto-view>` only. The interactive editor lives in `@boceto/edit`; docs sites typically don't include it (use the `web-components` recipe if you need to embed the editor in a docs page).

## Common pitfalls

- **Forgetting `await initYoga()`** before `md.render(…)` in svg mode — the layout pass throws "Yoga not ready". Remark's svg mode auto-awaits.
- **Cross-file imports without `resolveImports`** — frontmatter `boceto.import` is ignored if you pass `resolveImports: false` (or omit `fs`/`glob` adapters). Node SSG consumers pass `defaultFsAdapter` + `defaultGlobAdapter` from `@boceto/remark/node-adapters`; browser hosts inject custom adapters. The plugin emits a VFile message if a doc declares `boceto.import` but no adapters are wired, so wiring mistakes surface in your build log.
- **Glob results are unordered** — the resolver sorts lexicographically for determinism, but if your library files have name-prefixed ordering, the import order matters only on duplicate-name errors.
- **markdown-it without `prewarmBocetoCache`** — file imports silently degrade to single-fence parsing. The plugin logs a warning to stderr; check your build output.
- **Custom-element CSP** — `<boceto-view>` uses the WASM Yoga build for layout. `script-src 'wasm-unsafe-eval'` is required when running `mode: 'wc'`. `mode: 'svg'` has no such constraint.

## Reference

- Frontmatter + caching details: `boceto://references/components.md` (the "Cross-document libraries" section).
- Remark plugin options: `packages/remark-boceto/src/index.ts` top-of-file doc-comment.
- Markdown-it plugin options: `packages/markdown-it-boceto/src/index.ts` top-of-file doc-comment.
