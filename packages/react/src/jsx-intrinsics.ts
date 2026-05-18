/**
 * Global JSX intrinsic declarations for the five boceto custom elements.
 *
 * `@boceto/react` is the React-facing surface of the boceto editor: its goal
 * is to make consumers experience the editor *as React* — typed props,
 * autocomplete, all the rest. Custom elements normally appear as untyped
 * strings in `JSX.IntrinsicElements`, so a consumer doing
 *
 *     <boceto-view code={src} />
 *
 * gets red squiggles. Likewise for `react-markdown`'s `components` map
 * keyed on tag names:
 *
 *     <ReactMarkdown components={{ 'boceto-view': MyView }} />
 *
 * Augmenting the global namespace here makes both patterns first-class.
 * Importing this module from `index.ts` ensures TypeScript pulls the
 * declarations into the consumer's type graph automatically — no manual
 * `/// <reference …>` directive needed.
 *
 * The shape of each entry mirrors the custom element's HTML attributes
 * (camelCase aliases included where React's convention differs from the
 * web-component naming). Per-element extras (e.g. `for` on the panel
 * elements, `auto` on the inspector) get explicit declarations; everything
 * else passes through `HTMLAttributes<HTMLElement>`.
 */

import type { CSSProperties, HTMLAttributes } from 'react'

// Common attribute set every boceto element accepts.
interface BocetoCommonAttrs extends HTMLAttributes<HTMLElement> {
  /** CSS class name. React's `className` already covers this; the lowercase
   *  variant is here for direct attribute use. */
  class?: string
  style?: CSSProperties
}

interface BocetoViewAttrs extends BocetoCommonAttrs {
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
  /** Readonly mode — presence of the attribute disables mutations. */
  readonly?: boolean | string
  mode?: 'select'
}

interface BocetoPanelAttrs extends BocetoCommonAttrs {
  /** Editor id this panel binds to (`<boceto-edit id="…">`). */
  for?: string
  /** Initial visibility. The attribute is presence-checked — pass `""` or `true`. */
  open?: boolean | string
  /** Initial top-left position in viewport pixels. */
  x?: number | string
  y?: number | string
}

interface BocetoInspectorAttrs extends BocetoPanelAttrs {
  /** Auto-show on selection, auto-hide on empty (default). */
  auto?: boolean | string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'boceto-view': BocetoViewAttrs
      'boceto-edit': BocetoEditAttrs
      'boceto-palette': BocetoPanelAttrs
      'boceto-inspector': BocetoInspectorAttrs
      'boceto-components': BocetoPanelAttrs
    }
  }
}

// Ensure the file is a module so the `declare global` block applies once,
// regardless of whether the consumer touches the named exports.
export {}
