import type { BocetoEditor } from './editor'
import type { HandleEdge } from './state'

/**
 * Pointer + keyboard glue. `bindCanvas(editor, canvas)` returns a disposer.
 * Pointer events translate to controller calls; the controller emits events
 * back to whatever's listening (the web component, ultimately).
 */

interface PointerCanvas {
  setPointerCapture(id: number): void
  releasePointerCapture(id: number): void
  getBoundingClientRect(): DOMRect
  focus?(): void
}

type DragKind =
  | { mode: 'idle' }
  | { mode: 'move'; ids: string[]; pointerId: number; lastX: number; lastY: number }
  | {
      mode: 'resize'
      id: string
      edge: HandleEdge
      pointerId: number
      startX: number
      startY: number
      origin: { x: number; y: number; w: number; h: number }
    }
  | {
      mode: 'rubber'
      pointerId: number
      startX: number
      startY: number
      rect: { x: number; y: number; w: number; h: number }
    }

export interface BindOptions {
  /** Called whenever a render is needed (after geometry or rubber-band changes). */
  onPaint?: (extra?: { rubberBand?: { x: number; y: number; w: number; h: number } }) => void
  /** Called when the user double-clicks an item to edit its label. */
  onLabelEdit?: (id: string) => void
  /**
   * Called on right-click. `ids` is the selection set at the time of the
   * click (the handler already promotes the right-clicked item into the
   * selection when it wasn't selected, so this includes it). `(x, y)` are
   * client-space (page) coordinates suitable for positioning a menu DOM.
   */
  onContextMenu?: (info: { x: number; y: number; ids: string[] }) => void
  /**
   * Called when something carrying the MIME type
   * `application/boceto-element-type` is dropped on the canvas. `(x, y)`
   * are doc coordinates (already divided by the current zoom). Used by
   * `<boceto-palette>` for drag-from-palette element creation.
   */
  onDrop?: (info: { x: number; y: number; type: string }) => void
  /**
   * Lookup the current canvas → doc zoom factor. When the editor renders
   * at `fit="content"`, this is the scale the renderer applies; pointer
   * coordinates are divided by it so hit-tests stay in doc space. Default
   * implementation returns 1.
   */
  getZoom?: () => number
  /** Optional: an interactive element on the host that should receive focus
   *  for keyboard shortcuts (defaults to focusing the canvas itself). */
  focusTarget?: { focus: () => void }
}

export function bindCanvas(
  editor: BocetoEditor,
  canvas: HTMLCanvasElement,
  opts: BindOptions = {},
): () => void {
  let drag: DragKind = { mode: 'idle' }
  const paint = (extra?: Parameters<NonNullable<BindOptions['onPaint']>>[0]) =>
    opts.onPaint?.(extra)
  const zoomNow = (): number => opts.getZoom?.() ?? 1

  // ── Pointer ─────────────────────────────────────────────────────────────

  const onPointerDown = (e: PointerEvent): void => {
    if (editor.readonly) return
    if (e.button !== 0) {
      // Right-click / middle-click. Don't start a drag, but ALSO block the
      // event from bubbling to host editors (notably ProseMirror), whose
      // mousedown handler would otherwise select the wrapping node and paint
      // its node-selection background over the canvas. The contextmenu event
      // that follows is also stopPropagation()'d below — both gates are
      // needed because PM acts on mousedown, not contextmenu.
      e.stopPropagation()
      return
    }
    const { x, y } = toCanvasCoords(canvas, e, zoomNow())
    canvas.setPointerCapture(e.pointerId)
    opts.focusTarget?.focus()

    // 1) Handle hit beats item hit (so resizing existing selection wins).
    const handle = editor.hitHandle(x, y)
    if (handle) {
      const selected = [...editor.selection]
      if (selected.length === 0) return
      // Resize handles support single-selection in v0.2.
      const id = selected[0]!
      const origin = editor.boxOf(id)
      if (!origin) return
      editor.beginTransaction()
      drag = {
        mode: 'resize',
        id,
        edge: handle.edge,
        pointerId: e.pointerId,
        startX: x,
        startY: y,
        origin,
      }
      e.preventDefault()
      return
    }

    // 2) Item hit?
    const hit = editor.hitTestTop(x, y)
    if (hit) {
      const additive = e.shiftKey || e.metaKey || e.ctrlKey
      if (additive) {
        editor.select([hit.id], 'toggle')
      } else if (!editor.selection.has(hit.id)) {
        editor.select([hit.id], 'replace')
      }
      paint()
      // Start drag if the item is now selected.
      if (editor.selection.has(hit.id)) {
        editor.beginTransaction()
        drag = {
          mode: 'move',
          ids: [...editor.selection],
          pointerId: e.pointerId,
          lastX: x,
          lastY: y,
        }
      }
      e.preventDefault()
      return
    }

    // 3) Empty hit → rubber-band.
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) editor.clearSelection()
    drag = {
      mode: 'rubber',
      pointerId: e.pointerId,
      startX: x,
      startY: y,
      rect: { x, y, w: 0, h: 0 },
    }
    paint({ rubberBand: drag.rect })
    e.preventDefault()
  }

  const onPointerMove = (e: PointerEvent): void => {
    if (drag.mode === 'idle') return
    if (e.pointerId !== drag.pointerId) return
    const { x, y } = toCanvasCoords(canvas, e, zoomNow())
    if (drag.mode === 'move') {
      const dx = x - drag.lastX
      const dy = y - drag.lastY
      drag.lastX = x
      drag.lastY = y
      if (dx === 0 && dy === 0) return
      editor.move(drag.ids, dx, dy, { commit: false })
      paint()
    } else if (drag.mode === 'resize') {
      const dx = x - drag.startX
      const dy = y - drag.startY
      editor.resize(drag.id, drag.edge, dx, dy, drag.origin, { commit: false })
      paint()
    } else {
      const rx = Math.min(drag.startX, x)
      const ry = Math.min(drag.startY, y)
      const rw = Math.abs(x - drag.startX)
      const rh = Math.abs(y - drag.startY)
      drag.rect = { x: rx, y: ry, w: rw, h: rh }
      paint({ rubberBand: drag.rect })
    }
  }

  const onPointerUp = (e: PointerEvent): void => {
    if (drag.mode === 'idle') return
    if (e.pointerId !== drag.pointerId) return
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {
      // jsdom may not implement pointer capture; ignore.
    }
    if (drag.mode === 'move' || drag.mode === 'resize') {
      editor.commitTransaction()
    } else if (drag.mode === 'rubber') {
      const ids = editor.itemsInRect(drag.rect)
      editor.select(ids, 'replace')
      paint()
    }
    drag = { mode: 'idle' }
    paint()
  }

  const onDoubleClick = (e: MouseEvent): void => {
    if (editor.readonly) return
    const { x, y } = toCanvasCoords(canvas, e as PointerEvent, zoomNow())
    const hit = editor.hitTestLeaf(x, y)
    if (!hit) return
    opts.onLabelEdit?.(hit.id)
  }

  const onContextMenu = (e: MouseEvent): void => {
    // Always suppress the browser menu over the canvas so the editor can
    // own the gesture even in readonly mode (where we just don't open a
    // custom menu). Right-clicking text inside an inline-edit overlay is
    // outside the canvas, so this only fires for canvas right-clicks.
    e.preventDefault()
    // Stop propagation so hosts like ProseMirror (TipTap NodeViews) don't
    // also see the gesture and paint a node-selection background over the
    // canvas. The canvas owns the right-click gesture end-to-end.
    e.stopPropagation()
    if (editor.readonly) return
    if (!opts.onContextMenu) return
    const { x, y } = toCanvasCoords(canvas, e as PointerEvent, zoomNow())
    const hit = editor.hitTestTop(x, y)
    // If the right-clicked item isn't already selected, replace selection
    // so the menu acts on the visually-targeted item.
    if (hit && !editor.selection.has(hit.id)) {
      editor.select([hit.id], 'replace')
      paint()
    }
    opts.onContextMenu({ x: e.clientX, y: e.clientY, ids: [...editor.selection] })
  }

  // ── Keyboard ────────────────────────────────────────────────────────────

  const onKeyDown = (e: KeyboardEvent): void => {
    if (editor.readonly) return
    const meta = e.metaKey || e.ctrlKey
    if (meta && (e.key === 'z' || e.key === 'Z')) {
      if (e.shiftKey) editor.redo()
      else editor.undo()
      e.preventDefault()
      paint()
      return
    }
    if (meta && (e.key === 'd' || e.key === 'D')) {
      editor.duplicateItems([...editor.selection])
      e.preventDefault()
      paint()
      return
    }
    if (meta && (e.key === ']' || e.key === '[')) {
      // ⌘+] / ⌘+⇧+] — bring forward / front;  ⌘+[ / ⌘+⇧+[ — send backward / back.
      if (editor.selection.size === 0) return
      const ids = [...editor.selection]
      if (e.key === ']') {
        e.shiftKey ? editor.bringToFront(ids) : editor.bringForward(ids)
      } else {
        e.shiftKey ? editor.sendToBack(ids) : editor.sendBackward(ids)
      }
      e.preventDefault()
      paint()
      return
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (editor.selection.size === 0) return
      editor.removeItems([...editor.selection])
      e.preventDefault()
      paint()
      return
    }
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      if (editor.selection.size === 0) return
      const step = e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      editor.move([...editor.selection], dx, dy)
      e.preventDefault()
      paint()
    }
  }

  const onDragOver = (e: DragEvent): void => {
    if (editor.readonly) return
    if (!opts.onDrop) return
    // Safari / WKWebView (the engine behind Tauri) hides custom MIME types
    // in `dataTransfer.types` during dragover — only `text/plain`, `Files`,
    // and a few standard types are visible. So we can't gate on
    // `application/boceto-element-type` here without breaking drag-from-
    // palette on those engines. Instead we accept any active drag, call
    // preventDefault to mark ourselves as a drop target, and verify the
    // type at drop time (when the full dataTransfer is visible).
    if (!e.dataTransfer) return
    e.preventDefault() // signal that we accept the drop
    // Hosts like ProseMirror also bind dragover at the editor level and will
    // claim the drop themselves once they see the gesture. Stop the bubble so
    // the canvas is the only handler that sees this drag.
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (e: DragEvent): void => {
    if (editor.readonly) return
    if (!opts.onDrop) return
    const type = e.dataTransfer?.getData('application/boceto-element-type')
    if (!type) return // not our drag — let the browser fall through
    e.preventDefault()
    // Same reasoning as dragover — keep the drop inside the canvas; we've
    // already handled it.
    e.stopPropagation()
    const { x, y } = toCanvasCoords(canvas, e, zoomNow())
    opts.onDrop({ x, y, type })
  }

  // ProseMirror (and other rich-text hosts) react to `mousedown`, not just
  // pointerdown, to select a NodeView as a "node selection" — which paints
  // their blue selection background over the canvas. The pointerdown
  // handler above already stops right-click propagation, but mousedown is
  // a separate event and PM listens on it directly. Stop it the same way.
  const onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) e.stopPropagation()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('dblclick', onDoubleClick)
  canvas.addEventListener('contextmenu', onContextMenu)
  canvas.addEventListener('dragover', onDragOver)
  canvas.addEventListener('drop', onDrop)
  canvas.addEventListener('keydown', onKeyDown)

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('mousedown', onMouseDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('dblclick', onDoubleClick)
    canvas.removeEventListener('contextmenu', onContextMenu)
    canvas.removeEventListener('dragover', onDragOver)
    canvas.removeEventListener('drop', onDrop)
    canvas.removeEventListener('keydown', onKeyDown)
  }
}

function toCanvasCoords(
  canvas: PointerCanvas,
  e: { clientX: number; clientY: number },
  zoom = 1,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  // Map CSS-rendered position to canvas pixel coords. The canvas may be
  // displayed at a different size than its internal resolution (CSS scaling).
  const scaleX = (canvas as unknown as HTMLCanvasElement).width / rect.width || 1
  const scaleY = (canvas as unknown as HTMLCanvasElement).height / rect.height || 1
  // Pixel coords inside the canvas, then divide by the render-time zoom
  // so the result is in doc space (matches `editor.doc` coordinates).
  const z = zoom > 0 ? zoom : 1
  return {
    x: ((e.clientX - rect.left) * scaleX) / z,
    y: ((e.clientY - rect.top) * scaleY) / z,
  }
}
