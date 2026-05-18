import {
  CanvasRenderer,
  isComponentInstance,
  parse,
  serialize,
  type AttrValue,
  type BocetoDoc,
  type Component,
  type ComponentBodyItem,
  type ComponentInstance,
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
  duplicateTopLevelInPages,
  findAny,
  findTopLevel,
  moveItem,
  relayout,
  removePage,
  removeTopLevel,
  removeTopLevelFromPages,
  renamePage,
  reorderItems,
  reorderItemsInPages,
  resizeItem,
  setAttrOf,
  setLabelOf,
} from './mutations'
import {
  appendInstance as appendInstanceMut,
  buildComponentSummaries,
  createComponent as createComponentMut,
  deleteComponent as deleteComponentMut,
  findInstancesOnPage,
  promoteToComponent as promoteToComponentMut,
  renameComponent as renameComponentMut,
  updateComponentDef as updateComponentDefMut,
  updateInstanceParams as updateInstanceParamsMut,
  type ComponentDefPatch,
  type ComponentSummary,
  type PromoteArgs,
} from './components'
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
  /** Imported components — extracted once per `setImports` for the panel + summaries. */
  #importedComponents: Component[] = []
  /** Host-supplied origin hints for imported components (e.g. "block 2"). */
  #importHints = new Map<string, string>()
  /** Name of the component currently being edited in component-edit mode (null in page mode). */
  #editingComponent: string | null = null
  /** Synthetic page wrapping `component.body` when in edit mode. Not in `doc.pages`. */
  #editPage: Page | null = null

  constructor(init: EditorInit = {}) {
    this.#imports = init.imports
    const doc = this.#parse(init.code)
    this.#refreshImportedComponents()
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
    // In component-edit mode the canvas operates on a synthetic page whose
    // `elements` array IS the component body — same reference, so every
    // mutation lands on the body directly.
    if (this.#editPage) return this.#editPage
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
    // External code replace drops edit mode — the underlying component
    // body may have moved or vanished.
    this.#editingComponent = null
    this.#editPage = null
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
    this.#refreshImportedComponents()
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
      const hit = this.#findTopLevelHere(id)
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
    const hit = this.#findTopLevelHere(id)
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
    const hit = this.#findTopLevelHere(id)
    return hit ? currentBox(hit.item) : null
  }

  /**
   * Locate a top-level item by id in the editor's currently-active surface
   * — either the visible doc page or the synthetic edit page when in
   * component-edit mode. Geometry mutations all route through this so
   * editing a component body uses the same machinery as editing a page.
   */
  #findTopLevelHere(id: string): { page: Page; item: PageItem; index: number } | null {
    if (this.#editPage) {
      for (let i = 0; i < this.#editPage.elements.length; i++) {
        const it = this.#editPage.elements[i]!
        if (it.id === id) return { page: this.#editPage, item: it, index: i }
      }
      return null
    }
    return findTopLevel(this.#state.doc, id)
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
    const removed = this.#editPage
      ? removeTopLevelFromPages([this.#editPage], set)
      : removeTopLevel(this.#state.doc, set)
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
    const touched = this.#editPage
      ? reorderItemsInPages([this.#editPage], new Set(ids), mode)
      : reorderItems(this.#state.doc, new Set(ids), mode)
    if (touched === 0) return
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
  }

  duplicateItems(ids: readonly string[]): string[] {
    if (this.#state.readonly) return []
    if (ids.length === 0) return []
    const before = this.code
    const set = new Set(ids)
    const created = this.#editPage
      ? duplicateTopLevelInPages([this.#editPage], set)
      : duplicateTopLevel(this.#state.doc, set)
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

  // ── Components ─────────────────────────────────────────────────────────

  /** Component currently being edited (null in page mode). */
  get editingComponent(): string | null {
    return this.#editingComponent
  }

  /**
   * Panel-friendly summary of every component visible to this editor — both
   * local (defined in `doc.components`) and imported (visible via the
   * `imports` source). Instance counts come from the **current page**.
   * Imported entries pick up any `tagImportOrigin` hint the host has set.
   */
  components(): ComponentSummary[] {
    return buildComponentSummaries({
      localComponents: this.#state.doc.components,
      importedComponents: this.#importedComponents,
      currentPage: this.currentPage,
      hints: this.#importHints,
    })
  }

  /** Every ComponentInstance on the current page. Optional name filter. */
  instances(name?: string): ComponentInstance[] {
    return findInstancesOnPage(this.currentPage, name)
  }

  /**
   * Annotate an imported component with a human-readable origin hint (e.g.
   * "block 2" or "from ./shared/cards.md"). The hint flows through to
   * `components()` and is shown verbatim in the panel.
   */
  tagImportOrigin(name: string, hint: string | undefined): void {
    if (!hint) this.#importHints.delete(name)
    else this.#importHints.set(name, hint)
  }

  createComponent(input: { name: string; params?: string[]; body?: ComponentBodyItem[] }): Component {
    if (this.#state.readonly) throw new Error('editor is readonly')
    const before = this.code
    const c = createComponentMut(this.#state.doc, input)
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
    return c
  }

  deleteComponent(name: string, options: { deleteInstances?: boolean } = {}): boolean {
    if (this.#state.readonly) return false
    // Refuse to delete the component currently being edited — exit edit mode first.
    if (this.#editingComponent === name) {
      this.#emit('error', { message: `Cannot delete component "${name}" while editing it` })
      return false
    }
    const before = this.code
    const removed = deleteComponentMut(this.#state.doc, name, options)
    if (!removed) return false
    // Drop any selection ids that point at instances we just removed.
    for (const id of [...this.#state.selection]) {
      if (!findAny(this.#state.doc, id)) this.#state.selection.delete(id)
    }
    this.#emit('select', { ids: [...this.#state.selection] })
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
    return true
  }

  renameComponent(oldName: string, newName: string): boolean {
    if (this.#state.readonly) return false
    if (oldName === newName) return false
    const before = this.code
    const ok = renameComponentMut(this.#state.doc, oldName, newName)
    if (!ok) return false
    // Track the edit-mode target name through the rename.
    if (this.#editingComponent === oldName) this.#editingComponent = newName
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
    return true
  }

  updateComponentDef(name: string, patch: ComponentDefPatch): boolean {
    if (this.#state.readonly) return false
    const before = this.code
    const ok = updateComponentDefMut(this.#state.doc, name, patch)
    if (!ok) return false
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
    return true
  }

  /**
   * Add a `ComponentInstance` call site for a local component to the current
   * page. Returns the new instance's id. Refuses unknown component names.
   * The new instance is round-tripped through serialize → parse so its
   * `expanded` tree is populated for hit-testing.
   */
  addInstance(
    componentName: string,
    x: number,
    y: number,
    opts: { w?: number; h?: number } = {},
  ): string | null {
    if (this.#state.readonly) return null
    if (this.#editPage) {
      this.#emit('error', { message: 'Cannot add an instance while editing a component body' })
      return null
    }
    const before = this.code
    try {
      const inst = appendInstanceMut(this.#state.doc, this.currentPage, componentName, {
        x,
        y,
        w: opts.w,
        h: opts.h,
      })
      // Round-trip so `expanded` is materialised by the parser.
      const reparsed = this.#parse(serialize(this.#state.doc))
      this.#state.doc = reparsed
      this.#refreshImportedComponents()
      relayout(this.#state.doc)
      this.#afterMutation(before, true)
      return inst.id
    } catch (err) {
      this.#emit('error', { message: (err as Error).message ?? String(err) })
      return null
    }
  }

  updateInstanceParams(instanceId: string, params: Record<string, string>): boolean {
    if (this.#state.readonly) return false
    const before = this.code
    const ok = updateInstanceParamsMut(this.#state.doc, instanceId, params)
    if (!ok) return false
    relayout(this.#state.doc)
    this.#afterMutation(before, true)
    return true
  }

  /**
   * Lift the currently-selected (or supplied) top-level items into a new
   * `Component` definition. The selection is replaced by one instance call
   * site placed at the union-bbox of the lifted items. Selection moves to
   * the new instance. Operates on the current page only — sub-selections
   * inside an expanded subtree are refused.
   */
  promoteToComponent(args: PromoteArgs): { instanceId: string; componentName: string } {
    if (this.#state.readonly) throw new Error('editor is readonly')
    if (this.#editingComponent) {
      throw new Error('Cannot promote to component while editing a component body')
    }
    const before = this.code
    // Re-parse after we mutate so the new instance gets a proper `expanded` tree.
    const result = promoteToComponentMut(this.#state.doc, this.currentPage, args)
    // Cheapest way to materialise `expanded` for the new instance: round-trip
    // through serialize → parse. Reuses every existing code path.
    const next = this.#parse(serialize(this.#state.doc))
    this.#state.doc = next
    this.#refreshImportedComponents()
    relayout(this.#state.doc)
    // Find the new instance again on the reparsed doc and select it.
    const inst = this.instances().find((i) => i.componentName === result.componentName)
    if (inst) {
      this.#state.selection = new Set([inst.id])
      this.#emit('select', { ids: [inst.id] })
    }
    this.#afterMutation(before, true)
    return result
  }

  /**
   * Enter component-edit mode for the local component `name`. The canvas
   * swaps to a synthetic page whose `elements` IS the component body — all
   * existing geometry mutations route through unchanged. Fires the `page`
   * event so panels (palette/inspector) update their scope.
   */
  enterComponentEditMode(name: string): void {
    if (this.#state.readonly) return
    if (this.#editingComponent === name) return
    const c = this.#state.doc.components.find((c) => c.name === name)
    if (!c) {
      this.#emit('error', { message: `Cannot edit unknown or imported component "${name}"` })
      return
    }
    this.#editingComponent = name
    // Build a synthetic page whose elements array IS the component body —
    // same reference, so mutations land directly on `c.body`.
    this.#editPage = {
      id: `__edit__${name}`,
      name: `Editing: ${name}`,
      elements: c.body as PageItem[],
      arrows: [],
    }
    this.#state.selection = new Set()
    this.#emit('select', { ids: [] })
    this.#emit('page', { pageId: this.#editPage.id })
    relayout(this.#state.doc)
  }

  /** Exit component-edit mode and return to the previously-active page. */
  exitComponentEditMode(): void {
    if (!this.#editingComponent) return
    this.#editingComponent = null
    this.#editPage = null
    this.#state.selection = new Set()
    this.#emit('select', { ids: [] })
    this.#emit('page', { pageId: this.#state.currentPageId })
    relayout(this.#state.doc)
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
    if (this.#editPage) {
      // Temporarily expose the synthetic edit page so the renderer can find
      // it via `selectPage(doc, id)`. It's spliced back out before any code
      // path that might serialize the doc runs (the `code` getter never
      // sees it because we don't trigger serialize during render).
      this.#state.doc.pages.push(this.#editPage)
      try {
        renderer.render(this.#state.doc, {
          width: w,
          height: h,
          page: this.#editPage.id,
          selectedIds: this.#state.selection,
          hoveredId: extra?.hoveredId,
          zoom: extra?.zoom,
        })
      } finally {
        this.#state.doc.pages.pop()
      }
      return
    }
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
    // If we were editing a component, re-bind the synthetic edit page to
    // the new doc's component body (it's a fresh object after re-parse).
    if (this.#editingComponent) {
      const c = doc.components.find((c) => c.name === this.#editingComponent)
      if (c) {
        this.#editPage = {
          id: `__edit__${c.name}`,
          name: `Editing: ${c.name}`,
          elements: c.body as PageItem[],
          arrows: [],
        }
      } else {
        // Component is gone — fall back to page mode.
        this.#editingComponent = null
        this.#editPage = null
        this.#emit('page', { pageId: this.#state.currentPageId })
      }
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

  /**
   * Parse the current `imports` source in isolation to extract the list of
   * components it brings in — used by `components()` for the imported
   * section of the panel. Called whenever `#imports` changes.
   */
  #refreshImportedComponents(): void {
    if (!this.#imports) {
      this.#importedComponents = []
      return
    }
    try {
      const importsDoc = parse(this.#imports)
      this.#importedComponents = importsDoc.components.slice()
    } catch {
      // A malformed imports source should not crash the editor; the panel
      // simply won't show anything from imports.
      this.#importedComponents = []
    }
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
