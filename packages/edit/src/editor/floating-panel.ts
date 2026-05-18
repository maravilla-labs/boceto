/**
 * Floating draggable panel — the visual chassis for `<boceto-palette>`,
 * `<boceto-inspector>`, and `<boceto-components>`. Two modes:
 *
 *  - **Floating** (default): `position: fixed`, mounted in `document.body`,
 *    drag-handle header, optional close button. Use when the host wants the
 *    classic "popover anywhere" UX.
 *  - **Docked**: `position: static`, mounted into a host-supplied container
 *    (`opts.mount`), no drag, no shadow, fills the parent width. Use when
 *    the host has its own panel layout (Photoshop-style tabs, a permanent
 *    sidebar, …) and just wants the panel content inside their rail.
 *
 * Theming: every node carries a `data-boceto-panel="…"` attribute so host
 * pages can override the defaults from light-DOM CSS. Docked mode also
 * adds `data-boceto-panel-mode="dock"` on the root for targeted styling.
 */

export interface FloatingPanelOptions {
  title: string
  /** Initial position in viewport pixels. Floating mode only. */
  x?: number
  y?: number
  /** Initial width / height of the panel. Width defaults to 280 in
   *  floating mode, '100%' in docked mode. */
  width?: number
  height?: number
  /** Called when the user closes the panel via the × button. Omit in
   *  docked mode if the close button shouldn't appear at all. */
  onClose?: () => void
  /**
   * DOM node to mount the panel into. Defaults to `document.body`, which
   * is what floating mode wants. Pass a host-supplied container to dock
   * the panel inside the host's layout — typically combined with
   * `dock: true` to drop the floating chrome.
   */
  mount?: HTMLElement | null
  /**
   * Docked layout — drops `position: fixed`, the drag handle, the shadow,
   * and the rounded border. The panel becomes a block element that flows
   * naturally inside its parent. Pair with `mount` so the panel lands in
   * a host-controlled location (e.g. a tab body in the host's right rail).
   *
   * When `dock` is true but `mount` is omitted, the panel still mounts in
   * `document.body` (likely not what you want — pair them).
   */
  dock?: boolean
  /**
   * Visual theme for the panel chrome and controls. The canvas (in
   * `<boceto-edit>` / `<boceto-view>`) is **not** themed — only the panel
   * shell. Three values:
   *  - `light` (default) — light bg + dark text. Matches the historical look.
   *  - `dark` — zinc-950 bg + zinc-100 text. Suited for dark host apps.
   *  - `auto` — follows `prefers-color-scheme` of the user's OS / page.
   *
   * Implementation: each value sets a known suite of CSS custom properties
   * on the panel root (`--boceto-panel-bg`, `--boceto-panel-fg`, …). Host
   * pages that want full custom palettes can omit `theme` and override the
   * variables themselves from light-DOM CSS.
   */
  theme?: 'light' | 'dark' | 'auto'
}

/** Apply a theme's CSS variables to the panel root. Exported so the panel
 *  custom elements can re-apply on attribute changes. */
export function applyPanelTheme(
  root: HTMLElement,
  theme: 'light' | 'dark' | 'auto' | null | undefined,
): void {
  const mode =
    theme === 'auto'
      ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme === 'dark'
        ? 'dark'
        : 'light'
  const vars: Record<string, string> =
    mode === 'dark'
      ? {
          '--boceto-panel-bg': '#09090b',
          '--boceto-panel-fg': '#f4f4f5',
          '--boceto-panel-muted': '#a1a1aa',
          '--boceto-panel-border': '#27272a',
          '--boceto-panel-accent': '#4a90d9',
          '--boceto-panel-accent-fg': '#ffffff',
          '--boceto-panel-hover-bg': '#18181b',
          '--boceto-panel-secondary-bg': '#18181b',
          '--boceto-panel-input-bg': '#18181b',
          '--boceto-panel-input-border': '#3f3f46',
          '--boceto-panel-warning-bg': '#3f2d0a',
          '--boceto-panel-warning-fg': '#fde68a',
          '--boceto-panel-warning-border': '#854d0e',
        }
      : {
          '--boceto-panel-bg': '#ffffff',
          '--boceto-panel-fg': '#222222',
          '--boceto-panel-muted': '#71717a',
          '--boceto-panel-border': '#e4e4e7',
          '--boceto-panel-accent': '#4a90d9',
          '--boceto-panel-accent-fg': '#ffffff',
          '--boceto-panel-hover-bg': '#f4f4f5',
          '--boceto-panel-secondary-bg': '#fafafa',
          '--boceto-panel-input-bg': '#ffffff',
          '--boceto-panel-input-border': '#d4d4d8',
          '--boceto-panel-warning-bg': '#fef3c7',
          '--boceto-panel-warning-fg': '#854d0e',
          '--boceto-panel-warning-border': '#fde68a',
        }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.dataset.bocetoPanelTheme = mode
}

export interface FloatingPanelHandle {
  /** The outer panel element. */
  el: HTMLDivElement
  /** Header strip (drag handle in floating mode; title bar in docked mode). */
  header: HTMLDivElement
  /** The scrollable body where callers append their controls. */
  body: HTMLDivElement
  show(): void
  hide(): void
  isVisible(): boolean
  dispose(): void
}

export function createFloatingPanel(opts: FloatingPanelOptions): FloatingPanelHandle {
  const dock = opts.dock === true
  const mountTarget = opts.mount ?? document.body

  const root = document.createElement('div')
  root.dataset.bocetoPanel = 'root'
  if (dock) root.dataset.bocetoPanelMode = 'dock'
  // Seed the theme variables on the root before any child reads them.
  // `light` is the default if no theme is provided.
  applyPanelTheme(root, opts.theme ?? 'light')
  // Base styles shared by both modes. Colors are driven by CSS variables
  // so consumers can re-theme without touching every inline style here.
  const baseStyle: Partial<CSSStyleDeclaration> = {
    background: 'var(--boceto-panel-bg, #fff)',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    color: 'var(--boceto-panel-fg, #222)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    userSelect: 'none',
  }
  if (dock) {
    Object.assign(root.style, {
      ...baseStyle,
      // Inline flow inside the host container.
      position: 'static',
      width: opts.width ? `${opts.width}px` : '100%',
      // The host owns the outer chrome — no shadow, no border, no rounding.
      // We keep a faint top divider for visual separation when the host
      // stacks multiple docked panels.
      border: '0',
      borderRadius: '0',
      boxShadow: 'none',
      // Stretch to fill the host's available height; the body still scrolls
      // internally so the parent layout stays predictable.
      flex: '1 1 auto',
      minHeight: '0',
      maxHeight: opts.height ? `${opts.height}px` : '100%',
    } as CSSStyleDeclaration)
  } else {
    Object.assign(root.style, {
      ...baseStyle,
      position: 'fixed',
      left: `${opts.x ?? 16}px`,
      top: `${opts.y ?? 16}px`,
      width: `${opts.width ?? 280}px`,
      maxHeight: opts.height ? `${opts.height}px` : '80vh',
      border: '1px solid var(--boceto-panel-border, #d4d4d8)',
      borderRadius: '8px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
      zIndex: '2147482000',
    } as CSSStyleDeclaration)
  }

  const header = document.createElement('div')
  header.dataset.bocetoPanel = 'header'
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderBottom: '1px solid var(--boceto-panel-border, #e4e4e7)',
    background: 'var(--boceto-panel-secondary-bg, #fafafa)',
    cursor: dock ? 'default' : 'grab',
    fontSize: '12px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--boceto-panel-muted, #52525b)',
    fontWeight: '600',
  } as CSSStyleDeclaration)

  // Grip is the drag-affordance. Docked panels can't be moved, so we hide it.
  if (!dock) {
    const grip = document.createElement('span')
    grip.dataset.bocetoPanel = 'grip'
    grip.textContent = '⋮⋮'
    Object.assign(grip.style, {
      color: 'var(--boceto-panel-muted, #a1a1aa)',
      letterSpacing: '-3px',
    } as CSSStyleDeclaration)
    header.appendChild(grip)
  }

  const titleEl = document.createElement('span')
  titleEl.dataset.bocetoPanel = 'title'
  titleEl.textContent = opts.title
  titleEl.style.flex = '1'
  header.appendChild(titleEl)

  // Close button: floating panels need it (their own onClose collapses the
  // host element). Docked panels live inside host-controlled chrome, so the
  // close button is omitted — visibility there is the host's responsibility.
  if (opts.onClose && !dock) {
    const close = document.createElement('button')
    close.dataset.bocetoPanel = 'close'
    close.type = 'button'
    close.textContent = '×'
    Object.assign(close.style, {
      width: '22px',
      height: '22px',
      border: '0',
      background: 'transparent',
      color: 'var(--boceto-panel-muted, #71717a)',
      fontSize: '16px',
      lineHeight: '1',
      cursor: 'pointer',
      borderRadius: '4px',
    } as CSSStyleDeclaration)
    close.addEventListener(
      'mouseenter',
      () => (close.style.background = 'var(--boceto-panel-hover-bg, #f4f4f5)'),
    )
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
  mountTarget.appendChild(root)

  // ── Drag-to-move on the header (floating only) ───────────────────────
  let dragging = false
  let pid = -1
  let originX = 0
  let originY = 0
  let panelOriginX = 0
  let panelOriginY = 0
  if (!dock) {
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

    // Re-clamp on viewport resize so the panel never escapes the visible
    // area when the host window shrinks. Without this, a panel positioned
    // at `left: 1200px` is stranded off-screen if the user shrinks the
    // window past 1200 — the existing in-drag clamp only fires during
    // pointer-move. Listener auto-removes on dispose via the `removed`
    // flag below (the panel's root is the source of truth).
    const onResize = (): void => {
      if (!isElementInDocument(root)) return
      const next = clampToViewport(
        parseFloat(root.style.left) || 0,
        parseFloat(root.style.top) || 0,
        root,
      )
      root.style.left = `${next.x}px`
      root.style.top = `${next.y}px`
    }
    window.addEventListener('resize', onResize)
    // Stash for dispose.
    ;(root as { __bocetoResizeHandler?: () => void }).__bocetoResizeHandler = onResize
  }

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
      const handler = (root as { __bocetoResizeHandler?: () => void }).__bocetoResizeHandler
      if (handler) window.removeEventListener('resize', handler)
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

function isElementInDocument(el: HTMLElement): boolean {
  return document.body.contains(el)
}
