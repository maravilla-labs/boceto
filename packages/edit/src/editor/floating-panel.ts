/**
 * Floating draggable panel — the visual chassis for `<boceto-palette>` and
 * `<boceto-inspector>`. Mounts in `document.body` with `position: fixed` so
 * it escapes the editor's bounds, comes with a drag handle, an optional
 * close button, and minimal sketch-aligned styling.
 *
 * Theming: every node carries a `data-boceto-panel="…"` attribute so host
 * pages can override the defaults from light-DOM CSS.
 */

export interface FloatingPanelOptions {
  title: string
  /** Initial position in viewport pixels. */
  x?: number
  y?: number
  /** Initial width / height of the panel. Width defaults to 280. */
  width?: number
  height?: number
  /** Called when the user closes the panel via the × button. */
  onClose?: () => void
}

export interface FloatingPanelHandle {
  /** The outer panel element. */
  el: HTMLDivElement
  /** Header strip (drag handle). Title text lives here. */
  header: HTMLDivElement
  /** The scrollable body where callers append their controls. */
  body: HTMLDivElement
  show(): void
  hide(): void
  isVisible(): boolean
  dispose(): void
}

export function createFloatingPanel(opts: FloatingPanelOptions): FloatingPanelHandle {
  const root = document.createElement('div')
  root.dataset.bocetoPanel = 'root'
  Object.assign(root.style, {
    position: 'fixed',
    left: `${opts.x ?? 16}px`,
    top: `${opts.y ?? 16}px`,
    width: `${opts.width ?? 280}px`,
    maxHeight: opts.height ? `${opts.height}px` : '80vh',
    background: '#fff',
    border: '1px solid #d4d4d8',
    borderRadius: '8px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    color: '#222',
    zIndex: '2147482000',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    userSelect: 'none',
  } as CSSStyleDeclaration)

  const header = document.createElement('div')
  header.dataset.bocetoPanel = 'header'
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderBottom: '1px solid #e4e4e7',
    background: '#fafafa',
    cursor: 'grab',
    fontSize: '12px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#52525b',
    fontWeight: '600',
  } as CSSStyleDeclaration)

  const grip = document.createElement('span')
  grip.dataset.bocetoPanel = 'grip'
  grip.textContent = '⋮⋮'
  Object.assign(grip.style, { color: '#a1a1aa', letterSpacing: '-3px' } as CSSStyleDeclaration)
  header.appendChild(grip)

  const titleEl = document.createElement('span')
  titleEl.dataset.bocetoPanel = 'title'
  titleEl.textContent = opts.title
  titleEl.style.flex = '1'
  header.appendChild(titleEl)

  if (opts.onClose) {
    const close = document.createElement('button')
    close.dataset.bocetoPanel = 'close'
    close.type = 'button'
    close.textContent = '×'
    Object.assign(close.style, {
      width: '22px',
      height: '22px',
      border: '0',
      background: 'transparent',
      color: '#71717a',
      fontSize: '16px',
      lineHeight: '1',
      cursor: 'pointer',
      borderRadius: '4px',
    } as CSSStyleDeclaration)
    close.addEventListener('mouseenter', () => (close.style.background = '#f4f4f5'))
    close.addEventListener('mouseleave', () => (close.style.background = 'transparent'))
    close.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      opts.onClose?.()
    })
    header.appendChild(close)
  }

  const body = document.createElement('div')
  body.dataset.bocetoPanel = 'body'
  Object.assign(body.style, {
    // No top padding: callers may use `position: sticky; top: 0` on the
    // first child to keep it pinned (e.g. the palette's search row). A
    // top padding here would cause the sticky child to "slide up" by the
    // padding amount before sticking, which looks like a 1-frame jolt.
    padding: '0 0 8px 0',
    overflowY: 'auto',
    flex: '1 1 auto',
    minHeight: '0',
    // Don't chain scroll to the page underneath when the body reaches its
    // top or bottom edge.
    overscrollBehavior: 'contain',
  } as CSSStyleDeclaration)

  root.append(header, body)
  document.body.appendChild(root)

  // ── Drag-to-move on the header ────────────────────────────────────────
  let dragging = false
  let pid = -1
  let originX = 0
  let originY = 0
  let panelOriginX = 0
  let panelOriginY = 0
  header.addEventListener('pointerdown', (e) => {
    if (e.target !== header && (e.target as HTMLElement).dataset.bocetoPanel !== 'grip' && (e.target as HTMLElement).dataset.bocetoPanel !== 'title') {
      return // clicks on the close button don't drag
    }
    dragging = true
    pid = e.pointerId
    originX = e.clientX
    originY = e.clientY
    const rect = root.getBoundingClientRect()
    panelOriginX = rect.left
    panelOriginY = rect.top
    header.setPointerCapture(e.pointerId)
    header.style.cursor = 'grabbing'
    e.preventDefault()
  })
  header.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return
    const dx = e.clientX - originX
    const dy = e.clientY - originY
    const next = clampToViewport(panelOriginX + dx, panelOriginY + dy, root)
    root.style.left = `${next.x}px`
    root.style.top = `${next.y}px`
  })
  function endDrag(e: PointerEvent): void {
    if (!dragging || e.pointerId !== pid) return
    dragging = false
    try {
      header.releasePointerCapture(pid)
    } catch {
      /* jsdom no-op */
    }
    header.style.cursor = 'grab'
  }
  header.addEventListener('pointerup', endDrag)
  header.addEventListener('pointercancel', endDrag)

  let visible = true

  return {
    el: root,
    header,
    body,
    show(): void {
      if (visible) return
      visible = true
      root.style.display = 'flex'
    },
    hide(): void {
      if (!visible) return
      visible = false
      root.style.display = 'none'
    },
    isVisible(): boolean {
      return visible
    },
    dispose(): void {
      root.remove()
    },
  }
}

function clampToViewport(
  x: number,
  y: number,
  el: HTMLElement,
): { x: number; y: number } {
  const w = el.offsetWidth
  const h = el.offsetHeight
  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight
  const clampedX = Math.max(4, Math.min(x, vw - w - 4))
  const clampedY = Math.max(4, Math.min(y, vh - h - 4))
  return { x: clampedX, y: clampedY }
}
