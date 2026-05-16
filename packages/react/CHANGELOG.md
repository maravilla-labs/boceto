# @boceto/react

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
