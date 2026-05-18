import { createElement, useEffect, type CSSProperties } from 'react'
import { defineBocetoInspector } from '@boceto/edit'

export interface BocetoInspectorProps {
  /**
   * `id` of the `<boceto-edit>` this inspector reflects. Updates on every
   * selection change in that editor.
   */
  for: string
  /**
   * Auto-show on selection (default true) — the inspector floats in when an
   * element is selected and slides out when nothing is selected. Set
   * `false` to require manual show/hide control. Ignored when `dock` is
   * true (docked panels follow the host's visibility).
   */
  auto?: boolean
  /**
   * `id` of a DOM element the panel should mount into instead of
   * `document.body`. Pair with `dock` to embed the inspector inside a
   * host-controlled rail.
   */
  mount?: string
  /**
   * Docked layout — drops the floating chrome (no drag, no shadow,
   * `position: fixed` → flow), and the inspector becomes always-visible.
   * The body still renders "Nothing selected" when the selection is empty.
   */
  dock?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Floating property inspector for the selected element(s). The right-input
 * set depends on element type (table headers, navbar items, alert color,
 * etc.) — see `@boceto/edit`'s inspector module for the full schema.
 *
 * Set `dock` + `mount` to embed the inspector in a host-controlled location
 * (e.g. a Photoshop-style tab inside a sidebar) instead of floating.
 *
 * Typically paired with a `<BocetoEdit>` via a shared `id`. For a one-line
 * setup that wires palette + inspector together, use `<BocetoEditFull>`.
 */
export function BocetoInspector(props: BocetoInspectorProps): JSX.Element {
  useEffect(() => {
    defineBocetoInspector()
  }, [])

  return createElement('boceto-inspector', {
    for: props.for,
    auto: props.auto === false ? undefined : '',
    mount: props.mount,
    dock: props.dock ? '' : undefined,
    class: props.className,
    style: props.style,
  })
}
