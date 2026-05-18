import type { ElementType } from '@boceto/core'
import type { BocetoEditElement } from './boceto-edit'
import { ELEMENT_CATALOG } from './editor/element-catalog'
import { createFloatingPanel, type FloatingPanelHandle } from './editor/floating-panel'
import { getActiveEditor, onActiveEditorChange } from './editor/active-editor'

/**
 * `<boceto-palette>` — floating draggable element picker that adds elements
 * to a target `<boceto-edit>`. Mounts a `position: fixed` panel in
 * `document.body` so it escapes any container chrome.
 *
 * Two ways to bind to an editor:
 *   1. Place the palette as a sibling/descendant in the DOM and set
 *      `for="<editor-id>"` — it looks up `document.getElementById(...)`.
 *   2. Place it as a child of `<boceto-edit>` — it walks up to find the
 *      nearest editor ancestor.
 *
 * Attributes:
 *   - `for`     id of the target `<boceto-edit>` element.
 *   - `x`, `y`  initial top-left position (px). Defaults to top-left of the
 *               viewport with a 16px gutter.
 *   - `open`    boolean — when present, the panel is visible. Toggle from
 *               JS via `el.setAttribute('open', '')` / `el.removeAttribute('open')`.
 *
 * Interaction:
 *   - Type in the search input to filter the catalog by type name.
 *   - Click an item → element is inserted at the canvas centre (or a
 *     viewport-aware default coordinate).
 *   - Drag an item → drop onto the canvas to place at the cursor position.
 */
export class BocetoPaletteElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['for', 'x', 'y', 'open', 'mount', 'dock']
  }

  #panel: FloatingPanelHandle | null = null
  #search: HTMLInputElement | null = null
  #list: HTMLDivElement | null = null
  #targetId: string | null = null
  #cachedTarget: BocetoEditElement | null = null
  #onGlobalKey: ((e: KeyboardEvent) => void) | null = null
  #onTargetFocus: ((e: FocusEvent) => void) | null = null
  #unsubActive: (() => void) | null = null
  #toast: HTMLDivElement | null = null

  connectedCallback(): void {
    if (this.#panel) return
    this.style.display = 'none'
    const x = numAttr(this, 'x', NaN)
    const y = numAttr(this, 'y', NaN)
    const dock = this.hasAttribute('dock')
    const mount = this.#resolveMount()
    // Default geometry — when no `x`/`y` attrs are set the panel reflows
    // to a Spotlight-style position above the bound editor on open(). The
    // values here are only meaningful at very first construct.
    this.#panel = createFloatingPanel({
      title: 'Add element  (⌘K)',
      x: Number.isFinite(x) ? x : 16,
      y: Number.isFinite(y) ? y : 16,
      width: dock ? undefined : 520,
      height: undefined,
      onClose: () => this.removeAttribute('open'),
      mount,
      dock,
    })
    this.#buildBody()
    // Docked panels are always-visible — the host's tab/rail layout owns
    // visibility. Floating panels respect the `open` attribute.
    if (dock || this.hasAttribute('open')) {
      if (!dock) this.#positionOverEditor()
      this.#panel.show()
    } else this.#panel.hide()
    this.#installGlobalHotkey()
    if (!dock) this.#installFocusToast()
    // Close ourselves whenever a *different* editor becomes active. Floating
    // only — docked panels stay where the host put them. (A TipTap doc with
    // multiple Boceto blocks can end up with several open floating palettes
    // stacked otherwise.)
    if (!dock) {
      this.#unsubActive = onActiveEditorChange((active) => {
        if (!this.hasAttribute('open')) return
        const target = this.#findTargetMaybe()
        if (active && target && active !== target) {
          this.removeAttribute('open')
        }
      })
    }
  }

  /** Resolve the `mount` attribute (an element id) into the DOM node the
   *  panel should attach to. Returns `null` when the attribute is unset OR
   *  when the id doesn't resolve — falls back to document.body. */
  #resolveMount(): HTMLElement | null {
    const id = this.getAttribute('mount')
    if (!id) return null
    return document.getElementById(id)
  }

  disconnectedCallback(): void {
    this.#panel?.dispose()
    this.#panel = null
    this.#cachedTarget = null
    if (this.#onGlobalKey) window.removeEventListener('keydown', this.#onGlobalKey, true)
    this.#onGlobalKey = null
    if (this.#onTargetFocus) {
      // Listener is on the target host; if the target is gone we just drop the ref.
      const target = this.#cachedTarget ?? this.#findTargetMaybe()
      target?.removeEventListener('focusin', this.#onTargetFocus, true)
    }
    this.#onTargetFocus = null
    this.#unsubActive?.()
    this.#unsubActive = null
    this.#toast?.remove()
    this.#toast = null
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#panel) return
    if (name === 'for') {
      this.#targetId = value
      this.#cachedTarget = null
    } else if (name === 'open') {
      if (value == null) this.#panel.hide()
      else {
        // Spotlight-style: re-anchor over the active editor every time
        // we open, then show. Authors who set explicit `x`/`y` attributes
        // get those instead.
        this.#positionOverEditor()
        this.#panel.show()
        // Focus the search input one microtask later so the show() repaint
        // has completed and the input is actually focusable.
        queueMicrotask(() => {
          this.#search?.focus()
          this.#search?.select()
        })
      }
    } else if (name === 'x' || name === 'y') {
      const v = numAttr(this, name, 16)
      this.#panel.el.style[name === 'x' ? 'left' : 'top'] = `${v}px`
    }
  }

  // ── Build the panel body ───────────────────────────────────────────────

  #buildBody(): void {
    if (!this.#panel) return
    const body = this.#panel.body

    // Search row — sticky so it stays visible while the grid scrolls.
    // The floating-panel body has `overflowY: auto`, which means sticky
    // top:0 here pins the search input flush with the body's top edge.
    const searchWrap = document.createElement('div')
    searchWrap.dataset.bocetoPanel = 'search-row'
    Object.assign(searchWrap.style, {
      position: 'sticky',
      top: '0',
      padding: '10px',
      background: '#fff',
      borderBottom: '1px solid #e4e4e7',
      zIndex: '1',
    } as CSSStyleDeclaration)
    this.#search = document.createElement('input')
    this.#search.type = 'search'
    this.#search.placeholder = 'Search 83 elements…'
    this.#search.dataset.bocetoPanel = 'search'
    Object.assign(this.#search.style, {
      width: '100%',
      boxSizing: 'border-box',
      padding: '6px 10px',
      border: '1px solid #d4d4d8',
      borderRadius: '6px',
      font: 'inherit',
      fontSize: '13px',
      outline: 'none',
    } as CSSStyleDeclaration)
    this.#search.addEventListener('input', () => this.#renderList())
    this.#search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.#search!.value) {
          this.#search!.value = ''
          this.#renderList()
        } else {
          this.removeAttribute('open')
        }
      }
    })
    searchWrap.appendChild(this.#search)
    body.appendChild(searchWrap)

    // Categorized list
    this.#list = document.createElement('div')
    this.#list.dataset.bocetoPanel = 'list'
    Object.assign(this.#list.style, {
      padding: '4px 0',
    } as CSSStyleDeclaration)
    body.appendChild(this.#list)
    this.#renderList()
  }

  #renderList(): void {
    if (!this.#list) return
    const query = (this.#search?.value ?? '').trim().toLowerCase()
    this.#list.replaceChildren()

    const filtered = query === ''

    // When the user has typed a query, drop category headers and show a
    // flat multi-column grid of matches (Spotlight-style). Otherwise show
    // each category as a header followed by a multi-column grid below it
    // — fewer vertical pixels than the old single-column list.
    if (filtered) {
      // Browse mode: category-grouped grids.
      for (const category of ELEMENT_CATALOG) {
        const header = document.createElement('div')
        header.dataset.bocetoPanel = 'category'
        header.textContent = category.name
        Object.assign(header.style, {
          padding: '10px 14px 4px',
          fontSize: '10.5px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#a1a1aa',
          fontWeight: '600',
        } as CSSStyleDeclaration)
        this.#list.appendChild(header)
        const grid = this.#newGrid()
        for (const entry of category.types) grid.appendChild(this.#makeItem(entry))
        this.#list.appendChild(grid)
      }
    } else {
      // Search mode: flat grid filtered by query.
      const matches = ELEMENT_CATALOG.flatMap((c) => c.types).filter((t) =>
        t.type.toLowerCase().includes(query),
      )
      if (matches.length === 0) {
        const empty = document.createElement('div')
        empty.textContent = `No matches for "${query}".`
        Object.assign(empty.style, {
          padding: '20px 14px',
          textAlign: 'center',
          color: '#71717a',
        } as CSSStyleDeclaration)
        this.#list.appendChild(empty)
        return
      }
      const grid = this.#newGrid()
      for (const entry of matches) grid.appendChild(this.#makeItem(entry))
      this.#list.appendChild(grid)
    }
  }

  /**
   * A CSS-grid container that wraps element-type buttons into multiple
   * compact columns. Column width is set so a 520px panel comfortably
   * fits 3–4 columns of element-type identifiers.
   */
  #newGrid(): HTMLDivElement {
    const grid = document.createElement('div')
    grid.dataset.bocetoPanel = 'grid'
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: '2px 6px',
      padding: '2px 10px 6px',
    } as CSSStyleDeclaration)
    return grid
  }

  #makeItem(entry: { type: ElementType; w: number; h: number; label?: string }): HTMLButtonElement {
    const row = document.createElement('button')
    row.type = 'button'
    row.dataset.bocetoPanel = 'item'
    row.dataset.elementType = entry.type
    row.draggable = true
    row.textContent = entry.type
    Object.assign(row.style, {
      display: 'block',
      width: '100%',
      padding: '4px 8px',
      background: 'transparent',
      border: '1px solid transparent',
      borderRadius: '4px',
      textAlign: 'left',
      font: 'inherit',
      fontSize: '12.5px',
      color: '#27272a',
      cursor: 'pointer',
      fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as CSSStyleDeclaration)
    row.addEventListener('mouseenter', () => {
      row.style.background = '#f4f4f5'
      row.style.borderColor = '#e4e4e7'
    })
    row.addEventListener('mouseleave', () => {
      row.style.background = 'transparent'
      row.style.borderColor = 'transparent'
    })
    row.addEventListener('click', () => this.#insertAtCanvasCenter(entry))
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('application/boceto-element-type', entry.type)
      e.dataTransfer?.setData('text/plain', entry.type)
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
    })
    return row
  }

  // ── Target binding + insertion ─────────────────────────────────────────

  #target(): BocetoEditElement | null {
    if (this.#cachedTarget?.isConnected) return this.#cachedTarget
    const id = this.getAttribute('for') ?? this.#targetId
    let target: HTMLElement | null = null
    if (id) target = document.getElementById(id)
    if (!target) {
      // Walk up to find an ancestor <boceto-edit>.
      let cur: HTMLElement | null = this.parentElement
      while (cur) {
        if (cur.tagName.toLowerCase() === 'boceto-edit') {
          target = cur
          break
        }
        cur = cur.parentElement
      }
    }
    if (!target) {
      // Last resort: first <boceto-edit> on the page.
      target = document.querySelector('boceto-edit') as HTMLElement | null
    }
    this.#cachedTarget = (target as BocetoEditElement | null) ?? null
    return this.#cachedTarget
  }

  #insertAtCanvasCenter(entry: { type: ElementType; w: number; h: number; label?: string }): void {
    const target = this.#target()
    if (!target?.editor) return
    const canvas = target.shadowRoot?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    // Place at the visual centre of the canvas in DOC coords. When the
    // editor is zoomed (fit="content"), divide canvas pixels by the
    // current zoom so the new element lands where the user sees the
    // middle of the viewport.
    const zoom = typeof target.getZoom === 'function' ? target.getZoom() || 1 : 1
    const docCenterX = canvas.width / 2 / zoom
    const docCenterY = canvas.height / 2 / zoom
    const x = Math.max(0, Math.round(docCenterX - entry.w / 2))
    const y = Math.max(0, Math.round(docCenterY - entry.h / 2))
    const id = target.editor.addElement(entry.type, x, y, {
      w: entry.w,
      h: entry.h,
      label: entry.label,
    })
    if (id) target.editor.select([id], 'replace')
    // Keep focus in the search so power users can keep adding.
    this.#search?.focus()
  }

  /**
   * Position the panel horizontally centered over the bound editor with a
   * top gutter. Only applies when no explicit `x` / `y` attributes were set
   * by the author — those take precedence and pin the panel in place.
   */
  #positionOverEditor(): void {
    if (!this.#panel) return
    if (this.hasAttribute('x') || this.hasAttribute('y')) return
    const target = this.#findTargetMaybe()
    const targetRect = target?.getBoundingClientRect()
    const panelW = this.#panel.el.offsetWidth || 520
    const padTop = numAttr(this, 'top-padding', 32)
    let cx: number
    let top: number
    if (targetRect && targetRect.width > 0) {
      cx = targetRect.left + targetRect.width / 2 - panelW / 2
      top = targetRect.top + padTop
    } else {
      // Fallback: viewport center.
      cx = (document.documentElement.clientWidth - panelW) / 2
      top = padTop
    }
    // Clamp to viewport.
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    const clampedX = Math.max(8, Math.min(cx, vw - panelW - 8))
    const clampedY = Math.max(8, Math.min(top, vh - 60))
    this.#panel.el.style.left = `${clampedX}px`
    this.#panel.el.style.top = `${clampedY}px`
  }

  // ── ⌘/Ctrl + K hotkey + focus toast ────────────────────────────────────

  #installGlobalHotkey(): void {
    this.#onGlobalKey = (e: KeyboardEvent) => {
      // Match ⌘K on Mac / Ctrl+K elsewhere. (Cmd+Space is Spotlight on
      // macOS, so we don't use that.) `e.code` would be `KeyK`; we also
      // accept `e.key === 'k' | 'K'` to be lenient about layouts.
      const isK = e.code === 'KeyK' || e.key === 'k' || e.key === 'K'
      if (!isK) return
      if (!(e.metaKey || e.ctrlKey)) return
      // Only act when our target editor exists on the page.
      const target = this.#findTargetMaybe()
      if (!target) return
      // Multi-editor scoping: when something has been marked active, only
      // the palette for the active editor responds. Single-editor pages
      // never call `setActiveEditor`, so `activeEditor == null` falls
      // through to the legacy "first palette on the page handles it"
      // behavior.
      const activeEditor = getActiveEditor()
      if (activeEditor != null && activeEditor !== target) return
      // Don't steal ⌘K while the user is typing into an input or
      // contenteditable elsewhere on the page (browsers may bind ⌘K to the
      // URL bar; preventDefault works there, but we still don't want to
      // hijack focused text fields).
      const active = document.activeElement as HTMLElement | null
      if (active && active !== document.body) {
        const tag = active.tagName.toLowerCase()
        const editable = (active as HTMLElement).isContentEditable
        const inOurPanel = !!this.#panel && (this.#panel.el === active || this.#panel.el.contains(active))
        const inThisCanvas = active === target || target.contains(active)
        if ((tag === 'input' || tag === 'textarea' || tag === 'select' || editable) && !inOurPanel && !inThisCanvas) {
          return
        }
      }
      e.preventDefault()
      // Toggle.
      if (this.hasAttribute('open')) this.removeAttribute('open')
      else this.setAttribute('open', '')
      this.#dismissToast()
    }
    window.addEventListener('keydown', this.#onGlobalKey, true)
  }

  /** Look up the target without forcing a fallback search-the-page. */
  #findTargetMaybe(): BocetoEditElement | null {
    const id = this.getAttribute('for') ?? this.#targetId
    if (id) return document.getElementById(id) as BocetoEditElement | null
    let cur: HTMLElement | null = this.parentElement
    while (cur) {
      if (cur.tagName.toLowerCase() === 'boceto-edit') return cur as BocetoEditElement
      cur = cur.parentElement
    }
    return (document.querySelector('boceto-edit') as BocetoEditElement | null) ?? null
  }

  #installFocusToast(): void {
    // Show a one-shot toast hint the first time the user focuses the
    // target editor (per page-session, gated by sessionStorage so it
    // doesn't nag on every reload).
    const storageKey = 'boceto:palette-toast-dismissed'
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(storageKey) === '1'
    } catch {
      // Storage may be disabled — fall through; we just won't persist.
    }
    if (dismissed) return
    const tryAttach = (): void => {
      const target = this.#findTargetMaybe()
      if (!target) {
        // Try again shortly — the editor may not have rendered yet.
        window.setTimeout(tryAttach, 80)
        return
      }
      this.#onTargetFocus = () => {
        if (this.hasAttribute('open')) return
        this.#showToast()
      }
      target.addEventListener('focusin', this.#onTargetFocus, true)
    }
    tryAttach()
  }

  #showToast(): void {
    if (this.#toast || this.hasAttribute('open')) return
    const isMac = /Mac|iPhone|iPad/.test(
      typeof navigator !== 'undefined' ? navigator.platform || '' : '',
    )
    const shortcut = isMac ? '⌘ K' : 'Ctrl K'
    const t = document.createElement('div')
    t.dataset.bocetoPanel = 'toast'
    t.textContent = `Press ${shortcut} to add elements`
    Object.assign(t.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30, 30, 46, 0.95)',
      color: '#fff',
      padding: '10px 16px',
      borderRadius: '999px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      fontWeight: '500',
      boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
      zIndex: '2147482500',
      opacity: '0',
      transition: 'opacity 200ms ease-out',
      cursor: 'pointer',
    } as CSSStyleDeclaration)
    t.addEventListener('click', () => this.#dismissToast())
    document.body.appendChild(t)
    this.#toast = t
    requestAnimationFrame(() => {
      if (this.#toast) this.#toast.style.opacity = '1'
    })
    // Auto-dismiss after ~4 seconds.
    window.setTimeout(() => this.#dismissToast(), 4000)
  }

  #dismissToast(): void {
    const t = this.#toast
    if (!t) return
    this.#toast = null
    t.style.opacity = '0'
    window.setTimeout(() => t.remove(), 220)
    try {
      sessionStorage.setItem('boceto:palette-toast-dismissed', '1')
    } catch {
      /* storage disabled */
    }
  }

  /**
   * Called by the editor's drop handler when a palette item is dropped onto
   * the canvas. Public so power users can wire alternate drop targets.
   */
  insertAt(type: ElementType, canvasX: number, canvasY: number): string | null {
    const target = this.#target()
    if (!target?.editor) return null
    const entry = ELEMENT_CATALOG.flatMap((c) => c.types).find((t) => t.type === type)
    const w = entry?.w ?? 120
    const h = entry?.h ?? 36
    const x = Math.max(0, Math.round(canvasX - w / 2))
    const y = Math.max(0, Math.round(canvasY - h / 2))
    const id = target.editor.addElement(type, x, y, {
      w,
      h,
      label: entry?.label,
    })
    if (id) target.editor.select([id], 'replace')
    return id
  }
}

function numAttr(el: HTMLElement, name: string, fallback: number): number {
  const v = el.getAttribute(name)
  if (v == null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export const PALETTE_TAG = 'boceto-palette'

export function defineBocetoPalette(tag = PALETTE_TAG): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, BocetoPaletteElement)
}
