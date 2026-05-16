import {
  CanvasRenderer,
  parse,
  serialize,
  type AttrValue,
  type BocetoDoc,
  type ElementType,
  type Page,
  type PageItem,
} from '@boceto/core'
import { History } from './history'
import {
  addPage,
  appendElement,
  currentBox,
  duplicateTopLevel,
  findAny,
  findTopLevel,
  moveItem,
  relayout,
  removePage,
  removeTopLevel,
  renamePage,
  reorderItems,
  resizeItem,
  setAttrOf,
  setLabelOf,
} from './mutations'
import { hitHandle, hitTestLeaf, hitTestTop, itemsInRect, selectionBox } from './hit-test'
import type {
  EditorEventName,
  EditorEvents,
  EditorState,
  HandleEdge,
  Mode,
} from './state'

export interface EditorInit {
  code?: string
  readonly?: boolean
  /** Initial page (id, name, or index). */
  page?: string | number
  /** History capacity. Defaults to 100. */
  historyLimit?: number
  /**
   * Additional DSL source whose `component … end` definitions feed the parser
   * before `code` is parsed. Use when this editor instance edits one fence of
   * a multi-fence doc and needs to resolve components defined in sibling
   * fences. Update later via `setImports`.
   */
  imports?: string
}

/**
 * Framework-agnostic editor controller. Owns the `BocetoDoc`, selection, and
 * history. Mutations are method calls; observers subscribe via `on(event,
 * fn)`. The web component (`<boceto-edit>`) is one adapter — anything else
 * (React hook, vanilla canvas, Svelte action) can host the same controller.
 */
export class BocetoEditor {
  #state: EditorState
  #history: History
  #subs = new Map<EditorEventName, Set<(payload: unknown) => void>>()
  #serializedCache: string | null = null
  /** Component-definition source merged into every parse. See `EditorInit.imports`. */
  #imports: string | undefined

  constructor(init: EditorInit = {}) {
    this.#imports = init.imports
    const doc = this.#parse(init.code)
    const firstPage = doc.pages[0]!
    this.#state = {
      doc,
      selection: new Set(),
      currentPageId: resolvePageId(doc, init.page) ?? firstPage.id,
      mode: 'select',
      readonly: init.readonly === true,
    }
    this.#history = new History(init.historyLimit ?? 100)
    relayout(doc)
  }

  // ── State accessors ────────────────────────────────────────────────────

  get doc(): BocetoDoc {
    return this.#state.doc
  }

  get code(): string {
    if (this.#serializedCache != null) return this.#serializedCache
    this.#serializedCache = serialize(this.#state.doc)
    return this.#serializedCache
  }

  get selection(): ReadonlySet<string> {
    return this.#state.selection
  }

  get currentPageId(): string {
    return this.#state.currentPageId
  }

  get currentPage(): Page {
    const p = this.#state.doc.pages.find((p) => p.id === this.#state.currentPageId)
    return p ?? this.#state.doc.pages[0]!
  }

  get mode(): Mode {
    return this.#state.mode
  }

  get readonly(): boolean {
    return this.#state.readonly
  }

  setReadonly(v: boolean): void {
    this.#state.readonly = v
  }

  get canUndo(): boolean {
    return this.#history.canUndo
  }

  get canRedo(): boolean {
    return this.#history.canRedo
  }

  // ── Source-of-truth setter ─────────────────────────────────────────────

  /**
   * Replace the doc from a code string. Clears history, selection, and
   * collapses to the first page if the current one no longer exists.
   * Does NOT emit a `change` event — external sets are not user mutations.
   */
  setCode(code: string): void {
    const doc = this.#parse(code)
    this.#state.doc = doc
    this.#state.selection = new Set()
    if (!doc.pages.find((p) => p.id === this.#state.currentPageId)) {
      this.#state.currentPageId = doc.pages[0]!.id
    }
    this.#history.clear()
    this.#serializedCache = null
    relayout(doc)
  }

  /**
   * Replace the imports source and re-parse the current code with the new
   * registry. Selection is preserved if the resolved ids still exist;
   * history is cleared (imports change is not a user-editable mutation).
   * No-op if `imports` is unchanged.
   */
  setImports(imports: string | undefined): void {
    if ((imports ?? undefined) === (this.#imports ?? undefined)) return
    this.#imports = imports || undefined
    const doc = this.#parse(this.code)
    this.#state.doc = doc
    if (!doc.pages.find((p) => p.id === this.#state.currentPageId)) {
      this.#state.currentPageId = doc.pages[0]!.id
    }
    for (const id of [...this.#state.selection]) {
      if (!findAny(doc, id)) this.#state.selection.delete(id)
    }
    this.#history.clear()
    this.#serializedCache = null
    relayout(doc)
  }

  /** Current imports source, if any. */
  get imports(): string | undefined {
    return this.#imports
  }

  // ── Selection ──────────────────────────────────────────────────────────

  select(ids: readonly string[], mode: 'replace' | 'add' | 'toggle' = 'replace'): void {
    const cur = this.#state.selection
    let changed = false
    if (mode === 'replace') {
      const next = new Set(ids)
      if (!setsEqual(cur, next)) {
        this.#state.selection = next
        changed = true
      }
    } else if (mode === 'add') {
      for (const id of ids) {
        if (!cur.has(id)) {
          cur.add(id)
          changed = true
        }
      }
    } else {
      for (const id of ids) {
        if (cur.has(id)) cur.delete(id)
        else cur.add(id)
        changed = true
      }
    }
    if (changed) this.#emit('select', { ids: [...this.#state.selection] })
  }

  clearSelection(): void {
    if (this.#state.selection.size === 0) return
    this.#state.selection = new Set()
    this.#emit('select', { ids: [] })
  }

  // ── Geometry ───────────────────────────────────────────────────────────

  /**
   * Translate every top-level item in `ids` by (dx, dy). Items nested inside
   * a container are silently skipped (and an `error` event fires) so the UI
   * can show the rejection. By default each call commits a history entry;
   * during drags, wrap in `beginTransaction` / `commitTransaction` to
   * coalesce.
   */
  move(ids: readonly string[], dx: number, dy: number, opts: { commit?: boolean } = {}): void {
    if (this.#state.readonly) return
    const before = this.code
    let anyMoved = false
    for (const id of ids) {
      const hit = findTopLevel(this.#state.doc, id)
      if (!hit) {
        this.#emit('error', { message: `Cannot move nested item ${id}` })
        continue
      }
      moveItem(hit.item, dx, dy)
      anyMoved = true
    }
    if (!anyMoved) return
    relayout(this.#state.doc)
    this.#afterMutation(before, opts.commit !== false)
  }

  /**
   * Resize the top-level item `id` by dragging `edge`. `origin` is the box
   * at pointer-down time; `dx`/`dy` are total deltas since then.
   */
  resize(
    id: string,
    edge: HandleEdge,
    dx: number,
    dy: number,
    origin: { x: number; y: number; w: number; h: number },
    opts: { commit?: boolean } = {},
  ): void {
    if (this.#state.readonly) return
    const hit = findTopLevel(this.#state.doc, id)
    if (!hit) {
      this.#emit('error', { message: `Cannot resize nested item ${id}` })
      return
    }
    const before = this.code
    resizeItem(hit.item, edge, dx, dy, origin)
    relayout(this.#state.doc)
    this.#afterMutation(before, opts.commit !== false)
  }

  /** Convenience: current bbox for a top-level item (for capturing drag origin). */
  boxOf(id: string): { x: number; y: number; w: number; h: number } | null {
    const hit = findTopLevel(this.#state.doc, id)
    return hit ? currentBox(hit.item) : null
  }

  /**
   * Re-run the flex layout pass. Useful when consumers construct the
   * controller before Yoga's WASM has loaded (the constructor's initial
   * pass is a no-op in that case) and want to recompute boxes once
   * `await initYoga()` resolves. Does NOT emit `change` — purely
   * recomputes `computed` boxes on existing items.
   */
  relayout(): void {
    relayout(this.#state.doc)
  }

  // ── Properties ─────────────────────────────────────────────────────────

  setLabel(id: string, label: string): void {
    if (this.#state.readonly) return
    const before = this.code
    if (!setLabelOf(this.#state.doc, id, label)) return
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
  }

  setAttr(id: string, key: string, value: AttrValue | undefined): void {
    if (this.#state.readonly) return
    const before = this.code
    if (!setAttrOf(this.#state.doc, id, key, value)) return
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
  }

  // ── Doc shape ──────────────────────────────────────────────────────────

  addElement(
    type: ElementType,
    x: number,
    y: number,
    opts: { w?: number; h?: number; label?: string; page?: string } = {},
  ): string | null {
    if (this.#state.readonly) return null
    const page = opts.page
      ? (this.#state.doc.pages.find((p) => p.id === opts.page) ?? this.currentPage)
      : this.currentPage
    const before = this.code
    const el = appendElement(page, type, x, y, opts)
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
    return el.id
  }

  removeItems(ids: readonly string[]): void {
    if (this.#state.readonly) return
    if (ids.length === 0) return
    const set = new Set(ids)
    const before = this.code
    const removed = removeTopLevel(this.#state.doc, set)
    if (removed === 0) return
    // Drop removed ids from the selection.
    for (const id of set) this.#state.selection.delete(id)
    this.#emit('select', { ids: [...this.#state.selection] })
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
  }

  /**
   * Z-order operations. Rendering walks `page.elements` in source order;
   * the last item is painted on top. Each method preserves the relative
   * order of the selected items to each other.
   */
  bringToFront(ids: readonly string[] = [...this.#state.selection]): void {
    this.#reorder(ids, 'front')
  }

  sendToBack(ids: readonly string[] = [...this.#state.selection]): void {
    this.#reorder(ids, 'back')
  }

  bringForward(ids: readonly string[] = [...this.#state.selection]): void {
    this.#reorder(ids, 'forward')
  }

  sendBackward(ids: readonly string[] = [...this.#state.selection]): void {
    this.#reorder(ids, 'backward')
  }

  #reorder(ids: readonly string[], mode: 'front' | 'back' | 'forward' | 'backward'): void {
    if (this.#state.readonly) return
    if (ids.length === 0) return
    const before = this.code
    const touched = reorderItems(this.#state.doc, new Set(ids), mode)
    if (touched === 0) return
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
  }

  duplicateItems(ids: readonly string[]): string[] {
    if (this.#state.readonly) return []
    if (ids.length === 0) return []
    const before = this.code
    const set = new Set(ids)
    const created = duplicateTopLevel(this.#state.doc, set)
    if (created.length === 0) return []
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
    this.select(created, 'replace')
    return created
  }

  // ── Pages ──────────────────────────────────────────────────────────────

  addPage(name?: string): string {
    if (this.#state.readonly) return this.#state.currentPageId
    const before = this.code
    const p = addPage(this.#state.doc, name)
    this.#afterMutation(before, true)
    return p.id
  }

  removePage(id: string): void {
    if (this.#state.readonly) return
    const before = this.code
    if (!removePage(this.#state.doc, id)) return
    if (this.#state.currentPageId === id) {
      this.#state.currentPageId = this.#state.doc.pages[0]!.id
      this.#emit('page', { pageId: this.#state.currentPageId })
    }
    this.#afterMutation(before, true)
  }

  renamePage(id: string, name: string): void {
    if (this.#state.readonly) return
    const before = this.code
    if (!renamePage(this.#state.doc, id, name)) return
    this.#afterMutation(before, true)
  }

  setPage(idOrIndex: string | number): void {
    const id = resolvePageId(this.#state.doc, idOrIndex)
    if (!id || id === this.#state.currentPageId) return
    this.#state.currentPageId = id
    this.#state.selection = new Set()
    this.#emit('page', { pageId: id })
    this.#emit('select', { ids: [] })
  }

  // ── History ────────────────────────────────────────────────────────────

  undo(): void {
    if (!this.#history.canUndo) return
    const snapshot = this.#history.undo(this.code)
    if (snapshot == null) return
    this.#restoreFromSnapshot(snapshot)
  }

  redo(): void {
    if (!this.#history.canRedo) return
    const snapshot = this.#history.redo(this.code)
    if (snapshot == null) return
    this.#restoreFromSnapshot(snapshot)
  }

  beginTransaction(): void {
    this.#history.begin(this.code)
  }

  commitTransaction(): void {
    this.#history.commit(this.code)
    // A transaction may have changed the doc; emit one consolidated change.
    this.#emitChange()
  }

  // ── Hit-testing (exposed for the canvas binding) ───────────────────────

  hitTestTop(x: number, y: number): PageItem | null {
    return hitTestTop(this.currentPage, x, y)
  }

  hitTestLeaf(x: number, y: number): PageItem | null {
    return hitTestLeaf(this.currentPage, x, y)
  }

  hitHandle(x: number, y: number): { edge: HandleEdge } | null {
    const box = selectionBox(this.currentPage, this.#state.selection)
    if (!box) return null
    return hitHandle(box, x, y)
  }

  selectionBox(): { x: number; y: number; w: number; h: number } | null {
    return selectionBox(this.currentPage, this.#state.selection)
  }

  itemsInRect(rect: { x: number; y: number; w: number; h: number }): string[] {
    return itemsInRect(this.currentPage, rect)
  }

  findItem(id: string): PageItem | null {
    return findAny(this.#state.doc, id)
  }

  // ── Render bridge ──────────────────────────────────────────────────────

  /**
   * Render the current page onto `canvas`. Used by the web component; can
   * also be called by any other adapter. The `selectedIds` / `hoveredId`
   * options reflect the editor's selection state, so the renderer paints
   * the right chrome.
   */
  render(
    renderer: CanvasRenderer,
    w: number,
    h: number,
    extra?: { hoveredId?: string; zoom?: number },
  ): void {
    renderer.render(this.#state.doc, {
      width: w,
      height: h,
      page: this.#state.currentPageId,
      selectedIds: this.#state.selection,
      hoveredId: extra?.hoveredId,
      zoom: extra?.zoom,
    })
  }

  // ── Event subscription ─────────────────────────────────────────────────

  on<E extends EditorEventName>(event: E, fn: (payload: EditorEvents[E]) => void): () => void {
    let set = this.#subs.get(event)
    if (!set) {
      set = new Set()
      this.#subs.set(event, set)
    }
    set.add(fn as (payload: unknown) => void)
    return () => set!.delete(fn as (payload: unknown) => void)
  }

  // ── Internal ───────────────────────────────────────────────────────────

  #afterMutation(snapshotBefore: string, commit: boolean): void {
    this.#serializedCache = null
    if (commit) {
      this.#history.push(this.code, snapshotBefore)
      this.#emitChange()
    }
  }

  #restoreFromSnapshot(snapshot: string): void {
    const doc = this.#parse(snapshot)
    this.#state.doc = doc
    if (!doc.pages.find((p) => p.id === this.#state.currentPageId)) {
      this.#state.currentPageId = doc.pages[0]!.id
      this.#emit('page', { pageId: this.#state.currentPageId })
    }
    // Drop selected ids that no longer exist.
    for (const id of [...this.#state.selection]) {
      if (!findAny(doc, id)) this.#state.selection.delete(id)
    }
    relayout(doc)
    this.#serializedCache = snapshot
    this.#emit('select', { ids: [...this.#state.selection] })
    this.#emit('change', { code: snapshot, doc })
  }

  #emit<E extends EditorEventName>(event: E, payload: EditorEvents[E]): void {
    const set = this.#subs.get(event)
    if (!set) return
    for (const fn of set) fn(payload)
  }

  #emitChange(): void {
    this.#emit('change', { code: this.code, doc: this.#state.doc })
  }

  /**
   * Parse `code` honoring the editor's stashed `imports`. Raw mode skips
   * Pass-1, so we disable it whenever imports are set — otherwise the
   * imported component definitions would be invisible to the parser.
   */
  #parse(code: string | undefined): BocetoDoc {
    const src = code ?? ''
    const looksRaw = !src.includes('```') && !/^---/m.test(src.trim())
    return parse(src, {
      raw: looksRaw && !this.#imports,
      ...(this.#imports ? { imports: this.#imports } : {}),
    })
  }
}

function resolvePageId(doc: BocetoDoc, page: string | number | undefined): string | null {
  if (page == null) return doc.pages[0]?.id ?? null
  if (typeof page === 'number') return doc.pages[page]?.id ?? null
  const hit = doc.pages.find((p) => p.id === page || p.name === page)
  return hit?.id ?? null
}

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}
