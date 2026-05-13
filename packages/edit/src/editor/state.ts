import type { BocetoDoc } from '@boceto/core'

/**
 * Editor mode. `select` is the default for v0.2. Future modes (`draw:box`,
 * `draw:arrow`, …) will plug in once the toolbar chrome lands.
 */
export type Mode = 'select'

/**
 * Eight selection handle anchors, named by compass direction. Used by both
 * hit-testing and resize math.
 */
export type HandleEdge = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const HANDLES: readonly HandleEdge[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
]

/**
 * Live editor state. Held by `BocetoEditor`; consumers read it via getters
 * and react to events. The `doc` reference is replaced atomically on every
 * commit — never mutated in-place from outside the controller.
 */
export interface EditorState {
  doc: BocetoDoc
  selection: Set<string>
  currentPageId: string
  mode: Mode
  readonly: boolean
}

/**
 * Typed event map for `BocetoEditor.on(...)`. Subscriptions are separate
 * from any DOM event — the web component re-emits these as `CustomEvent`
 * on the host element.
 */
export interface EditorEvents {
  /** Fires once per commit (drag release, mutation, undo, redo, setCode). */
  change: { code: string; doc: BocetoDoc }
  /** Fires when the selection set changes. */
  select: { ids: string[] }
  /** Fires when the active page changes. */
  page: { pageId: string }
  /** Fires when mode changes. v0.2 has only one mode; reserved for forward compat. */
  mode: { mode: Mode }
  /** Fires when a mutation was rejected (e.g. resizing a nested item). */
  error: { message: string; cause?: unknown }
}

export type EditorEventName = keyof EditorEvents
