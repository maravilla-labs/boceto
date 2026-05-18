/**
 * Module augmentation for `@vue/runtime-core`'s `GlobalComponents` map so
 * the five boceto custom-element tags are recognised in Vue templates.
 *
 * Without this, `<boceto-view code="…">` in a template warns about an
 * unknown element. With it, Vue's template type-checker (via
 * `vue-tsc` / Volar) typechecks attribute names, infers prop types, and
 * autocompletes. The package's own `BocetoView` / `BocetoEdit` Vue
 * components are higher-level wrappers around the same elements — both
 * forms are first-class.
 *
 * Imported as a side-effect from `index.ts`.
 */

import type { DefineComponent } from 'vue'

type CommonProps = {
  /** CSS class. Vue's standard `class` attribute applies; this is here for explicitness. */
  class?: string | string[] | Record<string, boolean>
  style?: string | Record<string, string | number>
}

type BocetoViewProps = CommonProps & {
  code?: string
  src?: string
  width?: number | string
  height?: number | string
  page?: string | number
  fit?: 'content' | 'fixed'
  padding?: number | string
  imports?: string
}

type BocetoEditProps = BocetoViewProps & {
  readonly?: boolean | string
  mode?: 'select'
}

type BocetoPanelProps = CommonProps & {
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
}

type BocetoInspectorProps = BocetoPanelProps & {
  auto?: boolean | string
}

// Vue's recommended augmentation point for template-time custom elements
// is `vue` itself (which re-exports `GlobalComponents` from runtime-core).
// Targeting `vue` works in both the bundler-style `vue-tsc` setup and the
// classic IDE Volar path; `@vue/runtime-core` is only reachable when that
// package is in the consumer's dependency closure, which it isn't always.
declare module 'vue' {
  interface GlobalComponents {
    'boceto-view': DefineComponent<BocetoViewProps>
    'boceto-edit': DefineComponent<BocetoEditProps>
    'boceto-palette': DefineComponent<BocetoPanelProps>
    'boceto-inspector': DefineComponent<BocetoInspectorProps>
    'boceto-components': DefineComponent<BocetoPanelProps>
  }
}

export {}
