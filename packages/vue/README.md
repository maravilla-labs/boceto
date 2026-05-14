# `@boceto/vue`

Vue 3 wrappers for the Boceto custom elements.

```sh
pnpm add @boceto/vue
```

```vue
<script setup lang="ts">
import { BocetoView, BocetoEdit } from '@boceto/vue'
import { ref } from 'vue'

const code = ref(`element navbar 0 0 600 44 "MyApp"
element heading 100 90 400 32 "Welcome"
element primary-button 100 160 400 36 "Sign in"`)
</script>

<template>
  <!-- read-only render -->
  <BocetoView :code="code" :width="600" :height="240" />

  <!-- interactive editor; v-model:code for two-way binding -->
  <BocetoEdit v-model:code="code" :width="600" :height="240" />
</template>
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
| `bocetoClass` | string | Class on the underlying `<boceto-view>` (avoids the Vue `class` conflict) |
| `bocetoStyle` | string &#124; object | Inline style on the underlying element |

Emits `render(doc, page)` when the canvas renders.

### `<BocetoEdit>`

| Prop | Type | Notes |
|---|---|---|
| `code` | string | DSL source — pairs with `v-model:code` |
| `width` | number | Editor width (px) |
| `height` | number | Editor height (px) |
| `readOnly` | boolean | Disable editing |
| `bocetoClass`, `bocetoStyle` | — | Same as above |

Emits `update:code(code)` whenever the editor commits a change.

## Get the runtime

`@boceto/vue` doesn't include the custom-element runtime — it pulls in
`@boceto/view` and `@boceto/edit` and calls `defineBocetoView()` /
`defineBocetoEdit()` on mount. Your bundler treats them as ordinary
ES modules.

## Want to know more about Boceto?

- npm: `boceto` (CLI) · `@boceto/mcp` · `@boceto/lint` · `@boceto/core` · `@boceto/view` · `@boceto/edit` · `@boceto/react` · `@boceto/svelte`
- Website: https://maravilla-labs.github.io/boceto/

MIT © Maravilla Labs
