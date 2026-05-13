/**
 * Floating context menu. Mounted in `document.body` (not in the editor's
 * shadow root) so it can overlap any surrounding container that clips its
 * children via `overflow: hidden`. Positioned with `position: fixed` in
 * viewport coordinates so it escapes ancestor stacking contexts cleanly.
 *
 * Theming hook: every node carries a `data-boceto-context-menu` attribute
 * (root, items, separators) — host pages can target these from light DOM
 * CSS. Class names are also exposed for shorter selectors.
 *
 * Click-outside, Escape, scroll, blur, and resize all close it.
 */

export interface ContextMenuItem {
  /** Display label. */
  label: string
  /** Optional right-side hint (e.g. keyboard shortcut). */
  hint?: string
  /** Click handler. */
  onSelect: () => void
  /** When true, render as a non-clickable separator instead. */
  separator?: boolean
  /** Disable click and dim the row. */
  disabled?: boolean
}

export interface ContextMenuHandle {
  el: HTMLDivElement
  open(x: number, y: number, items: ContextMenuItem[]): void
  close(): void
  /** Strip listeners + remove DOM. Call from `disconnectedCallback`. */
  dispose(): void
}

export function createContextMenu(
  mount: HTMLElement = document.body,
): ContextMenuHandle {
  const el = document.createElement('div')
  el.dataset.bocetoContextMenu = 'root'
  el.className = 'boceto-context-menu'
  Object.assign(el.style, {
    position: 'fixed',
    display: 'none',
    minWidth: '180px',
    padding: '4px 0',
    background: '#fff',
    border: '1px solid #d4d4d8',
    borderRadius: '6px',
    boxShadow: '0 6px 18px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    color: '#222',
    zIndex: '2147483000',
    userSelect: 'none',
  } as CSSStyleDeclaration)
  mount.appendChild(el)

  let isOpen = false

  function renderItems(items: ContextMenuItem[]): void {
    el.replaceChildren()
    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div')
        sep.dataset.bocetoContextMenu = 'separator'
        Object.assign(sep.style, {
          height: '1px',
          background: '#e4e4e7',
          margin: '4px 0',
        } as CSSStyleDeclaration)
        el.appendChild(sep)
        continue
      }
      const row = document.createElement('button')
      row.dataset.bocetoContextMenu = 'item'
      row.type = 'button'
      row.disabled = item.disabled === true
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        width: '100%',
        padding: '6px 14px',
        background: 'transparent',
        border: '0',
        textAlign: 'left',
        font: 'inherit',
        color: item.disabled ? '#a1a1aa' : 'inherit',
        cursor: item.disabled ? 'default' : 'pointer',
      } as CSSStyleDeclaration)
      const label = document.createElement('span')
      label.textContent = item.label
      row.appendChild(label)
      if (item.hint) {
        const hint = document.createElement('span')
        hint.textContent = item.hint
        Object.assign(hint.style, {
          color: '#71717a',
          fontSize: '11px',
          marginLeft: 'auto',
          letterSpacing: '0.02em',
        } as CSSStyleDeclaration)
        row.appendChild(hint)
      }
      if (!item.disabled) {
        row.addEventListener('mouseenter', () => {
          row.style.background = '#f4f4f5'
        })
        row.addEventListener('mouseleave', () => {
          row.style.background = 'transparent'
        })
        row.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          close()
          item.onSelect()
        })
      }
      el.appendChild(row)
    }
  }

  function open(x: number, y: number, items: ContextMenuItem[]): void {
    renderItems(items)
    el.style.display = 'block'
    // (x, y) are viewport coordinates (event.clientX/Y). `position: fixed`
    // anchors to the initial containing block, so use them directly.
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    queueMicrotask(() => {
      const menuRect = el.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const vh = document.documentElement.clientHeight
      let dx = 0
      let dy = 0
      if (menuRect.right > vw) dx = vw - menuRect.right - 8
      if (menuRect.bottom > vh) dy = vh - menuRect.bottom - 8
      if (dx || dy) {
        el.style.left = `${parseFloat(el.style.left) + dx}px`
        el.style.top = `${parseFloat(el.style.top) + dy}px`
      }
    })
    isOpen = true
    document.addEventListener('pointerdown', onOutsidePointer, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
  }

  function close(): void {
    if (!isOpen) return
    isOpen = false
    el.style.display = 'none'
    el.replaceChildren()
    document.removeEventListener('pointerdown', onOutsidePointer, true)
    document.removeEventListener('keydown', onKey, true)
    window.removeEventListener('blur', close)
    window.removeEventListener('resize', close)
    window.removeEventListener('scroll', close, true)
  }

  function onOutsidePointer(e: PointerEvent): void {
    const path = (e.composedPath?.() ?? []) as EventTarget[]
    if (path.includes(el)) return
    close()
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  function dispose(): void {
    close()
    el.remove()
  }

  return { el, open, close, dispose }
}
