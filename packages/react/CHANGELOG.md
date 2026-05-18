# @boceto/react

## 0.4.1

### Patch Changes

- 98b4834: Type augmentations: `mount` + `dock` now appear on the panel custom-element
  tags (`<boceto-palette>`, `<boceto-inspector>`, `<boceto-components>`) in
  every framework wrapper's template / JSX type map.
  - `@boceto/react` — JSX intrinsics gain `mount?: string` and `dock?: boolean | string`.
  - `@boceto/vue` — `GlobalComponents` augmentation extends `BocetoPanelProps`.
  - `@boceto/svelte` — `SvelteHTMLElements` augmentation extends `BocetoPanelAttrs`.

  The runtime behaviour was already shipped in `@boceto/edit@0.4.0`; this
  release just makes the new attributes first-class in TypeScript template
  checks. Floating mode (no `mount` / `dock`) is unchanged.

## 0.4.0

### Minor Changes

- Docked panel mode lands across `@boceto/edit`'s floating-panel chassis and every wrapper that uses it. Hosts can now embed `<boceto-palette>`, `<boceto-inspector>`, and `<boceto-components>` inline (Photoshop-style tabs, a permanent sidebar, …) instead of floating them in `document.body`.

  `createFloatingPanel` gains two new options:
  - `mount: HTMLElement | null` — target node to attach to (defaults to `document.body`).
  - `dock: boolean` — switches `position: fixed` → flow layout, drops the drag handle, shadow, and close button. Width defaults to `100%` of the host.

  Each panel element accepts matching attributes:

  ```html
  <boceto-palette for="ed" mount="palette-slot" dock></boceto-palette>
  <boceto-inspector for="ed" mount="inspector-slot" dock></boceto-inspector>
  <boceto-components for="ed" mount="components-slot" dock></boceto-components>
  ```

  In docked mode the panels become always-visible (the host's layout decides when the user sees them) and skip the active-editor / open-attribute auto-toggle behaviour. Floating mode is unchanged.

  `@boceto/react` mirrors with new `mount?: string` + `dock?: boolean` props on `BocetoPalette`, `BocetoInspector`, and the brand-new `BocetoComponents` React wrapper (also exported from this release).

  Floating panels also pick up an automatic re-clamp on `window.resize` so they never escape the visible area when the host window shrinks — addresses the docs-app symptom where the inspector slid behind the right edge after a window resize.

### Patch Changes

- Updated dependencies
  - @boceto/edit@0.4.0

## 0.3.1

### Patch Changes

- JSX intrinsic declarations now wrap each boceto custom-element tag in `React.DetailedHTMLProps<…, HTMLElement>` instead of bare `HTMLAttributes`. Consumers can now pass `ref`, `key`, and the other React special props on `<boceto-view>` / `<boceto-edit>` / etc. directly — matching the shape used for every built-in HTML intrinsic. This also lets existing consumers with their own local `IntrinsicElements` declarations merge with ours without "subsequent property declarations must have the same type" errors.

## 0.3.0

### Minor Changes

- 2db93d2: v0.3 — cross-document component imports, component management in the editor, MCP integrations catalog.

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

### Patch Changes

- Updated dependencies [2db93d2]
  - @boceto/core@0.3.0
  - @boceto/edit@0.3.0
  - @boceto/view@0.2.1

## 0.2.0

### Minor Changes

- b597450: **Boceto v0.2.0** — cross-block components, TipTap integration, and multi-editor scoping.

  ### Cross-block component context (`@boceto/core`, `@boceto/view`, `@boceto/edit`)

  `parse()` accepts an `imports` option — one or many DSL sources whose `component … end` blocks feed the resolution map without polluting `doc.components`. `<boceto-view>` and `<boceto-edit>` expose `imports` as both an attribute and a JS property. Used by every integration to make `component pricing-card(...) end` defined in one fence resolve from another fence in the same doc.

  ### New: `@boceto/tiptap`

  First-class TipTap integration:
  - `BocetoBlock` — atomic node storing one Boceto fence; round-trips through `<pre><code class="language-boceto[:page]">`.
  - `BocetoContext` — extension that broadcasts the doc-level Boceto source to every node view so cross-block component references resolve.
  - React node view (`@boceto/tiptap/react`) mounting `<boceto-edit>` + `<boceto-palette>` + `<boceto-inspector>` together, plus a resizable canvas wrapper.
  - `BOCETO_ICON_SVG` brand mark for toolbar buttons.

  ### Markdown plugins (`@boceto/markdown-it`, `@boceto/remark`)

  Per-fence info-string hints — `fit`, `width`, `height`, `padding` — let authors pin a specific viewport on a single block (e.g. ` ```boceto:Mobile width=320 height=640 `). SVG-mode output auto-fits content by default.

  ### Multi-editor scoping (`@boceto/edit`)

  New `active-editor` registry (`getActiveEditor` / `setActiveEditor` / `onActiveEditorChange`) tracks which editor was most recently interacted with. `<boceto-palette>` and `<boceto-inspector>` use it to scope themselves to one editor at a time, so multi-editor pages (TipTap docs, side-by-side demos) no longer stack overlapping panels. `<boceto-edit>` marks itself active on `pointerdown` / `focusin`.

  ### React wrappers (`@boceto/react`)
  - `<BocetoEditFull>` — composes editor + palette + inspector behind a `useId`-managed shared id. Use this when you want a working authoring surface without wiring three elements by hand.
  - `<BocetoPalette>` and `<BocetoInspector>` for custom layouts.
  - `<BocetoEdit>` gains `id`, `src`, `page`, `innerRef`, and `imports` props.

  ### Vue + Svelte wrappers, AI toolchain (`@boceto/vue`, `@boceto/svelte`, `boceto` CLI, `@boceto/mcp`)

  Shipped as part of the v0.2 baseline.

  ### Docs site

  Editor page reworked as two flagship surfaces: standalone `<boceto-edit>` and a live TipTap demo. The TipTap pane includes a full toolbar (headings, marks, lists, blockquote, code block, link, tables with column/row ops, undo/redo) and a seed doc demonstrating the literate-component pattern. Brand B-icon now uses the same `'Patrick Hand', cursive` font stack as the `.logo-mark` badge for visual consistency.

### Patch Changes

- Updated dependencies [b597450]
  - @boceto/core@0.2.0
  - @boceto/view@0.2.0
  - @boceto/edit@0.2.0
