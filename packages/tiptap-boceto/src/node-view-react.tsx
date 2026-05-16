import * as React from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react'
import { defineBocetoView } from '@boceto/view'
import {
  defineBocetoEdit,
  defineBocetoPalette,
  defineBocetoInspector,
  onActiveEditorChange,
} from '@boceto/edit'
import type { Node } from '@tiptap/core'
import type { BocetoContextStorage } from './boceto-context'

// Register the read-only element on first render. The edit/palette/inspector
// trio is loaded lazily when the user enters edit mode.
defineBocetoView()

// JSX intrinsic-element declarations for the boceto web components. These
// only affect typing; the runtime registration is handled by the `define*`
// calls above and inside the editing effect.
type CE = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  code?: string
  page?: string
  fit?: string
  for?: string
  auto?: string
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'boceto-view': CE
      'boceto-edit': CE
      'boceto-palette': CE
      'boceto-inspector': CE
    }
  }
}

/**
 * Pull `editor.storage.bocetoContext.source` and subtract this block's own
 * code. Returns the remainder as a string suitable for the `imports` prop on
 * `<boceto-view>` / `<boceto-edit>`. Returns `undefined` when the result is
 * empty so we don't toggle the attribute unnecessarily.
 */
function useImportsFor(
  props: NodeViewProps,
  ownCode: string,
): string | undefined {
  const storage = (props.editor.storage as Record<string, unknown>)['bocetoContext'] as
    | BocetoContextStorage
    | undefined
  const [version, setVersion] = useState(storage?.version ?? 0)

  useEffect(() => {
    const handler = () => {
      const s = (props.editor.storage as Record<string, unknown>)['bocetoContext'] as
        | BocetoContextStorage
        | undefined
      if (s && s.version !== version) setVersion(s.version)
    }
    props.editor.on('transaction', handler)
    return () => {
      props.editor.off('transaction', handler)
    }
  }, [props.editor, version])

  return useMemo(() => {
    if (!storage || storage.blocks.length === 0) return undefined
    // Subtract this block by skipping the fence whose body equals our `code`.
    // Multiple blocks with identical bodies are rare but harmless — we only
    // drop the first match, so a duplicate twin still ends up in `imports`.
    let dropped = false
    const others = storage.blocks.filter((fenced) => {
      if (dropped) return true
      const body = fenced.replace(/^```boceto(?::[^\n]*)?\n/, '').replace(/\n```$/, '')
      if (body === ownCode) {
        dropped = true
        return false
      }
      return true
    })
    const joined = others.join('\n\n')
    return joined.length > 0 ? joined : undefined
    // version is the reactivity trigger; ownCode also affects subtraction
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ownCode, storage])
}

function PencilIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M11.4 1.6a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L5.5 13.5l-3.2.7.7-3.2L11.4 1.6z"/>
    </svg>
  )
}

function CheckIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M13.5 4.2 6.3 11.4 2.5 7.6l1.4-1.4 2.4 2.4 5.8-5.8 1.4 1.4z"/>
    </svg>
  )
}

/**
 * React node view for `BocetoBlock`. Two modes:
 *
 *  - **Read** (default): renders `<boceto-view>` with the block's code and
 *    sibling-block component imports. Click → enter edit mode.
 *  - **Edit**: mounts `<boceto-edit>` + `<boceto-palette for>` + `<boceto-inspector for>`,
 *    same trio used by the docs-site editor. The edit element's `change`
 *    event syncs back into the TipTap node's `code` attr.
 */
export default function BocetoNodeView(props: NodeViewProps): JSX.Element {
  const { node, updateAttributes, selected } = props
  const code: string = (node.attrs.code as string) ?? ''
  const page: string | null = (node.attrs.page as string | null) ?? null
  const [editing, setEditing] = useState(false)
  const imports = useImportsFor(props, code)

  // Stable host id so the palette + inspector can wire to it via `for`.
  const rawId = useId()
  const editorId = `boceto-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  // Register edit-side custom elements lazily.
  useEffect(() => {
    if (!editing) return
    defineBocetoEdit()
    defineBocetoPalette()
    defineBocetoInspector()
  }, [editing])

  // Exit edit mode when the user clicks into a *different* boceto-edit on
  // the page. Without this, opening a second block leaves the first block's
  // canvas + palette + inspector still mounted, which visually competes
  // with the new one. Clicking into prose (no active editor) keeps the
  // current block in edit mode — only an explicit handoff to another
  // editor closes us.
  useEffect(() => {
    if (!editing) return
    const unsub = onActiveEditorChange((active) => {
      if (!active) return
      if (editRef.current && active !== editRef.current) setEditing(false)
    })
    return unsub
    // editRef is a ref; only `editing` should drive (re)binding.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  // Push `imports` via the JS property (avoids attribute serialization of
  // potentially-large strings). Updated whenever the joined-source changes.
  const editRef = useRef<HTMLElement | null>(null)
  const viewRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = (editing ? editRef.current : viewRef.current) as
      | (HTMLElement & { imports?: string | null })
      | null
    if (!el) return
    el.imports = imports ?? null
  }, [editing, imports])

  // Forward `<boceto-edit>`'s `change` event into the TipTap node attrs.
  const updateRef = useRef(updateAttributes)
  updateRef.current = updateAttributes
  useEffect(() => {
    const el = editRef.current
    if (!editing || !el) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ code: string }>).detail
      if (detail && typeof detail.code === 'string') {
        updateRef.current({ code: detail.code })
      }
    }
    el.addEventListener('change', handler)
    return () => {
      el.removeEventListener('change', handler)
    }
  }, [editing])

  if (editing) {
    return (
      <NodeViewWrapper className="boceto-block boceto-block--editing">
        <div data-no-shortcuts className="boceto-block__shell boceto-block__shell--editing">
          <div data-drag-handle className="boceto-block__bar">
            <span>
              boceto · editing{page ? ` · ${page}` : ''} · ⌘K palette · click element for properties · drag bottom-right to resize
            </span>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="boceto-block__done"
              title="Done editing"
            >
              <CheckIcon /> Done
            </button>
          </div>
          {/* Resizable wrapper: dragging the bottom-right corner grows the
              canvas. `<boceto-edit>` fills 100%/100% so the editor's
              ResizeObserver tracks the new size automatically. The min/max
              keep the handle on-screen without letting the editor collapse
              below a usable size. */}
          <div
            className="boceto-block__canvas"
            style={{
              position: 'relative',
              resize: 'vertical',
              overflow: 'hidden',
              minHeight: 280,
              height: 480,
            }}
          >
            <boceto-edit
              ref={editRef as React.Ref<HTMLElement>}
              id={editorId}
              code={code}
              style={{ display: 'block', width: '100%', height: '100%' }}
            />
            <boceto-palette for={editorId} />
            <boceto-inspector for={editorId} auto="" />
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="boceto-block">
      <div
        className={
          'boceto-block__shell' + (selected ? ' boceto-block__shell--selected' : '')
        }
        onClick={() => setEditing(true)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setEditing(true)
          }}
          className="boceto-block__edit-btn"
          title="Edit mockup"
        >
          <PencilIcon /> Edit
        </button>
        <boceto-view
          ref={viewRef as React.Ref<HTMLElement>}
          code={code}
          page={page ?? undefined}
          fit="content"
        />
      </div>
    </NodeViewWrapper>
  )
}

/**
 * Returns an `addNodeView` function suitable for `Node.extend({...})` — or
 * use it directly when wiring the React renderer into a custom node:
 *
 *     BocetoBlock.extend({ addNodeView: () => bocetoReactNodeView() })
 */
export function bocetoReactNodeView() {
  return ReactNodeViewRenderer(BocetoNodeView)
}

/**
 * Configure `BocetoBlock` to render with the bundled React node view. Most
 * consumers want this:
 *
 *     extensions: [StarterKit, withReactNodeView(BocetoBlock), BocetoContext]
 *
 * Skip when you want vanilla TipTap (no React) or your own node view.
 */
export function withReactNodeView<N extends Node>(block: N): N {
  return block.extend({
    addNodeView: () => ReactNodeViewRenderer(BocetoNodeView),
  }) as N
}
