import {
  CanvasRenderer,
  initYoga,
  pageContentBox,
  selectPage,
  type BocetoDoc,
  type ElementType,
} from '@boceto/core'
import { BocetoEditor } from './editor/editor'
import { createContextMenu, type ContextMenuHandle } from './editor/context-menu'
import { catalogEntry } from './editor/element-catalog'
import { bindCanvas } from './editor/interactions'
import { createInlineEditor } from './editor/inline-edit'
import { getActiveEditor, setActiveEditor } from './editor/active-editor'

const DEFAULT_W = 860
const DEFAULT_H = 600

/**
 * Singleton Yoga init — see `<boceto-view>` for the rationale.
 */
const yogaReady = initYoga()

/**
 * `<boceto-edit>` — interactive editor for Boceto wireframes.
 *
 * Architecture: this element is a thin DOM adapter around a framework-agnostic
 * `BocetoEditor` controller (accessible via `el.editor`). The controller owns
 * the doc, selection, and history; the element forwards pointer/keyboard
 * events into it and re-emits its events as DOM `CustomEvent`s.
 *
 * Attributes:
 *   - `code`     current DSL source (source of truth)
 *   - `src`      URL to fetch DSL source from
 *   - `width`    canvas pixel width (default 860)
 *   - `height`   canvas pixel height (default 600)
 *   - `page`     page id, name, or numeric index
 *   - `readonly` if present, mutations are suppressed
 *   - `mode`     reserved for forward compat (only `select` in v0.2)
 *   - `imports`  additional DSL source whose `component … end` definitions
 *               feed the parser before `code` is parsed. Use when editing
 *               one fence of a multi-fence doc and needing to resolve
 *               components defined elsewhere. Also settable via the
 *               `imports` JS property (preferred for large strings).
 *
 * Events (CustomEvent detail in parens):
 *   - `change`   ({ code, doc }) one per user-initiated commit
 *   - `select`   ({ ids })       selection changed
 *   - `page`     ({ pageId })    active page changed
 *
 * Power-user API:
 *   `el.editor` returns the underlying `BocetoEditor` instance.
 */
export class BocetoEditElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['code', 'src', 'width', 'height', 'page', 'readonly', 'mode', 'fit', 'imports']
  }

  #shadow: ShadowRoot
  #canvas: HTMLCanvasElement
  #renderer: CanvasRenderer
  #host: HTMLDivElement
  #editor: BocetoEditor
  #inline: ReturnType<typeof createInlineEditor> | null = null
  #contextMenu: ContextMenuHandle | null = null
  #unbind: (() => void) | null = null
  #paintScheduled = false
  #rubberBand: { x: number; y: number; w: number; h: number } | null = null
  #resizeObs: ResizeObserver | null = null
  #onPointerDownActive: ((e: PointerEvent) => void) | null = null
  #onFocusInActive: ((e: FocusEvent) => void) | null = null
  /** True once the host has been sized by CSS (any non-zero rect). After
   * that point, attribute changes to `width`/`height` are ignored in favour
   * of CSS-driven sizing — that's how authors get a resizable canvas. */
  #cssSized = false
  /** Current zoom factor (1 when `fit !== 'content'` or content fits). The
   * editor's pointer handler reads this via `getZoom()` so canvas-pixel
   * coords map back to doc coords. */
  #zoom = 1

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = `
      :host { display: block; position: relative; }
      .host {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: inherit;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
        outline: none;
      }
      .rubber {
        position: absolute;
        border: 1px dashed #6e9bd8;
        background: rgba(110,155,216,0.08);
        pointer-events: none;
      }
    `
    this.#shadow.appendChild(style)

    this.#host = document.createElement('div')
    this.#host.className = 'host'
    this.#host.setAttribute('part', 'host')
    this.#shadow.appendChild(this.#host)

    this.#canvas = document.createElement('canvas')
    this.#canvas.setAttribute('part', 'canvas')
    this.#canvas.tabIndex = 0
    this.#canvas.width = DEFAULT_W
    this.#canvas.height = DEFAULT_H
    this.#host.appendChild(this.#canvas)
    this.#renderer = new CanvasRenderer(this.#canvas)

    this.#editor = new BocetoEditor({
      code: '',
      readonly: this.hasAttribute('readonly'),
      imports: this.getAttribute('imports') ?? undefined,
    })
    this.#editor.on('change', () => this.#schedulePaint())
    this.#editor.on('select', () => {
      this.dispatchEvent(
        new CustomEvent('select', {
          detail: { ids: [...this.#editor.selection] },
          bubbles: true,
        }),
      )
      this.#schedulePaint()
    })
    this.#editor.on('page', (e) => {
      this.dispatchEvent(new CustomEvent('page', { detail: e, bubbles: true }))
    })
    // Forward `change` to the host AFTER the model is fully updated. Editor's
    // `change` fires from undo/redo and commits, never from external setCode.
    this.#editor.on('change', (e) =>
      this.dispatchEvent(
        new CustomEvent('change', { detail: { code: e.code }, bubbles: true }),
      ),
    )
  }

  // ── Public accessors ───────────────────────────────────────────────────

  /** Underlying controller. Use for programmatic mutation + subscription. */
  get editor(): BocetoEditor {
    return this.#editor
  }

  /** Latest parsed document. */
  get document(): BocetoDoc {
    return this.#editor.doc
  }

  /** Current DSL source. Mirrors the `code` attribute on read; setting writes through. */
  get code(): string {
    return this.#editor.code
  }
  set code(v: string) {
    this.setAttribute('code', v)
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async connectedCallback(): Promise<void> {
    await yogaReady
    // Initial source: explicit `code` > `src` fetch > slot textContent.
    const src = await this.#readInitialSource()
    if (src !== this.#editor.code) this.#editor.setCode(src)
    else this.#editor.relayout() // constructor's pass was a no-op before yoga loaded
    this.#applyDimsAttrs()
    this.#applyPageAttr()
    this.#bindInteractions()
    this.#observeResize()
    this.#bindActiveEditorTracking()
    this.#schedulePaint()
  }

  disconnectedCallback(): void {
    this.#unbind?.()
    this.#unbind = null
    this.#contextMenu?.dispose()
    this.#contextMenu = null
    this.#resizeObs?.disconnect()
    this.#resizeObs = null
    if (this.#onPointerDownActive) {
      this.removeEventListener('pointerdown', this.#onPointerDownActive, true)
      this.#onPointerDownActive = null
    }
    if (this.#onFocusInActive) {
      this.removeEventListener('focusin', this.#onFocusInActive, true)
      this.#onFocusInActive = null
    }
    // If we were the active editor on the page, clear the registry so
    // panels don't try to render against a detached host.
    if (getActiveEditor() === this) setActiveEditor(null)
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    // `readonly` is applied immediately — it can arrive before connect.
    if (name === 'readonly') {
      this.#editor.setReadonly(value !== null)
      return
    }
    // Other attrs only meaningful after we're in the DOM; connectedCallback
    // does the initial setup.
    if (!this.isConnected) return
    if (name === 'code') {
      const src = value ?? ''
      // Avoid re-parse if the change came from a commit we just emitted.
      if (src !== this.#editor.code) this.#editor.setCode(src)
      this.#schedulePaint()
    } else if (name === 'src') {
      void this.#refreshFromSrc()
    } else if (name === 'width' || name === 'height') {
      this.#applyDimsAttrs()
      this.#schedulePaint()
    } else if (name === 'page') {
      this.#applyPageAttr()
    } else if (name === 'imports') {
      this.#editor.setImports(value ?? undefined)
      this.#schedulePaint()
    }
  }

  /**
   * Imports source — component definitions to merge before parsing `code`.
   * Setting via property avoids attribute serialization for large strings.
   * Returns the attribute value when the property hasn't been set, so it
   * mirrors the `imports` attribute on read.
   */
  get imports(): string | null {
    return this.#editor.imports ?? null
  }
  set imports(v: string | null) {
    this.#editor.setImports(v ?? undefined)
    this.#schedulePaint()
  }

  // ── Internals ──────────────────────────────────────────────────────────

  async #readInitialSource(): Promise<string> {
    const code = this.getAttribute('code')
    if (code != null) return code
    const src = this.getAttribute('src')
    if (src) {
      try {
        const res = await fetch(src)
        if (res.ok) return await res.text()
      } catch {
        // swallow — fall through to textContent
      }
    }
    return this.textContent ?? ''
  }

  async #refreshFromSrc(): Promise<void> {
    if (this.hasAttribute('code')) return
    const src = await this.#readInitialSource()
    this.#editor.setCode(src)
    this.#schedulePaint()
  }

  /**
   * Apply the `width` / `height` *attributes* as a fallback initial size.
   * Once a `ResizeObserver` reports a non-zero CSS-laid-out size (host got
   * sized by stylesheet/layout), `#cssSized` flips and these attributes are
   * ignored — the canvas tracks the rendered size from then on. That lets
   * a host stretch the editor by resizing its container (e.g. CSS `resize:
   * both` on a wrapper).
   */
  #applyDimsAttrs(): void {
    if (this.#cssSized) return
    const w = numAttr(this, 'width', DEFAULT_W)
    const h = numAttr(this, 'height', DEFAULT_H)
    this.#applyCanvasSize(w, h)
  }

  #applyCanvasSize(w: number, h: number): void {
    const iw = Math.max(1, Math.round(w))
    const ih = Math.max(1, Math.round(h))
    if (this.#canvas.width !== iw) this.#canvas.width = iw
    if (this.#canvas.height !== ih) this.#canvas.height = ih
  }

  #observeResize(): void {
    if (this.#resizeObs) return
    if (typeof ResizeObserver === 'undefined') return
    this.#resizeObs = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      // Use the content-box: that's the area the canvas's CSS `width: 100%`
      // fills, so canvas pixel space matches what's rendered.
      const box = entry.contentBoxSize?.[0]
      const w = box ? box.inlineSize : entry.contentRect.width
      const h = box ? box.blockSize : entry.contentRect.height
      if (w < 1 || h < 1) return
      this.#cssSized = true
      this.#applyCanvasSize(w, h)
      this.#schedulePaint()
    })
    this.#resizeObs.observe(this.#canvas)
  }

  /**
   * Mark this editor as "active" (i.e. the most recently interacted with)
   * whenever the user clicks into its host or focus moves inside it.
   * Floating panels (`<boceto-palette>`, `<boceto-inspector>`) read this
   * to scope themselves to a single editor on multi-editor pages.
   *
   * We listen on the host element with capture=true so events from inside
   * the shadow root (the canvas) bubble up here first. Pointerdown covers
   * mouse/touch; focusin covers keyboard tab-in and inline-edit fields.
   */
  #bindActiveEditorTracking(): void {
    this.#onPointerDownActive = () => setActiveEditor(this)
    this.#onFocusInActive = () => setActiveEditor(this)
    this.addEventListener('pointerdown', this.#onPointerDownActive, true)
    this.addEventListener('focusin', this.#onFocusInActive, true)
  }

  #applyPageAttr(): void {
    const v = this.getAttribute('page')
    if (v == null) return
    const target: string | number = isNumeric(v) ? Number(v) : v
    this.#editor.setPage(target)
  }

  #bindInteractions(): void {
    if (this.#unbind) this.#unbind()
    this.#inline = createInlineEditor(this.#host, this.#canvas, this.#editor, () => this.#zoom)
    // Mount the menu in document.body so it escapes the editor's shadow root
    // and any surrounding container that clips children via `overflow: hidden`.
    this.#contextMenu ??= createContextMenu()
    this.#unbind = bindCanvas(this.#editor, this.#canvas, {
      onPaint: (extra) => {
        this.#rubberBand = extra?.rubberBand ?? null
        this.#schedulePaint()
      },
      onLabelEdit: (id) => this.#inline?.open(id),
      onContextMenu: (info) => this.#openContextMenu(info),
      onDrop: (info) => this.#dropElement(info),
      getZoom: () => this.#zoom,
      focusTarget: this.#canvas,
    })
  }

  /**
   * Drop handler for palette → canvas DnD. The dataTransfer carries the
   * element type; `<boceto-palette>` set it on `dragstart`. We look up the
   * type's default size from the catalog and insert at the drop point
   * (centered on the cursor).
   */
  #dropElement(info: { x: number; y: number; type: string }): void {
    const entry = catalogEntry(info.type as ElementType)
    const w = entry?.w ?? 120
    const h = entry?.h ?? 36
    const cx = Math.max(0, Math.round(info.x - w / 2))
    const cy = Math.max(0, Math.round(info.y - h / 2))
    const id = this.#editor.addElement(info.type as ElementType, cx, cy, {
      w,
      h,
      label: entry?.label,
    })
    if (id) this.#editor.select([id], 'replace')
  }

  #openContextMenu(info: { x: number; y: number; ids: string[] }): void {
    if (!this.#contextMenu) return
    const ed = this.#editor
    const meta = isMacLike() ? '⌘' : 'Ctrl'
    const shift = '⇧'
    const hasSelection = info.ids.length > 0
    this.#contextMenu.open(info.x, info.y, [
      {
        label: 'Bring to Front',
        hint: `${meta}${shift}]`,
        disabled: !hasSelection,
        onSelect: () => ed.bringToFront(info.ids),
      },
      {
        label: 'Bring Forward',
        hint: `${meta}]`,
        disabled: !hasSelection,
        onSelect: () => ed.bringForward(info.ids),
      },
      {
        label: 'Send Backward',
        hint: `${meta}[`,
        disabled: !hasSelection,
        onSelect: () => ed.sendBackward(info.ids),
      },
      {
        label: 'Send to Back',
        hint: `${meta}${shift}[`,
        disabled: !hasSelection,
        onSelect: () => ed.sendToBack(info.ids),
      },
      { label: '', separator: true, onSelect: () => undefined },
      {
        label: 'Duplicate',
        hint: `${meta}D`,
        disabled: !hasSelection,
        onSelect: () => ed.duplicateItems(info.ids),
      },
      {
        label: 'Delete',
        hint: 'Del',
        disabled: !hasSelection,
        onSelect: () => ed.removeItems(info.ids),
      },
    ])
  }

  #schedulePaint(): void {
    if (this.#paintScheduled) return
    this.#paintScheduled = true
    queueMicrotask(() => {
      this.#paintScheduled = false
      this.#paint()
    })
  }

  #paint(): void {
    // Compute zoom each paint when `fit="content"` so resizing the pane,
    // adding far-away elements, or undo/redo all stay in-frame.
    this.#zoom = this.#computeZoom()
    this.#editor.render(this.#renderer, this.#canvas.width, this.#canvas.height, {
      zoom: this.#zoom,
    })
    this.#updateRubberBand()
  }

  /** Current zoom factor (1 = no zoom). Surfaces it to interaction code so
   *  pointer events can be mapped back to doc coords. */
  getZoom(): number {
    return this.#zoom
  }

  #computeZoom(): number {
    if (this.getAttribute('fit') !== 'content') return 1
    const page = selectPage(this.#editor.doc, this.#editor.currentPageId)
    if (!page) return 1
    const bb = pageContentBox(page.elements)
    if (!bb) return 1
    const padding = numAttr(this, 'padding', 16)
    const needW = Math.max(1, bb.x + bb.w + padding)
    const needH = Math.max(1, bb.y + bb.h + padding)
    const fitW = this.#canvas.width / needW
    const fitH = this.#canvas.height / needH
    // Never zoom IN past 1.0 — small content shouldn't blow up.
    return Math.min(1, fitW, fitH)
  }

  #updateRubberBand(): void {
    let div = this.#shadow.querySelector('.rubber') as HTMLDivElement | null
    if (!this.#rubberBand) {
      div?.remove()
      return
    }
    const rect = this.#canvas.getBoundingClientRect()
    const hostRect = this.#host.getBoundingClientRect()
    const scaleX = rect.width / (this.#canvas.width || 1)
    const scaleY = rect.height / (this.#canvas.height || 1)
    if (!div) {
      div = document.createElement('div')
      div.className = 'rubber'
      div.setAttribute('part', 'rubber-band')
      this.#host.appendChild(div)
    }
    const z = this.#zoom
    div.style.left = `${rect.left - hostRect.left + this.#rubberBand.x * z * scaleX}px`
    div.style.top = `${rect.top - hostRect.top + this.#rubberBand.y * z * scaleY}px`
    div.style.width = `${this.#rubberBand.w * z * scaleX}px`
    div.style.height = `${this.#rubberBand.h * z * scaleY}px`
  }
}

function isMacLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const p = navigator.platform || ''
  return /Mac|iPhone|iPad/.test(p)
}

function numAttr(el: HTMLElement, name: string, fallback: number): number {
  const v = el.getAttribute(name)
  if (v == null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isNumeric(s: string): boolean {
  return s !== '' && !Number.isNaN(Number(s))
}

export const TAG = 'boceto-edit'

export function defineBocetoEdit(tag = TAG): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, BocetoEditElement)
}
