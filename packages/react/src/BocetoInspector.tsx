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
   * `false` to require manual show/hide control.
   */
  auto?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Floating property inspector for the selected element(s). The right-input
 * set depends on element type (table headers, navbar items, alert color,
 * etc.) — see `@boceto/edit`'s inspector module for the full schema.
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
    class: props.className,
    style: props.style,
  })
}
