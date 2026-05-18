import { createElement, useEffect, type CSSProperties } from 'react'
import { defineBocetoPalette } from '@boceto/edit'

export interface BocetoPaletteProps {
  /**
   * `id` of the `<boceto-edit>` this palette controls. The palette listens
   * for the editor's keyboard shortcuts and dispatches its picks back to the
   * matching editor instance.
   */
  for: string
  /**
   * `id` of a DOM element the panel should mount into instead of
   * `document.body`. Pair with `dock` to embed the palette inside a
   * host-controlled rail / tab strip.
   */
  mount?: string
  /**
   * Docked layout — drops the floating chrome (no drag, no shadow,
   * `position: fixed` → flow). Pair with `mount` so the panel lands in
   * a host-controlled location. Visibility is then the host's responsibility.
   */
  dock?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Floating element palette for the editor. Hidden by default; press
 * <kbd>⌘K</kbd> (or <kbd>Ctrl+K</kbd>) while focused on the wired
 * `<boceto-edit>` to summon it. Drag entries onto the canvas, or click to
 * insert them at the current selection.
 *
 * Set `dock` + `mount` to embed the palette in a host-controlled location
 * (e.g. a Photoshop-style tab inside a sidebar) instead of floating.
 *
 * Typically paired with a `<BocetoEdit>` via a shared `id`. For a one-line
 * setup that wires palette + inspector together, use `<BocetoEditFull>`.
 */
export function BocetoPalette(props: BocetoPaletteProps): JSX.Element {
  useEffect(() => {
    defineBocetoPalette()
  }, [])

  return createElement('boceto-palette', {
    for: props.for,
    mount: props.mount,
    dock: props.dock ? '' : undefined,
    class: props.className,
    style: props.style,
  })
}
