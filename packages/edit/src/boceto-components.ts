import type { BocetoEditElement } from './boceto-edit'
import type { BocetoEditor } from './editor/editor'
import type { ComponentSummary } from './editor/components'
import { createFloatingPanel, type FloatingPanelHandle } from './editor/floating-panel'
import { getActiveEditor, onActiveEditorChange } from './editor/active-editor'

/**
 * `<boceto-components>` — floating panel that lists every composite
 * component in scope for a `<boceto-edit>` and offers per-row actions:
 * instantiate, edit, find instances, delete (local) or preview + go-to-source
 * (imported).
 *
 * The panel is the **source of truth for "what components exist."** It keeps
 * a component visible even after every instance has been deleted — definitions
 * persist in `doc.components` and the user can re-instantiate from the panel.
 *
 * Mirrors `<boceto-palette>`'s binding logic: `for="<editor-id>"`, nested
 * inside a `<boceto-edit>`, or first-on-page as a last resort.
 *
 * Attributes:
 *   - `for`   id of the target `<boceto-edit>` element.
 *   - `x`,`y` initial top-left position (px). Defaults to top-left gutter.
 *   - `open`  boolean — when present, the panel is visible.
 */
export class BocetoComponentsElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['for', 'x', 'y', 'open']
  }

  #panel: FloatingPanelHandle | null = null
  #target: BocetoEditElement | null = null
  #unsubChange: (() => void) | null = null
  #unsubSelect: (() => void) | null = null
  #unsubPage: (() => void) | null = null
  #unsubActive: (() => void) | null = null
  #attachRetry: number | null = null
  #searchInput: HTMLInputElement | null = null
  #listEl: HTMLDivElement | null = null
  #editModeChip: HTMLDivElement | null = null

  connectedCallback(): void {
    if (this.#panel) return
    this.style.display = 'none'
    const x = numAttr(this, 'x', 16)
    const y = numAttr(this, 'y', 240)
    this.#panel = createFloatingPanel({
      title: 'Components',
      x,
      y,
      width: 320,
      onClose: () => this.removeAttribute('open'),
    })
    this.#buildBody()
    if (this.hasAttribute('open')) this.#panel.show()
    else this.#panel.hide()
    this.#attachToTarget()
    this.#unsubActive = onActiveEditorChange(() => {
      // When a different editor becomes active, re-bind so we follow the user.
      this.#detach()
      this.#attachToTarget()
    })
  }

  disconnectedCallback(): void {
    this.#detach()
    this.#panel?.dispose()
    this.#panel = null
    if (this.#attachRetry != null) clearTimeout(this.#attachRetry)
    this.#attachRetry = null
    this.#unsubActive?.()
    this.#unsubActive = null
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
        this.#renderList()
      }
    } else if (name === 'x' || name === 'y') {
      const v = numAttr(this, name, 16)
      this.#panel.el.style[name === 'x' ? 'left' : 'top'] = `${v}px`
    }
  }

  // ── Target binding ─────────────────────────────────────────────────────

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
      // Last-resort: prefer the active editor on the page.
      const active = getActiveEditor()
      if (active && active.tagName.toLowerCase() === 'boceto-edit') target = active
    }
    if (!target) target = document.querySelector('boceto-edit') as HTMLElement | null
    return (target as BocetoEditElement | null) ?? null
  }

  #attachToTarget(): void {
    const target = this.#findTarget()
    if (!target || !target.editor) {
      this.#attachRetry = window.setTimeout(() => this.#attachToTarget(), 60)
      return
    }
    this.#target = target
    const ed = target.editor
    this.#unsubChange = ed.on('change', () => this.#renderList())
    this.#unsubSelect = ed.on('select', () => this.#renderList())
    this.#unsubPage = ed.on('page', () => this.#renderList())
    this.#renderList()
  }

  #detach(): void {
    this.#unsubChange?.()
    this.#unsubSelect?.()
    this.#unsubPage?.()
    this.#unsubChange = null
    this.#unsubSelect = null
    this.#unsubPage = null
    this.#target = null
  }

  // ── Body construction ─────────────────────────────────────────────────

  #buildBody(): void {
    if (!this.#panel) return
    const body = this.#panel.body

    // Edit-mode breadcrumb (rendered when editingComponent != null).
    this.#editModeChip = document.createElement('div')
    this.#editModeChip.dataset.bocetoPanel = 'edit-mode-chip'
    Object.assign(this.#editModeChip.style, {
      display: 'none',
      padding: '8px 12px',
      background: '#fef3c7',
      borderBottom: '1px solid #fde68a',
      fontSize: '12px',
      color: '#854d0e',
      alignItems: 'center',
      gap: '8px',
    } as CSSStyleDeclaration)
    body.appendChild(this.#editModeChip)

    // Search + "+ New" header row.
    const headerRow = document.createElement('div')
    Object.assign(headerRow.style, {
      position: 'sticky',
      top: '0',
      background: '#fff',
      padding: '8px 10px',
      borderBottom: '1px solid #e4e4e7',
      display: 'flex',
      gap: '6px',
      zIndex: '1',
    } as CSSStyleDeclaration)
    this.#searchInput = document.createElement('input')
    this.#searchInput.type = 'search'
    this.#searchInput.placeholder = 'Search components…'
    Object.assign(this.#searchInput.style, {
      flex: '1',
      padding: '4px 8px',
      border: '1px solid #d4d4d8',
      borderRadius: '4px',
      font: 'inherit',
      fontSize: '12.5px',
      outline: 'none',
    } as CSSStyleDeclaration)
    this.#searchInput.addEventListener('input', () => this.#renderList())
    const newBtn = document.createElement('button')
    newBtn.type = 'button'
    newBtn.textContent = '+ New'
    Object.assign(newBtn.style, {
      padding: '4px 10px',
      border: '1px solid #4a90d9',
      background: '#4a90d9',
      color: '#fff',
      borderRadius: '4px',
      cursor: 'pointer',
      font: 'inherit',
      fontSize: '12px',
      whiteSpace: 'nowrap',
    } as CSSStyleDeclaration)
    newBtn.addEventListener('click', () => this.#openNewComponentForm())
    headerRow.append(this.#searchInput, newBtn)
    body.appendChild(headerRow)

    this.#listEl = document.createElement('div')
    Object.assign(this.#listEl.style, { padding: '4px 0' } as CSSStyleDeclaration)
    body.appendChild(this.#listEl)
  }

  // ── Render ────────────────────────────────────────────────────────────

  #renderList(): void {
    if (!this.#listEl || !this.#target?.editor) return
    const editor = this.#target.editor
    const list = editor.components()
    const query = (this.#searchInput?.value ?? '').trim().toLowerCase()
    const filtered = query
      ? list.filter((c) => c.name.toLowerCase().includes(query))
      : list

    this.#listEl.replaceChildren()
    this.#updateEditModeChip(editor)

    const local = filtered.filter((c) => c.origin === 'local')
    const imported = filtered.filter((c) => c.origin === 'imported')

    if (local.length === 0 && imported.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = query ? `No matches for "${query}".` : 'No components yet.'
      Object.assign(empty.style, {
        padding: '20px 14px',
        textAlign: 'center',
        color: '#a1a1aa',
        fontSize: '12px',
      } as CSSStyleDeclaration)
      this.#listEl.appendChild(empty)
      return
    }

    if (local.length > 0) {
      this.#listEl.appendChild(sectionHeader('Local'))
      for (const c of local) this.#listEl.appendChild(this.#renderRow(editor, c))
    }
    if (imported.length > 0) {
      this.#listEl.appendChild(sectionHeader('Available elsewhere'))
      for (const c of imported) this.#listEl.appendChild(this.#renderRow(editor, c))
    }
  }

  #updateEditModeChip(editor: BocetoEditor): void {
    if (!this.#editModeChip) return
    const name = editor.editingComponent
    if (!name) {
      this.#editModeChip.style.display = 'none'
      return
    }
    this.#editModeChip.replaceChildren()
    this.#editModeChip.style.display = 'flex'
    const label = document.createElement('span')
    label.textContent = `Editing: ${name}`
    label.style.flex = '1'
    label.style.fontWeight = '600'
    const exit = document.createElement('button')
    exit.type = 'button'
    exit.textContent = 'Done'
    Object.assign(exit.style, {
      padding: '2px 10px',
      border: '1px solid #ca8a04',
      background: '#fde68a',
      color: '#713f12',
      borderRadius: '999px',
      cursor: 'pointer',
      font: 'inherit',
      fontSize: '11px',
    } as CSSStyleDeclaration)
    exit.addEventListener('click', () => editor.exitComponentEditMode())
    this.#editModeChip.append(label, exit)
  }

  #renderRow(editor: BocetoEditor, c: ComponentSummary): HTMLElement {
    const row = document.createElement('div')
    Object.assign(row.style, {
      padding: '8px 12px',
      borderBottom: '1px solid #f4f4f5',
    } as CSSStyleDeclaration)

    const head = document.createElement('div')
    Object.assign(head.style, {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '8px',
      marginBottom: '4px',
    } as CSSStyleDeclaration)
    const nameEl = document.createElement('div')
    nameEl.textContent = `${c.name}(${c.params.join(', ')})`
    Object.assign(nameEl.style, {
      fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace',
      fontSize: '12.5px',
      color: '#27272a',
      flex: '1',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    } as CSSStyleDeclaration)
    const badge = document.createElement('span')
    badge.textContent = c.instanceCount === 0 ? 'unused' : `× ${c.instanceCount}`
    Object.assign(badge.style, {
      fontSize: '10.5px',
      color: c.instanceCount === 0 ? '#a1a1aa' : '#3f6212',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    } as CSSStyleDeclaration)
    head.append(nameEl, badge)
    row.appendChild(head)

    if (c.hint) {
      const hint = document.createElement('div')
      hint.textContent = c.hint
      Object.assign(hint.style, {
        fontSize: '11px',
        color: '#71717a',
        marginBottom: '6px',
      } as CSSStyleDeclaration)
      row.appendChild(hint)
    }

    const actions = document.createElement('div')
    Object.assign(actions.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
    } as CSSStyleDeclaration)

    if (c.origin === 'local') {
      actions.append(
        actionButton('Instantiate', () => this.#instantiate(editor, c)),
        actionButton('Edit', () => editor.enterComponentEditMode(c.name)),
        actionButton('Find', () => this.#findInstances(editor, c.name), c.instanceCount === 0),
        actionButton('Delete', () => this.#confirmDelete(editor, c)),
      )
    } else {
      actions.append(
        actionButton('Instantiate', () => this.#instantiate(editor, c)),
        actionButton('Go to source', () => this.#dispatchGotoDefinition(c)),
      )
    }
    row.appendChild(actions)
    return row
  }

  // ── Actions ────────────────────────────────────────────────────────────

  #instantiate(editor: BocetoEditor, c: ComponentSummary): void {
    // Insert at the canvas centre using the same coord math as the palette.
    const target = this.#target
    if (!target) return
    const canvas = target.shadowRoot?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const zoom = typeof target.getZoom === 'function' ? target.getZoom() || 1 : 1
    const w = 200
    const h = 120
    const cx = canvas.width / 2 / zoom
    const cy = canvas.height / 2 / zoom
    const x = Math.max(0, Math.round(cx - w / 2))
    const y = Math.max(0, Math.round(cy - h / 2))
    const id = editor.addInstance(c.name, x, y, { w, h })
    if (id) editor.select([id], 'replace')
  }

  #findInstances(editor: BocetoEditor, name: string): void {
    const ids = editor.instances(name).map((i) => i.id)
    if (ids.length > 0) editor.select(ids, 'replace')
  }

  #confirmDelete(editor: BocetoEditor, c: ComponentSummary): void {
    if (c.instanceCount > 0) {
      const ok = window.confirm(
        `Delete component "${c.name}"? ${c.instanceCount} instance(s) will be removed too.`,
      )
      if (!ok) return
      editor.deleteComponent(c.name, { deleteInstances: true })
    } else {
      editor.deleteComponent(c.name)
    }
  }

  #dispatchGotoDefinition(c: ComponentSummary): void {
    this.#target?.dispatchEvent(
      new CustomEvent('gotodefinition', {
        detail: { componentName: c.name, origin: 'imported', hint: c.hint },
        bubbles: true,
        composed: true,
      }),
    )
  }

  // ── New component inline form ─────────────────────────────────────────

  #openNewComponentForm(): void {
    if (!this.#target?.editor || !this.#listEl) return
    // Reuse the listEl area: prepend an inline form, render below.
    const form = document.createElement('form')
    Object.assign(form.style, {
      padding: '10px 12px',
      background: '#f9fafb',
      borderBottom: '1px solid #e4e4e7',
      display: 'grid',
      gap: '6px',
    } as CSSStyleDeclaration)
    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.placeholder = 'name (kebab-case)'
    nameInput.required = true
    styleField(nameInput)
    const paramsInput = document.createElement('input')
    paramsInput.type = 'text'
    paramsInput.placeholder = 'params (comma-separated, optional)'
    styleField(paramsInput)
    const row = document.createElement('div')
    Object.assign(row.style, { display: 'flex', gap: '6px', justifyContent: 'flex-end' } as CSSStyleDeclaration)
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = 'Cancel'
    styleSecondaryBtn(cancel)
    const create = document.createElement('button')
    create.type = 'submit'
    create.textContent = 'Create'
    stylePrimaryBtn(create)
    row.append(cancel, create)
    form.append(nameInput, paramsInput, row)
    this.#listEl.replaceChildren(form)

    queueMicrotask(() => nameInput.focus())

    cancel.addEventListener('click', () => this.#renderList())
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const name = nameInput.value.trim()
      if (!name) return
      const params = paramsInput.value
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
      try {
        const c = this.#target!.editor.createComponent({ name, params })
        // Jump straight into editing the body.
        this.#target!.editor.enterComponentEditMode(c.name)
      } catch (err) {
        window.alert((err as Error).message ?? String(err))
      }
    })
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function sectionHeader(text: string): HTMLDivElement {
  const h = document.createElement('div')
  h.textContent = text
  Object.assign(h.style, {
    padding: '8px 12px 4px',
    fontSize: '10.5px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#a1a1aa',
    fontWeight: '600',
  } as CSSStyleDeclaration)
  return h
}

function actionButton(label: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = label
  b.disabled = disabled
  Object.assign(b.style, {
    padding: '3px 8px',
    border: '1px solid #d4d4d8',
    background: '#fff',
    borderRadius: '4px',
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#a1a1aa' : '#27272a',
    font: 'inherit',
    fontSize: '11.5px',
  } as CSSStyleDeclaration)
  if (!disabled) {
    b.addEventListener('mouseenter', () => (b.style.background = '#f4f4f5'))
    b.addEventListener('mouseleave', () => (b.style.background = '#fff'))
    b.addEventListener('click', onClick)
  }
  return b
}

function styleField(el: HTMLInputElement): void {
  Object.assign(el.style, {
    width: '100%',
    boxSizing: 'border-box',
    padding: '5px 8px',
    border: '1px solid #d4d4d8',
    borderRadius: '4px',
    font: 'inherit',
    fontSize: '12.5px',
    outline: 'none',
    background: '#fff',
  } as CSSStyleDeclaration)
}

function stylePrimaryBtn(el: HTMLButtonElement): void {
  Object.assign(el.style, {
    padding: '4px 10px',
    border: '1px solid #4a90d9',
    background: '#4a90d9',
    color: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '12px',
  } as CSSStyleDeclaration)
}

function styleSecondaryBtn(el: HTMLButtonElement): void {
  Object.assign(el.style, {
    padding: '4px 10px',
    border: '1px solid #d4d4d8',
    background: '#fff',
    color: '#27272a',
    borderRadius: '4px',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '12px',
  } as CSSStyleDeclaration)
}

function numAttr(el: HTMLElement, name: string, fallback: number): number {
  const v = el.getAttribute(name)
  if (v == null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export const COMPONENTS_TAG = 'boceto-components'

export function defineBocetoComponents(tag = COMPONENTS_TAG): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, BocetoComponentsElement)
}
