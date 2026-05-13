import type { BocetoEditor } from './editor'
import { layoutBox, isFlexContainer } from '@boceto/core'

/**
 * Mount a `contenteditable` div over the canvas that the web component shows
 * on double-click to edit a label. Returns `{ open, close }`.
 *
 * The overlay positions itself in CSS pixels relative to the canvas. Canvas
 * pixel → CSS pixel scaling uses `getBoundingClientRect()` like
 * `interactions.ts` so the position lines up visually.
 */
export function createInlineEditor(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  editor: BocetoEditor,
  getZoom: () => number = () => 1,
): {
  open(id: string): void
  close(commit: boolean): void
  el: HTMLDivElement
} {
  const div = document.createElement('div')
  div.setAttribute('part', 'inline-edit')
  div.className = 'inline-edit'
  div.contentEditable = 'true'
  Object.assign(div.style, {
    position: 'absolute',
    display: 'none',
    boxSizing: 'border-box',
    minWidth: '20px',
    minHeight: '20px',
    padding: '2px 4px',
    border: '1.5px solid #6e9bd8',
    background: 'rgba(255,255,255,0.95)',
    fontFamily: 'inherit',
    fontSize: '13px',
    outline: 'none',
    zIndex: '2',
  } as CSSStyleDeclaration)
  host.appendChild(div)

  let openId: string | null = null

  function open(id: string): void {
    const item = editor.findItem(id)
    if (!item) return
    if (isFlexContainer(item)) return // containers have no editable label
    const box = layoutBox(item)
    const rect = canvas.getBoundingClientRect()
    const hostRect = host.getBoundingClientRect()
    const scaleX = rect.width / (canvas.width || 1)
    const scaleY = rect.height / (canvas.height || 1)
    const zoom = getZoom() || 1
    // Doc coords → canvas pixels: multiply by zoom (the renderer's scale).
    // Canvas pixels → CSS pixels: multiply by scaleX/Y.
    div.style.left = `${rect.left - hostRect.left + box.x * zoom * scaleX}px`
    div.style.top = `${rect.top - hostRect.top + box.y * zoom * scaleY}px`
    div.style.width = `${Math.max(20, box.w * zoom * scaleX)}px`
    div.style.height = `${Math.max(20, box.h * zoom * scaleY)}px`
    div.style.display = 'block'
    div.textContent = 'label' in item ? (item.label ?? '') : ''
    openId = id
    queueMicrotask(() => {
      div.focus()
      const range = document.createRange()
      range.selectNodeContents(div)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    })
  }

  function close(commit: boolean): void {
    if (openId == null) return
    const id = openId
    const text = div.textContent ?? ''
    openId = null
    div.style.display = 'none'
    div.textContent = ''
    if (commit) editor.setLabel(id, text)
  }

  div.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      close(true)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close(false)
    }
  })
  div.addEventListener('blur', () => {
    if (openId != null) close(true)
  })

  return { open, close, el: div }
}
