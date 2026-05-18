---
"@boceto/core": minor
"@boceto/edit": minor
"@boceto/lint": minor
"@boceto/markdown-it": minor
"@boceto/mcp": minor
"@boceto/react": minor
"@boceto/remark": minor
"@boceto/svelte": minor
"@boceto/tiptap": minor
"@boceto/vue": minor
---

v0.3 — cross-document component imports, component management in the editor, MCP integrations catalog.

**`@boceto/core`** — new `imports/` module: `LibraryCache`, `resolveBocetoImports`, `extractFrontmatter`, `BocetoImportError`. `parse()` accepts a new `importedComponents` fast path that skips Pass-1 for pre-parsed components. Standalone `.boceto` files now support YAML frontmatter (`---\nboceto:\n  import: [...]\n---`).

**`@boceto/remark`** — automatic same-file fence aggregation (sibling fences share `component … end` definitions). New `resolveImports` option for frontmatter-driven cross-file imports with `cache` / `fs` / `glob` / `projectRoot` injection. New `resolveImports.currentFilePath` fallback for hosts that can't set `file.path` on the VFile (react-markdown's `children` prop). `file.data.bocetoImports` surfaces the consulted paths for watch-mode HMR.

**`@boceto/markdown-it`** — same-file fence aggregation via a core rule. New `prewarmBocetoCache` async helper + `env.bocetoImportedComponents` per-render hook for sync-render pipelines.

**`@boceto/lint`** — `LintOptions` gains `imports` / `importedComponents` so the parse cross-check honours cross-doc components and stops false-positiving on "Unknown component" for pages that reference a library.

**`@boceto/edit`** — composite component management lands. `BocetoEditor` gains `components()` / `instances()` / `tagImportOrigin` introspection plus full CRUD: `createComponent`, `deleteComponent`, `renameComponent`, `updateComponentDef`, `updateInstanceParams`, `addInstance`. Headline gesture: `promoteToComponent({ ids, name, params? })` — lifts a top-level selection into a new definition plus a single replacement instance, inferring params from `$ident` tokens. New component-edit mode (`enterComponentEditMode` / `exitComponentEditMode` / `editingComponent`) swaps the canvas to a synthetic page wrapping `Component.body`, so every existing geometry mutation works transparently against composite bodies. New `<boceto-components>` floating panel groups Local / Available-elsewhere components with per-row actions. Inspector extended with ComponentInstance params + Edit / Go-to-source actions. Context menu gains "Make component from selection…", "Edit component", "Find instances". New `gotodefinition` and `componenteditmode` CustomEvents on `<boceto-edit>`.

**`@boceto/tiptap`** — `BocetoContext` now exposes `originBlockIndex: Map<string, number>` mapping each component name to the block index that defines it. The React node view consumes this to call `editor.tagImportOrigin(name, "block N")` and routes `gotodefinition` events back to the right sibling block.

**`@boceto/mcp`** — new tools `boceto_list_integrations` and `boceto_read_integration` mirror the existing recipes pattern. Five integration recipes ship in `integrations/`: `index` (decision tree), `tiptap-react`, `web-components`, `react`, `react-markdown`, `docs-site`. Each surfaces as both a tool result and a `boceto://integrations/<slug>.md` resource. `parse` / `lint` / `fix` / `render-svg` tool inputs all accept `imports`. Pre-existing `files` array bug fixed — the published tarball now correctly bundles `recipes/`, `references/`, and `integrations/` alongside `skill/` and `spec/`.

**`@boceto/react`** — `BocetoView` gains an `imports?: string` prop (BocetoEdit already had one). New `jsx-intrinsics.ts` augments `JSX.IntrinsicElements` for all five boceto custom-element tags so consumers writing `<boceto-view code={…} />` or `components={{ 'boceto-view': … }}` (react-markdown's pattern) get full type-checking without manual declarations.

**`@boceto/vue`** — module augmentation for Vue's `GlobalComponents` registers `boceto-view`, `boceto-edit`, `boceto-palette`, `boceto-inspector`, `boceto-components` so Vue templates type-check the custom-element tags directly.

**`@boceto/svelte`** — augments `svelte/elements`' `SvelteHTMLElements` for the same five tags so Svelte templates get prop autocomplete + type narrowing under `svelte-check`.
