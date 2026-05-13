import type { AttrValue, Element } from '@boceto/core'
import type { BocetoEditElement } from './boceto-edit'
import { attrsFor, type AttrKind, type AttrSpec } from './editor/element-attrs'
import { createFloatingPanel, type FloatingPanelHandle } from './editor/floating-panel'

/**
 * `<boceto-inspector>` — floating draggable properties panel for the
 * current selection of a `<boceto-edit>`. Auto-shows when a single item is
 * selected and renders editable inputs for label, x/y/w/h, font size,
 * overflow / textAlign / minFontSize, plus the element's full attr bag.
 *
 * Binding works exactly like `<boceto-palette>`: by `for="<editor-id>"`,
 * by nesting inside `<boceto-edit>`, or as a last-resort first-on-page.
 *
 * Attributes:
 *   - `for`     id of the target `<boceto-edit>` element.
 *   - `x`, `y`  initial position; defaults to top-right gutter.
 *   - `auto`    boolean — when present (default), the inspector shows on
 *               selection and hides when the selection is empty. Remove
 *               this attribute to control visibility via the `open`
 *               attribute manually.
 *   - `open`    boolean — explicit visibility toggle.
 */
export class BocetoInspectorElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['for', 'x', 'y', 'auto', 'open']
  }

  #panel: FloatingPanelHandle | null = null
  #body: HTMLDivElement | null = null
  #target: BocetoEditElement | null = null
  #unsubSelect: (() => void) | null = null
  #unsubChange: (() => void) | null = null
  #attachRetry: number | null = null

  connectedCallback(): void {
    if (this.#panel) return
    this.style.display = 'none'
    const x = numAttr(this, 'x', Math.max(16, window.innerWidth - 320))
    const y = numAttr(this, 'y', 120)
    this.#panel = createFloatingPanel({
      title: 'Inspector',
      x,
      y,
      width: 300,
      onClose: () => this.removeAttribute('open'),
    })
    this.#body = this.#panel.body
    this.#panel.hide()
    this.#attachToTarget()
  }

  disconnectedCallback(): void {
    this.#detach()
    this.#panel?.dispose()
    this.#panel = null
    if (this.#attachRetry != null) clearTimeout(this.#attachRetry)
    this.#attachRetry = null
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#panel) return
    if (name === 'for') {
      this.#detach()
      this.#attachToTarget()
    } else if (name === 'open') {
      if (value == null) this.#panel.hide()
      else {
        this.#panel.show()
        this.#render()
      }
    } else if (name === 'x' || name === 'y') {
      const v = numAttr(this, name, 16)
      this.#panel.el.style[name === 'x' ? 'left' : 'top'] = `${v}px`
    }
  }

  // ── Editor binding ─────────────────────────────────────────────────────

  #findTarget(): BocetoEditElement | null {
    const id = this.getAttribute('for')
    let target: HTMLElement | null = null
    if (id) target = document.getElementById(id)
    if (!target) {
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
      target = document.querySelector('boceto-edit') as HTMLElement | null
    }
    return (target as BocetoEditElement | null) ?? null
  }

  #attachToTarget(): void {
    const target = this.#findTarget()
    // The editor may not have upgraded yet (no `.editor` property). Retry.
    if (!target || !target.editor) {
      this.#attachRetry = window.setTimeout(() => this.#attachToTarget(), 60)
      return
    }
    this.#target = target
    this.#unsubSelect = target.editor.on('select', () => this.#onSelectionChange())
    this.#unsubChange = target.editor.on('change', () => {
      if (this.#panel?.isVisible()) this.#render()
    })
    this.#onSelectionChange()
  }

  #detach(): void {
    this.#unsubSelect?.()
    this.#unsubChange?.()
    this.#unsubSelect = null
    this.#unsubChange = null
    this.#target = null
  }

  #onSelectionChange(): void {
    if (!this.#target || !this.#panel) return
    const ids = [...this.#target.editor.selection]
    const auto = this.getAttribute('auto') !== null || !this.hasAttribute('auto') // default-on
    if (ids.length === 0) {
      if (auto) this.#panel.hide()
      else this.#render()
      return
    }
    if (auto) this.#panel.show()
    this.#render()
  }

  // ── Render ─────────────────────────────────────────────────────────────

  #render(): void {
    if (!this.#body || !this.#target) return
    const editor = this.#target.editor
    const ids = [...editor.selection]
    this.#body.replaceChildren()

    if (ids.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'Nothing selected.'
      Object.assign(empty.style, {
        padding: '20px 14px',
        color: '#a1a1aa',
        textAlign: 'center',
      } as CSSStyleDeclaration)
      this.#body.appendChild(empty)
      return
    }
    if (ids.length > 1) {
      const multi = document.createElement('div')
      multi.textContent = `${ids.length} items selected.`
      Object.assign(multi.style, {
        padding: '20px 14px',
        color: '#a1a1aa',
        textAlign: 'center',
      } as CSSStyleDeclaration)
      this.#body.appendChild(multi)
      return
    }

    const item = editor.findItem(ids[0]!)
    if (!item) return
    // We only fully edit `Element` for v1. Flex containers / composites
    // are show-only.
    const isElement = !('kind' in item)
    const el = item as Element
    const sectionCommon = section('Common')
    addRow(sectionCommon, 'ID', plainText(el.id))
    addRow(
      sectionCommon,
      'Type',
      plainText((item as { type?: string }).type ?? (item as { kind?: string }).kind ?? '—'),
    )
    if (isElement) {
      addRow(
        sectionCommon,
        'Label',
        textInput(el.label ?? '', (v) => editor.setLabel(el.id, v)),
      )
    }
    this.#body.appendChild(sectionCommon)

    if (isElement) {
      const sectionGeo = section('Geometry')
      addRow(
        sectionGeo,
        'X',
        numberInput(el.x, (v) => {
          const dx = v - el.x
          if (dx !== 0) editor.move([el.id], dx, 0)
        }),
      )
      addRow(
        sectionGeo,
        'Y',
        numberInput(el.y, (v) => {
          const dy = v - el.y
          if (dy !== 0) editor.move([el.id], 0, dy)
        }),
      )
      addRow(
        sectionGeo,
        'W',
        numberInput(el.w, (v) => {
          if (v === el.w) return
          editor.resize(el.id, 'e', v - el.w, 0, { x: el.x, y: el.y, w: el.w, h: el.h })
        }),
      )
      addRow(
        sectionGeo,
        'H',
        numberInput(el.h, (v) => {
          if (v === el.h) return
          editor.resize(el.id, 's', 0, v - el.h, { x: el.x, y: el.y, w: el.w, h: el.h })
        }),
      )
      this.#body.appendChild(sectionGeo)

      const sectionText = section('Text')
      addRow(
        sectionText,
        'fontSize',
        numberInput(
          numericAttr(el.attrs.fontSize, defaultFontSize(el.type)),
          (v) => editor.setAttr(el.id, 'fontSize', v),
        ),
      )
      addRow(
        sectionText,
        'overflow',
        selectInput(
          asString(el.attrs.overflow) ?? '',
          ['', 'ellipsis', 'wrap', 'clip', 'shrink'],
          (v) => editor.setAttr(el.id, 'overflow', v === '' ? undefined : v),
        ),
      )
      addRow(
        sectionText,
        'textAlign',
        selectInput(
          asString(el.attrs.textAlign) ?? '',
          ['', 'left', 'center', 'right'],
          (v) => editor.setAttr(el.id, 'textAlign', v === '' ? undefined : v),
        ),
      )
      this.#body.appendChild(sectionText)

      // ── Element-specific attrs (schema-driven) ──────────────────────
      const schema = attrsFor(el.type)
      const handledKeys = new Set<string>([
        'fontSize',
        'overflow',
        'textAlign',
        'minFontSize',
        ...schema.map((s) => s.key),
      ])

      if (schema.length > 0) {
        const sectionType = section(`${el.type} attrs`)
        for (const spec of schema) {
          addRow(
            sectionType,
            spec.key,
            renderSchemaInput(spec, el.attrs[spec.key], (v) =>
              editor.setAttr(el.id, spec.key, v),
            ),
          )
        }
        this.#body.appendChild(sectionType)
      }

      // Remaining attrs in a free-form table (whatever the schema didn't
      // claim — e.g. `border`, `shadow`, ad-hoc data-* keys).
      const generic = Object.entries(el.attrs).filter(([k]) => !handledKeys.has(k))
      if (generic.length > 0) {
        const sectionAttrs = section('Other attrs')
        for (const [k, v] of generic) {
          addRow(
            sectionAttrs,
            k,
            textInput(String(v), (nv) =>
              editor.setAttr(el.id, k, nv === '' ? undefined : maybeNumber(nv)),
            ),
          )
        }
        this.#body.appendChild(sectionAttrs)
      }
    }
  }
}

// ─── helpers ────────────────────────────────────────────────────────────

function section(title: string): HTMLDivElement {
  const sec = document.createElement('div')
  sec.dataset.bocetoPanel = 'inspector-section'
  Object.assign(sec.style, {
    padding: '8px 14px 12px',
    borderBottom: '1px solid #f4f4f5',
  } as CSSStyleDeclaration)
  const h = document.createElement('div')
  h.textContent = title
  Object.assign(h.style, {
    fontSize: '10.5px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#a1a1aa',
    fontWeight: '600',
    marginBottom: '6px',
  } as CSSStyleDeclaration)
  sec.appendChild(h)
  return sec
}

function addRow(parent: HTMLElement, label: string, control: Node): void {
  const row = document.createElement('label')
  Object.assign(row.style, {
    display: 'grid',
    gridTemplateColumns: '80px 1fr',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '12.5px',
  } as CSSStyleDeclaration)
  const l = document.createElement('span')
  l.textContent = label
  l.style.color = '#52525b'
  row.append(l, control)
  parent.appendChild(row)
}

function plainText(s: string): HTMLSpanElement {
  const el = document.createElement('span')
  el.textContent = s
  el.style.color = '#3f3f46'
  el.style.fontFamily = 'ui-monospace, SF Mono, Menlo, Consolas, monospace'
  el.style.fontSize = '12px'
  return el
}

function textInput(value: string, onCommit: (v: string) => void): HTMLInputElement {
  const i = document.createElement('input')
  i.type = 'text'
  i.value = value
  styleField(i)
  i.addEventListener('change', () => onCommit(i.value))
  return i
}

function numberInput(value: number, onCommit: (v: number) => void): HTMLInputElement {
  const i = document.createElement('input')
  i.type = 'number'
  i.value = String(value)
  styleField(i)
  i.addEventListener('change', () => {
    const n = Number(i.value)
    if (Number.isFinite(n)) onCommit(n)
  })
  return i
}

function selectInput(
  value: string,
  options: string[],
  onCommit: (v: string) => void,
): HTMLSelectElement {
  const s = document.createElement('select')
  styleField(s)
  for (const opt of options) {
    const o = document.createElement('option')
    o.value = opt
    o.textContent = opt === '' ? '(default)' : opt
    if (opt === value) o.selected = true
    s.appendChild(o)
  }
  s.addEventListener('change', () => onCommit(s.value))
  return s
}

function colorInput(value: string, onCommit: (v: string) => void): HTMLInputElement {
  const c = document.createElement('input')
  c.type = 'color'
  c.value = value || '#cccccc'
  Object.assign(c.style, {
    width: '36px',
    height: '24px',
    border: '1px solid #d4d4d8',
    borderRadius: '4px',
    padding: '0',
    cursor: 'pointer',
    background: '#fff',
  } as CSSStyleDeclaration)
  c.addEventListener('change', () => onCommit(c.value))
  return c
}

function boolInput(value: boolean, onCommit: (v: boolean) => void): HTMLInputElement {
  const c = document.createElement('input')
  c.type = 'checkbox'
  c.checked = value
  Object.assign(c.style, {
    width: '16px',
    height: '16px',
    margin: '0',
    cursor: 'pointer',
  } as CSSStyleDeclaration)
  c.addEventListener('change', () => onCommit(c.checked))
  return c
}

/**
 * Render an input element for a single AttrSpec. The caller threads commit
 * back through `editor.setAttr(id, key, value)` — pass `undefined` to clear.
 */
function renderSchemaInput(
  spec: AttrSpec,
  current: AttrValue | undefined,
  onCommit: (v: AttrValue | undefined) => void,
): Node {
  switch (spec.kind as AttrKind) {
    case 'number': {
      const v = numericAttr(current, typeof spec.default === 'number' ? spec.default : 0)
      return numberInput(v, (n) => onCommit(n))
    }
    case 'enum': {
      const enums = spec.enum ?? []
      const v = asString(current) ?? (spec.default != null ? String(spec.default) : '')
      return selectInput(v, ['', ...enums], (nv) => onCommit(nv === '' ? undefined : nv))
    }
    case 'bool': {
      const s = asString(current) ?? (spec.default != null ? String(spec.default) : 'false')
      const v = s === 'true' || s === '1'
      return boolInput(v, (nv) => onCommit(nv ? 'true' : 'false'))
    }
    case 'color': {
      const v = asString(current) ?? (spec.default != null ? String(spec.default) : '')
      return colorInput(v, (nv) => onCommit(nv))
    }
    case 'pipe-list':
    case 'comma-list':
    case 'string':
    default: {
      const v = asString(current) ?? (spec.default != null ? String(spec.default) : '')
      const input = textInput(v, (nv) => onCommit(nv === '' ? undefined : nv))
      if (spec.hint) input.title = spec.hint
      return input
    }
  }
}

function styleField(el: HTMLInputElement | HTMLSelectElement): void {
  Object.assign(el.style, {
    width: '100%',
    boxSizing: 'border-box',
    padding: '4px 6px',
    border: '1px solid #d4d4d8',
    borderRadius: '4px',
    font: 'inherit',
    fontSize: '12.5px',
    outline: 'none',
    background: '#fff',
  } as CSSStyleDeclaration)
  el.addEventListener('focus', () => {
    el.style.borderColor = '#4a90d9'
  })
  el.addEventListener('blur', () => {
    el.style.borderColor = '#d4d4d8'
  })
}

function asString(v: AttrValue | undefined): string | undefined {
  if (v == null) return undefined
  return String(v)
}

function numericAttr(v: AttrValue | undefined, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function maybeNumber(v: string): AttrValue {
  if (v === '') return v
  const n = Number(v)
  if (v.match(/^-?\d+(\.\d+)?$/) && Number.isFinite(n)) return n
  return v
}

function defaultFontSize(type: string): number {
  if (type === 'heading') return 22
  if (type === 'label') return 15
  return 13
}

function numAttr(el: HTMLElement, name: string, fallback: number): number {
  const v = el.getAttribute(name)
  if (v == null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export const INSPECTOR_TAG = 'boceto-inspector'

export function defineBocetoInspector(tag = INSPECTOR_TAG): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, BocetoInspectorElement)
}
