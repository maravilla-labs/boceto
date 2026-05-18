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

import type { DetailedHTMLProps, HTMLAttributes } from 'react'

// Per-element extras layered on top of the standard HTML attributes (which
// already cover className / style / events / ref / key / children / etc.).
// We use `DetailedHTMLProps` below so consumers can pass `ref` and React's
// special props on every boceto tag the same way they can on any built-in
// intrinsic.

interface BocetoViewExtras {
  code?: string
  src?: string
  width?: number | string
  height?: number | string
  page?: string | number
  fit?: 'content' | 'fixed'
  padding?: number | string
  imports?: string
}

interface BocetoEditExtras extends BocetoViewExtras {
  /** Readonly mode — presence of the attribute disables mutations. */
  readonly?: boolean | string
  mode?: 'select'
}

interface BocetoPanelExtras {
  /** Editor id this panel binds to (`<boceto-edit id="…">`). */
  for?: string
  /** Initial visibility. The attribute is presence-checked — pass `""` or `true`. */
  open?: boolean | string
  /** Initial top-left position in viewport pixels. */
  x?: number | string
  y?: number | string
}

interface BocetoInspectorExtras extends BocetoPanelExtras {
  /** Auto-show on selection, auto-hide on empty (default). */
  auto?: boolean | string
}

type BocetoViewAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement> & BocetoViewExtras, HTMLElement>
type BocetoEditAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement> & BocetoEditExtras, HTMLElement>
type BocetoPanelAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement> & BocetoPanelExtras, HTMLElement>
type BocetoInspectorAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement> & BocetoInspectorExtras, HTMLElement>

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
