---
slug: "web-components"
kind: "stack"
stack: "web-components"
title: "Plain web components (HTML, Vue, Svelte, Astro, Solid, …)"
summary: "Drop <boceto-edit> + sidekick panels straight into any custom-elements-capable host. The framework-agnostic fallback."
---

# Embedding boceto as plain web components

Use this recipe when your host is anything that can render custom elements: a static HTML page, Vue, Svelte, Solid, Astro, Lit, or a framework not yet covered by a dedicated wrapper. Boceto's editor surface is web components first — every other integration ultimately wraps these.

## Install

```bash
pnpm add @boceto/core @boceto/view @boceto/edit
```

No peer dependencies; the packages bring their own dependencies (`yoga-layout` for the layout pass). For SSR-only / static rendering, `@boceto/view` alone is enough.

## Register the elements

The custom-element constructors aren't auto-registered (so you decide on the tag names). Call the `define*` helpers once at startup:

```ts
import {
  defineBocetoView,    // <boceto-view>     — read-only canvas
  defineBocetoEdit,    // <boceto-edit>     — interactive editor
  defineBocetoPalette,    // <boceto-palette>  — element picker
  defineBocetoInspector,  // <boceto-inspector>— property panel
  defineBocetoComponents, // <boceto-components>— component library
} from '@boceto/edit'

defineBocetoView()
defineBocetoEdit()
defineBocetoPalette()
defineBocetoInspector()
defineBocetoComponents()
```

(`defineBocetoView` lives in `@boceto/view`; the rest in `@boceto/edit`. Each accepts an optional alternate tag name as the first argument.)

## Drop the editor into the DOM

```html
<boceto-edit id="ed" width="860" height="600">
  <!-- initial source can also be passed via the `code` attribute or via the slotted text -->
  element button 0 0 120 36 "Save"
</boceto-edit>

<boceto-palette for="ed"></boceto-palette>
<boceto-inspector for="ed" auto></boceto-inspector>
<boceto-components for="ed" open></boceto-components>
```

Or programmatically:

```ts
const el = document.createElement('boceto-edit')
el.code = 'element button 0 0 120 36 "Save"'
document.body.appendChild(el)

const palette = document.createElement('boceto-palette')
palette.setAttribute('for', 'ed')
document.body.appendChild(palette)
```

The panels mount themselves in `document.body` (escaping the host's shadow root) — that means they're not clipped by ancestor `overflow: hidden`. They auto-scope to whichever `<boceto-edit>` last got focus.

## Read source + listen for changes

```ts
const ed = document.querySelector('boceto-edit') as HTMLElement & { code: string; editor: unknown }

ed.addEventListener('change', (e) => {
  const detail = (e as CustomEvent<{ code: string }>).detail
  saveToStorage(detail.code)
})

// Get the current source at any time:
console.log(ed.code)
```

The `change` event fires once per user-initiated commit (drag release, key press, mutation, undo/redo).

## Cross-document component sharing

Pass DSL source whose `component … end` definitions should feed the parser via the `imports` attribute or JS property:

```ts
// One or more fenced blocks (raw DSL works too):
ed.imports = '```boceto\ncomponent feature-card(title)\n  element card 0 0 240 140 ""\nend\n```'
```

The Components panel shows imported entries under **Available elsewhere**. Use `editor.tagImportOrigin(name, "from ./shared/components.md")` to give them a friendly origin hint (accessed via `ed.editor.tagImportOrigin(...)`).

## Controller API for power users

`ed.editor` is the headless `BocetoEditor` controller. Useful methods:

```ts
ed.editor.select([id])
ed.editor.move([id], dx, dy)
ed.editor.removeItems([id])
ed.editor.duplicateItems([id])
ed.editor.undo() / .redo()
ed.editor.createComponent({ name, params })
ed.editor.promoteToComponent({ ids, name })
ed.editor.enterComponentEditMode(name) / .exitComponentEditMode()
ed.editor.components()   // ComponentSummary[]
ed.editor.instances()    // ComponentInstance[] on current page
```

See `boceto://references/components.md` for the full controller reference and Components-panel UX.

## Custom elements / events you ship

| Element | Attributes |
|---|---|
| `<boceto-edit>` | `code`, `src`, `width`, `height`, `page`, `readonly`, `imports`, `fit`, `padding` |
| `<boceto-view>` | `code`, `src`, `width`, `height`, `page`, `imports`, `fit`, `padding` |
| `<boceto-palette for>` | `for`, `open`, `x`, `y` |
| `<boceto-inspector for>` | `for`, `auto`, `open`, `x`, `y` |
| `<boceto-components for>` | `for`, `open`, `x`, `y` |

Events on `<boceto-edit>`:
- `change` `{ code, doc }`
- `select` `{ ids }`
- `page` `{ pageId }`
- `gotodefinition` `{ componentName, origin, hint? }` — bubbles + composed; handle by navigating to where the component is defined (your responsibility outside TipTap).
- `componenteditmode` `{ name | null }` — entering / leaving component-edit mode.

## Theming

No external CSS to import — every panel uses inline styles inside its own shadow tree. To override, target the `data-boceto-panel`, `data-boceto-context-menu`, and `::part(canvas)` selectors from host CSS. Panels obey `position: fixed`; reposition with the `x` / `y` attributes.

## Vue / Svelte / Solid snippets

Same elements, idiomatic markup. The dedicated `@boceto/vue` and `@boceto/svelte` packages are thin SFC wrappers — if they don't yet expose every prop you need, falling back to raw custom elements via this recipe always works.

```svelte
<!-- Svelte 5 -->
<script>
  import { defineBocetoEdit, defineBocetoPalette } from '@boceto/edit'
  defineBocetoEdit()
  defineBocetoPalette()
</script>
<boceto-edit id="ed" code={src} on:change={(e) => src = e.detail.code} />
<boceto-palette for="ed" />
```

```vue
<!-- Vue 3 -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { defineBocetoEdit, defineBocetoPalette } from '@boceto/edit'
onMounted(() => { defineBocetoEdit(); defineBocetoPalette() })
</script>
<template>
  <boceto-edit id="ed" :code="src" @change="onChange" />
  <boceto-palette for="ed" />
</template>
```

## Common pitfalls

- **Forgetting `define*`** — the elements are no-ops until their constructor is registered. Symptom: `<boceto-edit>` renders as an empty inline element.
- **Tag-name collision** — pass an alternate tag to `defineBocetoEdit('my-bceto')` if `boceto-edit` clashes with another component on the page.
- **Sandbox / CSP** — the canvas renderer needs `script-src 'self'` and the WASM Yoga binary needs `'wasm-unsafe-eval'`. The library does not eval arbitrary user input.
- **`code` attribute size** — for sources over a few KB, set the JS property (`el.code = …`) instead of the attribute to skip serialisation overhead.
- **Multiple editors per page** — assign each one a unique `id` and target the right one via `for=` on every panel.

## Reference

- Live demo: `examples/vanilla-html/index.html` (this repo).
- Editor controller API + Components panel: `boceto://references/components.md`.
- Element catalog (the 83 built-in element types): `boceto://references/elements.md` or `boceto_list_elements`.
