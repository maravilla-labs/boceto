---
slug: "index"
kind: "index"
title: "Boceto editor integrations — pick the right recipe"
summary: "Decision tree mapping host stacks (TipTap+React, plain HTML, React app, docs site) to a specific integration recipe."
---

# Integrating the boceto editor

The boceto editor (`<boceto-edit>`) and its three sidekick panels (`<boceto-palette>`, `<boceto-inspector>`, `<boceto-components>`) are framework-agnostic web components. Most hosts also need a thin adapter — a TipTap node, a React wrapper, or a docs-site renderer — to make the editor feel native.

Use this table to pick the matching recipe; fetch it via `boceto_read_integration({ slug })`.

| Host situation | Recipe slug | What you ship |
|---|---|---|
| Rich-text editor in React with TipTap; users embed mockups inside prose | `tiptap-react` | `BocetoBlock` TipTap node + `BocetoContext` extension + React node view. The demo at `examples/tiptap-demo/` is exactly this. |
| React app already using `react-markdown` to render docs / wiki / inbox markdown | `react-markdown` | `@boceto/remark` plugin + `rehype-raw` + a typed `boceto-view` component override. No new package; uses the remark plugin you already have. |
| Pure React app, editor is the main surface (no TipTap, no react-markdown) | `react` | `@boceto/react`'s `<BocetoEditFull>` (or the à-la-carte `<BocetoEdit>` + `<BocetoPalette>` + `<BocetoInspector>`) |
| Static site / Astro / Vitepress / docs platform that renders markdown with ```boceto fences | `docs-site` | `@boceto/remark` or `@boceto/markdown-it` plugin. Cross-file imports via YAML frontmatter. |
| Plain HTML page, raw web components, any framework that supports custom elements (Vue, Svelte, Solid, Astro islands…) | `web-components` | `<boceto-edit>` + sidekicks directly in markup; framework-agnostic JS for events. |

## When in doubt

- **Have TipTap already?** → `tiptap-react`. The cross-block component context (`BocetoContext`) is the killer feature.
- **Already rendering markdown with `react-markdown`?** → `react-markdown`. Adds boceto in three lines of config; no renderer swap.
- **Building a doc tool / wiki / CMS view via a build-time pipeline?** → `docs-site`. Fences become `<boceto-view>` or inline SVG at build time.
- **Want pixel-perfect framework integration without a node-editor?** → `react` (or `web-components` for Vue/Svelte).
- **Just want to drop one editor on a static page?** → `web-components`.

## What every integration ships

Once wired, every host exposes the same custom-element surface:

| Element | Purpose |
|---|---|
| `<boceto-edit>` | Interactive canvas. Drag / resize / select / inline-label-edit / context-menu / undo-redo. |
| `<boceto-view>` | Read-only canvas — for rendering boceto in non-editable surfaces. |
| `<boceto-palette>` | Floating element picker (⌘K to open). |
| `<boceto-inspector>` | Floating property panel for the selection. |
| `<boceto-components>` | Floating component-library panel. Lists local + imported components, supports create / promote / edit-in-place. |

And the same DOM events on `<boceto-edit>`:

| Event | Detail | Meaning |
|---|---|---|
| `change` | `{ code, doc }` | One per user commit. Persist the new source. |
| `select` | `{ ids }` | Selection changed. |
| `page` | `{ pageId }` | Active page changed (multi-page docs). |
| `gotodefinition` | `{ componentName, origin, hint? }` | User wants to navigate to a component's definition. **Host's responsibility** to handle for cross-document jumps. |
| `componenteditmode` | `{ name \| null }` | Editing started / ended for a component body. Useful for greying out surrounding UI. |

## Cross-document component sharing

The editor has a flat `imports` attribute (or `editor.setImports(src)` property) that takes one or more `boceto` fence sources and merges their `component … end` definitions into the local registry. The TipTap integration broadcasts this automatically across sibling blocks; the docs-site integration resolves frontmatter `boceto.import` paths against the file system; standalone hosts pass it manually. See the specific recipe for your stack.
