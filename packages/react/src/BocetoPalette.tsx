import { createElement, useEffect, type CSSProperties } from 'react'
import { defineBocetoPalette } from '@boceto/edit'

export interface BocetoPaletteProps {
  /**
   * `id` of the `<boceto-edit>` this palette controls. The palette listens
   * for the editor's keyboard shortcuts and dispatches its picks back to the
   * matching editor instance.
   */
  for: string
  className?: string
  style?: CSSProperties
}

/**
 * Floating element palette for the editor. Hidden by default; press
 * <kbd>⌘K</kbd> (or <kbd>Ctrl+K</kbd>) while focused on the wired
 * `<boceto-edit>` to summon it. Drag entries onto the canvas, or click to
 * insert them at the current selection.
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
    class: props.className,
    style: props.style,
  })
}
