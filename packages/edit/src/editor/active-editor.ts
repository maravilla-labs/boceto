/**
 * Module-level registry of which `<boceto-edit>` is currently "active" —
 * the one most recently interacted with on the page. Floating UI elements
 * (`<boceto-palette>`, `<boceto-inspector>`) use this to scope themselves to
 * a single editor at a time so multi-editor pages (TipTap docs, side-by-side
 * demos, etc.) don't end up with overlapping panels.
 *
 * The registry uses raw HTMLElement so this module doesn't have to import
 * `<boceto-edit>` (which would create a circular dep with the element file
 * itself). Callers cast back to the concrete type when they need the
 * `.editor` controller off of it.
 */

type Listener = (active: HTMLElement | null) => void

let active: HTMLElement | null = null
const listeners = new Set<Listener>()

/** Currently-active editor element, or `null` when nothing has been set. */
export function getActiveEditor(): HTMLElement | null {
  return active
}

/**
 * Mark `el` as the active editor. No-op when it's already active. Pass
 * `null` to clear (e.g. on disconnect of the previously-active element).
 */
export function setActiveEditor(el: HTMLElement | null): void {
  if (el === active) return
  active = el
  for (const fn of listeners) fn(active)
}

/**
 * Subscribe to active-editor changes. Returns an unsubscriber. The
 * listener fires *after* `active` flips, with the new value (or `null`).
 */
export function onActiveEditorChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
