# `@boceto/svelte`

Svelte wrappers for the Boceto custom elements. Works under Svelte 4 and Svelte 5 — the source uses Svelte 4 syntax which compiles cleanly in both.

```sh
pnpm add @boceto/svelte
```

```svelte
<script lang="ts">
  import { BocetoView, BocetoEdit } from '@boceto/svelte'

  let code = `element navbar 0 0 600 44 "MyApp"
element heading 100 90 400 32 "Welcome"
element primary-button 100 160 400 36 "Sign in"`
</script>

<!-- read-only render -->
<BocetoView {code} width={600} height={240} on:render={(e) => console.log(e.detail.doc)} />

<!-- interactive editor; bind:code for two-way binding -->
<BocetoEdit bind:code width={600} height={240} />
```

## Props

### `<BocetoView>`

| Prop | Type | Notes |
|---|---|---|
| `code` | string | Boceto DSL source (one mode) |
| `src` | string | URL to fetch a `.boceto` file (the other mode) |
| `width` | number | Render width (px) |
| `height` | number | Render height (px) |
| `page` | string &#124; number | Page selector for multi-page docs |
| `class` | string | Forwarded to the underlying `<boceto-view>` |
| `style` | string | Inline style on the underlying element |

Emits `on:render` with `{ doc, page }` when the canvas renders.

### `<BocetoEdit>`

| Prop | Type | Notes |
|---|---|---|
| `code` | string | DSL source — supports `bind:code` |
| `width` | number | Editor width (px) |
| `height` | number | Editor height (px) |
| `readOnly` | boolean | Disable editing |
| `class`, `style` | — | Same as above |

Emits `on:change` with `{ code }` whenever the editor commits a change.

## Get the runtime

`@boceto/svelte` doesn't include the custom-element runtime — it pulls in
`@boceto/view` and `@boceto/edit` and calls `defineBocetoView()` /
`defineBocetoEdit()` on mount. SvelteKit / Vite handle the rest.

## Source-only

This package ships `.svelte` source files; your Svelte tooling compiles
them. No build step in the package itself, so the on-disk source is what
you debug into. Consumers using strict TypeScript get prop / event types
from the sibling `.svelte.d.ts` files.

## Want to know more about Boceto?

- npm: `boceto` (CLI) · `@boceto/mcp` · `@boceto/lint` · `@boceto/core` · `@boceto/view` · `@boceto/edit` · `@boceto/react` · `@boceto/vue`
- Website: https://maravilla-labs.github.io/boceto/

MIT © Maravilla Labs
