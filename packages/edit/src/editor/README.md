# Editor

`<boceto-edit>` is a thin DOM adapter around a framework-agnostic
`BocetoEditor` controller. The controller owns the document, selection, and
history; the web component forwards pointer + keyboard events into it and
re-emits its events as DOM `CustomEvent`s.

## Quick start (custom element)

```html
<boceto-edit code='```boceto
element navbar 0 0 600 40 "MyApp"
element box 100 80 200 80 "Hello"
```'></boceto-edit>

<script type="module">
  import '@boceto/edit/auto'
  const el = document.querySelector('boceto-edit')
  el.addEventListener('change', e => console.log(e.detail.code))
  el.addEventListener('select', e => console.log('selected:', e.detail.ids))
  // Power users:
  el.editor.addElement('button', 100, 200)
  el.editor.undo()
</script>
```

## Headless use

The custom element is **one** adapter; the controller is exported directly:

```ts
import { BocetoEditor } from '@boceto/edit'
const ed = new BocetoEditor({ code: '```boceto\nelement box 0 0 100 50 "Hi"\n```' })
ed.on('change', ({ code }) => save(code))
ed.move(['p0e0'], 10, 0)        // moves the box right by 10px
ed.addElement('button', 200, 100, { label: 'Save' })
ed.undo()
```

`BocetoEditor` does no DOM work — wrap it in your own renderer, React hook,
or Svelte action.

## Public API

```ts
class BocetoEditor {
  constructor(init?: { code?: string; readonly?: boolean; page?: string | number })

  // State (read-only views)
  doc: BocetoDoc
  code: string
  selection: ReadonlySet<string>
  currentPage: Page
  currentPageId: string
  mode: 'select'
  readonly: boolean
  canUndo: boolean
  canRedo: boolean

  // Source-of-truth setter (external resets; does NOT emit `change`)
  setCode(code: string): void

  // Selection
  select(ids: readonly string[], mode?: 'replace' | 'add' | 'toggle'): void
  clearSelection(): void

  // Geometry — top-level PageItem only
  move(ids: readonly string[], dx: number, dy: number, opts?: { commit?: boolean }): void
  resize(id: string, edge: HandleEdge, dx: number, dy: number,
         origin: { x: number; y: number; w: number; h: number },
         opts?: { commit?: boolean }): void
  boxOf(id: string): { x: number; y: number; w: number; h: number } | null

  // Properties — any selectable item (label, attrs, params)
  setLabel(id: string, label: string): void
  setAttr(id: string, key: string, value: AttrValue | undefined): void

  // Doc shape
  addElement(type: ElementType, x: number, y: number,
             opts?: { w?: number; h?: number; label?: string; page?: string }): string | null
  removeItems(ids: readonly string[]): void
  duplicateItems(ids: readonly string[]): string[]

  // Pages
  addPage(name?: string): string
  removePage(id: string): void
  renamePage(id: string, name: string): void
  setPage(idOrIndex: string | number): void

  // History
  undo(): void
  redo(): void
  beginTransaction(): void
  commitTransaction(): void

  // Hit-testing (used by the canvas binding)
  hitTestTop(x: number, y: number): PageItem | null
  hitTestLeaf(x: number, y: number): PageItem | null
  hitHandle(x: number, y: number): { edge: HandleEdge } | null
  selectionBox(): { x: number; y: number; w: number; h: number } | null
  itemsInRect(rect: { x: number; y: number; w: number; h: number }): string[]
  findItem(id: string): PageItem | null

  // Render bridge
  render(renderer: CanvasRenderer, w: number, h: number,
         extra?: { hoveredId?: string }): void

  // Events
  on<E extends keyof EditorEvents>(e: E, fn: (p: EditorEvents[E]) => void): () => void
}
```

### Events

| Event   | Detail                       | Fires on                                     |
|---------|------------------------------|----------------------------------------------|
| `change`| `{ code, doc }`              | every commit (drag release, mutation, undo)  |
| `select`| `{ ids: string[] }`          | selection set change                         |
| `page`  | `{ pageId: string }`         | active page change                           |
| `error` | `{ message, cause? }`        | rejected mutation (e.g. nested-item drag)    |

External `setCode()` does **not** emit `change` — it's a source-of-truth
reset, not a user mutation.

## Interactions shipped (v0.2)

| Gesture                | Mutation                                              |
|------------------------|-------------------------------------------------------|
| Click on item          | `select([id], 'replace')`                             |
| Shift / ⌘ + click      | `select([id], 'toggle')`                              |
| Click on empty         | `clearSelection()`                                    |
| Drag on selected       | move (one history entry on release)                   |
| Drag a handle          | resize (one history entry on release)                 |
| Drag on empty          | rubber-band → replace selection with overlapped items |
| Backspace / Delete     | `removeItems(selection)`                              |
| Arrow keys (shift=10)  | `move(selection, ±step, ±step)`                       |
| ⌘-D                    | `duplicateItems(selection)`                           |
| ⌘-Z / ⌘-Shift-Z        | `undo` / `redo`                                       |
| Double-click           | inline label edit overlay                             |

Items nested inside a `FlexContainer` or `ComponentInstance` are reachable
via `setLabel` / `setAttr` but their geometry is layout-derived — drag and
resize on those is a no-op (and emits an `error` event).

## Out of scope for v0.2

- Toolbar / properties-panel / page-tab chrome (the shadow root reserves
  `part="toolbar"`, `part="panel"`, `part="page-tabs"` for future use)
- Drag/resize for items nested inside containers/composites
- Mouse-drawing new elements (`addElement` is programmatic for now)
- Arrow drawing
- Collaborative editing
