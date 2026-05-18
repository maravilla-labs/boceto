import { createElement, useEffect, type CSSProperties } from 'react'
import { defineBocetoComponents } from '@boceto/edit'

export interface BocetoComponentsProps {
  /**
   * `id` of the `<boceto-edit>` this panel reflects. The component
   * registry, instance counts, and enter-edit-mode actions all flow
   * through the matching editor.
   */
  for: string
  /**
   * Initial visibility — only meaningful in floating mode. Docked panels
   * are always-visible (the host's tab / rail controls when the user
   * actually sees them).
   */
  open?: boolean
  /**
   * `id` of a DOM element the panel should mount into instead of
   * `document.body`. Pair with `dock` to embed inside a host-controlled
   * rail / tab strip.
   */
  mount?: string
  /**
   * Docked layout — drops the floating chrome (no drag, no shadow,
   * `position: fixed` → flow). Pair with `mount` so the panel lands in
   * a host-controlled location.
   */
  dock?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Floating components panel — lists every composite component in scope
 * for the wired editor (local + imported), with per-row actions
 * (instantiate, edit, find instances, delete) and a "+ New" form. The
 * panel is the source of truth for "what components exist" — a definition
 * with zero instances stays visible there even though the canvas has
 * nothing to render for it.
 *
 * Set `dock` + `mount` to embed the panel in a host-controlled location
 * (e.g. a Photoshop-style tab inside a sidebar) instead of floating.
 *
 * Typically paired with a `<BocetoEdit>` via a shared `id`.
 */
export function BocetoComponents(props: BocetoComponentsProps): JSX.Element {
  useEffect(() => {
    defineBocetoComponents()
  }, [])

  return createElement('boceto-components', {
    for: props.for,
    open: props.open ? '' : undefined,
    mount: props.mount,
    dock: props.dock ? '' : undefined,
    class: props.className,
    style: props.style,
  })
}
