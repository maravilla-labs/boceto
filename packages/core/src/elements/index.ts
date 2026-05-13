import type { Element } from '../types'
import type { Surface } from '../render/surface'
import { getRenderer, type DrawState } from './registry'
import { sketchLine, sketchRect, sketchText, wrapText, PALETTE } from './primitives'
// Side effect: populate the registry with built-in renderers.
import './register'

export { registerElement, getRenderer, type DrawState, type ElementRenderer } from './registry'

const FALLBACK_DRAW = (s: Surface, el: Element, st: DrawState): void => {
  const sc = st.selected ? PALETTE.selection : st.hovered ? PALETTE.hover : PALETTE.default
  sketchRect(s, el.x, el.y, el.w, el.h, { stroke: sc, fill: PALETTE.bg })
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + el.h / 2, {
      align: 'center',
      base: 'middle',
      size: 13,
    })
  }
}

/**
 * Draws an element with its registered renderer (or a fallback box). Also
 * paints the sticky-note annotation, group outline, and selection handles.
 */
export function drawElement(
  surface: Surface,
  el: Element,
  state: DrawState = { selected: false, hovered: false, inGroup: false },
): void {
  const renderer = getRenderer(el.type)
  if (renderer) renderer.draw(surface, el, state)
  else FALLBACK_DRAW(surface, el, state)

  if (el.note) drawNote(surface, el)

  if (state.selected) {
    const { x, y, w, h } = el
    const pts: [number, number][] = [
      [x, y],
      [x + w / 2, y],
      [x + w, y],
      [x + w, y + h / 2],
      [x + w, y + h],
      [x + w / 2, y + h],
      [x, y + h],
      [x, y + h / 2],
    ]
    for (const [hx, hy] of pts) {
      surface.rect(hx - 5, hy - 5, 10, 10, {
        fill: PALETTE.selection,
        stroke: '#fff',
        strokeWidth: 1.5,
      })
    }
  } else if (state.inGroup) {
    surface.rect(el.x - 2, el.y - 2, el.w + 4, el.h + 4, {
      stroke: '#f59e0b',
      strokeWidth: 1.5,
    })
  }
}

function drawNote(surface: Surface, el: Element): void {
  const note = el.note ?? ''
  const nw = 120
  const nh = 56
  const nx = el.x + el.w - 10
  const ny = el.y - 20

  surface.group({ shadow: { color: 'rgba(0,0,0,0.2)', blur: 6, dx: 2, dy: 2 } }, () => {
    sketchRect(surface, nx, ny, nw, nh, { fill: '#fef08a', stroke: '#ca8a04', lw: 1.5, r: 0.5 })
  })

  // Folded corner.
  surface.path(`M ${nx + nw - 14} ${ny} L ${nx + nw} ${ny} L ${nx + nw} ${ny + 14} Z`, {
    fill: '#fde047',
    stroke: '#ca8a04',
    strokeWidth: 1,
  })

  wrapText(surface, note, nx + 5, ny + 5, nw - 10, 14, 3, { size: 11, color: '#555' })

  sketchLine(surface, el.x + el.w, el.y + 4, nx, ny + nh / 2, {
    stroke: '#ca8a04',
    lw: 1,
    dash: [4, 4],
  })
}

export function strokeColor(state: DrawState): string {
  return state.selected ? PALETTE.selection : state.hovered ? PALETTE.hover : PALETTE.default
}

export function fillColor(state: DrawState): string {
  return state.selected ? '#e8f4fd' : state.hovered ? '#f0f8ff' : PALETTE.bg
}
