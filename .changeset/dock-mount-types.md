---
'@boceto/react': patch
'@boceto/vue': minor
'@boceto/svelte': minor
---

Type augmentations: `mount` + `dock` now appear on the panel custom-element
tags (`<boceto-palette>`, `<boceto-inspector>`, `<boceto-components>`) in
every framework wrapper's template / JSX type map.

- `@boceto/react` — JSX intrinsics gain `mount?: string` and `dock?: boolean | string`.
- `@boceto/vue` — `GlobalComponents` augmentation extends `BocetoPanelProps`.
- `@boceto/svelte` — `SvelteHTMLElements` augmentation extends `BocetoPanelAttrs`.

The runtime behaviour was already shipped in `@boceto/edit@0.4.0`; this
release just makes the new attributes first-class in TypeScript template
checks. Floating mode (no `mount` / `dock`) is unchanged.
