/**
 * Module augmentation for `svelte/elements`' `SvelteHTMLElements` map so
 * the five boceto custom-element tags are recognised in Svelte templates.
 *
 * Without this, `<boceto-view code="…">` in a `.svelte` file triggers
 * "Element does not exist" warnings under `svelte-check` / language server.
 * With it, attribute names autocomplete and types narrow correctly. The
 * package's own `BocetoView.svelte` / `BocetoEdit.svelte` higher-level
 * wrappers stay first-class; using the raw element tags directly is also
 * fully supported.
 *
 * Pulled in via `index.d.ts`'s side-effect-only `<reference>` (Svelte
 * source-only packages can't use `import './x'` at the type-only level).
 */

import type { HTMLAttributes } from 'svelte/elements'

interface BocetoViewAttrs extends HTMLAttributes<HTMLElement> {
  code?: string
  src?: string
  width?: number | string
  height?: number | string
  page?: string | number
  fit?: 'content' | 'fixed'
  padding?: number | string
  imports?: string
}

interface BocetoEditAttrs extends BocetoViewAttrs {
  readonly?: boolean | string
  mode?: 'select'
}

interface BocetoPanelAttrs extends HTMLAttributes<HTMLElement> {
  for?: string
  open?: boolean | string
  x?: number | string
  y?: number | string
  /**
   * `id` of a host-controlled element the panel should attach to instead
   * of `document.body`. Pair with `dock` to embed inside a sidebar / rail
   * (Photoshop-style). The slot must exist in the DOM before the panel's
   * `connectedCallback` runs.
   */
  mount?: string
  /**
   * Docked layout — flips `position: fixed` → flow, drops the drag
   * handle / shadow / close button, and the panel becomes always-visible.
   * Pair with `mount` so the panel lands inside your container.
   */
  dock?: boolean | string
  /**
   * Visual theme for the panel chrome (canvas is not affected).
   * `light` (default), `dark`, or `auto` (follows `prefers-color-scheme`).
   */
  theme?: 'light' | 'dark' | 'auto'
}

interface BocetoInspectorAttrs extends BocetoPanelAttrs {
  auto?: boolean | string
}

declare module 'svelte/elements' {
  interface SvelteHTMLElements {
    'boceto-view': BocetoViewAttrs
    'boceto-edit': BocetoEditAttrs
    'boceto-palette': BocetoPanelAttrs
    'boceto-inspector': BocetoInspectorAttrs
    'boceto-components': BocetoPanelAttrs
  }
}
