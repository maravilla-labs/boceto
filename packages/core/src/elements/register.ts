/**
 * Registers all v0.1 built-in element renderers. Imported for side-effects
 * by `./index.ts`. Each renderer is a `draw(surface, el, state)` function;
 * surface ops are backend-agnostic so the same code paints to canvas or SVG.
 */
import type { Element, ElementType } from '../types'
import type { Surface } from '../render/surface'
import {
  registerElement,
  type DrawState,
  type ElementRenderer,
} from './registry'
import { PALETTE, sketchLine, sketchRect, sketchText, wrapText } from './primitives'

function strokeColor(state: DrawState): string {
  return state.selected ? PALETTE.selection : state.hovered ? PALETTE.hover : PALETTE.default
}

function fillColor(state: DrawState): string {
  return state.selected ? '#e8f4fd' : state.hovered ? '#f0f8ff' : PALETTE.bg
}

const r = (type: ElementType, fn: ElementRenderer['draw']) => registerElement(type, { draw: fn })

r('box', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: fillColor(st),
    stroke: strokeColor(st),
    lw: st.selected ? 2.5 : 1.8,
  })
  if (el.label) {
    wrapText(s, el.label, el.x + 6, el.y + 6, el.w - 12, 16, 2, { size: 13, color: '#555' })
  }
})

r('card', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: fillColor(st),
    stroke: strokeColor(st),
    lw: st.selected ? 2.5 : 1.8,
  })
  if (el.label) {
    wrapText(s, el.label, el.x + 6, el.y + 6, el.w - 12, 16, 2, { size: 13, color: '#555' })
  }
  sketchLine(s, el.x + 1, el.y + 32, el.x + el.w - 1, el.y + 32, { stroke: '#ccc' })
})

r('button', (s, el, st) => {
  const bg = st.selected ? '#d0e8fa' : st.hovered ? '#e0eefc' : '#e8e8e8'
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: strokeColor(st), lw: 2.2 })
  sketchText(s, el.label || 'Button', el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    bold: true,
    size: 13,
    color: '#111',
  })
})

r('primary-button', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: st.selected ? '#2e6baa' : '#3b82c4',
    stroke: st.selected ? PALETTE.selection : '#1a5590',
    lw: 2,
  })
  sketchText(s, el.label || 'Submit', el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    bold: true,
    size: 13,
    color: '#fff',
  })
})

r('input', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(255,255,255,.97)',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  sketchText(s, el.label || 'placeholder…', el.x + 8, el.y + el.h / 2, {
    base: 'middle',
    italic: true,
    size: 13,
    color: '#aaa',
  })
  sketchLine(s, el.x + 8, el.y + 6, el.x + 8, el.y + el.h - 6, { stroke: '#999', lw: 1 })
})

r('textarea', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(255,255,255,.97)',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  sketchText(s, el.label || 'Enter text…', el.x + 8, el.y + 10, {
    italic: true,
    size: 13,
    color: '#aaa',
  })
  // Resize-grip diagonal lines in the bottom-right corner.
  for (let i = 0; i < 3; i++) {
    s.line(el.x + el.w - 10 + i * 3, el.y + el.h - 4, el.x + el.w - 4, el.y + el.h - 10 + i * 3, {
      stroke: '#ccc',
      strokeWidth: 1,
    })
  }
})

r('checkbox', (s, el, st) => {
  const sz = 16
  sketchRect(s, el.x, el.y + (el.h - sz) / 2, sz, sz, { fill: '#fff', stroke: strokeColor(st) })
  // Check mark.
  s.path(
    `M ${el.x + 3} ${el.y + (el.h - sz) / 2 + sz / 2} L ${el.x + sz / 2 - 1} ${el.y + (el.h + sz) / 2 - 3} L ${el.x + sz - 2} ${el.y + (el.h - sz) / 2 + 3}`,
    { stroke: '#555', strokeWidth: 2, lineCap: 'round' },
  )
  sketchText(s, el.label || 'Option', el.x + sz + 7, el.y + el.h / 2, { base: 'middle', size: 14 })
})

r('radio', (s, el, st) => {
  const sz = 16
  const cx = el.x + sz / 2
  const cy = el.y + el.h / 2
  s.arc(s.jitter(cx, 0.5), s.jitter(cy, 0.5), sz / 2, {
    fill: '#fff',
    stroke: strokeColor(st),
    strokeWidth: 1.8,
  })
  s.arc(cx, cy, sz / 4, { fill: '#555' })
  sketchText(s, el.label || 'Option', el.x + sz + 7, el.y + el.h / 2, { base: 'middle', size: 14 })
})

r('select', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(255,255,255,.97)',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  sketchText(s, el.label || 'Choose…', el.x + 8, el.y + el.h / 2, {
    base: 'middle',
    size: 13,
    color: '#555',
  })
  // Chevron.
  s.path(
    `M ${el.x + el.w - 18} ${el.y + el.h / 2 - 3} L ${el.x + el.w - 10} ${el.y + el.h / 2 + 4} L ${el.x + el.w - 2} ${el.y + el.h / 2 - 3}`,
    { stroke: '#777', strokeWidth: 1.5 },
  )
})

r('image', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#f0f0ec', stroke: strokeColor(st), lw: 2 })
  sketchLine(s, el.x + 6, el.y + 6, el.x + el.w - 6, el.y + el.h - 6, { stroke: '#ccc', lw: 1.5 })
  sketchLine(s, el.x + el.w - 6, el.y + 6, el.x + 6, el.y + el.h - 6, { stroke: '#ccc', lw: 1.5 })
  sketchText(s, el.label || 'image', el.x + el.w / 2, el.y + el.h / 2 + 10, {
    align: 'center',
    base: 'middle',
    italic: true,
    size: 12,
    color: '#aaa',
  })
  s.arc(el.x + el.w * 0.35, el.y + el.h * 0.35, el.h * 0.1, { fill: '#ddd' })
})

r('video', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#1a1a2e', stroke: strokeColor(st), lw: 2 })
  // Play triangle.
  s.path(
    `M ${el.x + el.w / 2 - 12} ${el.y + el.h / 2 - 16} L ${el.x + el.w / 2 + 16} ${el.y + el.h / 2} L ${el.x + el.w / 2 - 12} ${el.y + el.h / 2 + 16} Z`,
    { fill: 'rgba(255,255,255,.7)' },
  )
  sketchText(s, el.label || 'video', el.x + el.w / 2, el.y + el.h - 14, {
    align: 'center',
    base: 'middle',
    size: 12,
    color: '#888',
  })
})

r('navbar', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: '#2d2d3a',
    stroke: st.selected ? PALETTE.selection : '#111',
    lw: 2,
  })
  sketchText(s, el.label || 'Brand', el.x + 12, el.y + el.h / 2, {
    base: 'middle',
    bold: true,
    size: 14,
    color: '#fff',
  })
  const items = pipeListAttr(el, 'items', ['Home', 'About', 'Contact'])
  let nx = el.x + el.w - 10
  for (const ni of items) {
    const tw = s.measureText(ni, { size: 12 }).width
    nx -= tw + 18
    sketchText(s, ni, nx + tw / 2, el.y + el.h / 2, {
      align: 'center',
      base: 'middle',
      size: 12,
      color: '#ccc',
    })
  }
})

r('label', (s, el, st) => {
  const fontSize = numAttr(el, 'fontSize', 15)
  s.text(el.label || 'Text label', el.x, el.y, {
    size: fontSize,
    color: st.selected ? PALETTE.selection : '#222',
    align: 'left',
    baseline: 'top',
    maxWidth: el.w,
  })
  if (st.selected || st.hovered) selDash(s, el, st)
})

r('heading', (s, el, st) => {
  const fontSize = numAttr(el, 'fontSize', 22)
  sketchText(s, el.label || 'Heading', el.x, el.y + el.h / 2, {
    size: fontSize,
    bold: true,
    base: 'middle',
    color: '#111',
  })
  if (st.selected || st.hovered) selDash(s, el, st)
})

r('divider', (s, el, st) => {
  sketchLine(s, el.x, el.y + el.h / 2, el.x + el.w, el.y + el.h / 2, { stroke: '#aaa', lw: 2 })
  if (st.selected) {
    s.rect(el.x - 2, el.y - 4, el.w + 4, el.h + 8, {
      stroke: PALETTE.selection,
      strokeWidth: 1,
    })
  }
})

r('table', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st) })

  // `data` is `r1c1|r1c2;r2c1|r2c2` — semicolons split rows, pipes split cells.
  const dataAttr = strAttr(el, 'data', '')
  const dataRows = dataAttr ? dataAttr.split(';').map((r) => r.split('|').map((c) => c.trim())) : []

  const headers = pipeListAttr(el, 'headers', [])
  // Column count: explicit cols= wins; else longest data row; else headers length; else default 3.
  const cols =
    el.attrs.cols != null && typeof el.attrs.cols === 'number'
      ? el.attrs.cols
      : dataRows.length > 0
        ? Math.max(...dataRows.map((r) => r.length))
        : headers.length > 0
          ? headers.length
          : 3
  // Row count: explicit rows= wins; else 1 header + dataRows.length; else default 4.
  const rows =
    el.attrs.rows != null && typeof el.attrs.rows === 'number'
      ? el.attrs.rows
      : dataRows.length > 0
        ? dataRows.length + 1
        : 4

  const cw = el.w / cols
  const rh = el.h / rows
  sketchRect(s, el.x, el.y, el.w, rh, { fill: '#e8e8e8', stroke: 'transparent' })
  for (let c = 0; c < cols; c++) {
    const headerText = headers[c] ?? `Col ${c + 1}`
    sketchText(s, headerText, el.x + c * cw + cw / 2, el.y + rh / 2, {
      align: 'center',
      base: 'middle',
      bold: true,
      size: 12,
    })
  }
  for (let i = 1; i < rows; i++) {
    sketchLine(s, el.x, el.y + i * rh, el.x + el.w, el.y + i * rh, { stroke: '#ddd' })
  }
  for (let c = 1; c < cols; c++) {
    sketchLine(s, el.x + c * cw, el.y, el.x + c * cw, el.y + el.h, { stroke: '#ddd' })
  }
  for (let row = 1; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      let txt: string
      if (dataRows.length > 0) {
        txt = dataRows[row - 1]?.[c] ?? ''
      } else {
        // Default placeholder content (matches v0.1 visual when no data is supplied).
        txt = row <= 2 && c === 0 ? '● Item' : row === 1 && c === 1 ? 'Value' : '···'
      }
      if (txt) {
        sketchText(s, txt, el.x + c * cw + 6, el.y + row * rh + rh / 2, {
          base: 'middle',
          size: 11,
          color: '#666',
        })
      }
    }
  }
})

r('list', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: fillColor(st), stroke: strokeColor(st) })
  const items = pipeListAttr(el, 'items', ['Item one', 'Item two', 'Item three', 'Item four'])
  const ih = Math.min(24, el.h / items.length)
  items.forEach((item, i) => {
    if (el.y + i * ih + ih > el.y + el.h) return
    sketchLine(s, el.x + 8, el.y + i * ih + ih / 2, el.x + 12, el.y + i * ih + ih / 2, {
      stroke: '#777',
      lw: 2,
    })
    sketchText(s, item, el.x + 20, el.y + i * ih + ih / 2, { base: 'middle', size: 13 })
  })
})

r('breadcrumb', (s, el, st) => {
  const crumbs = (el.label || 'Home / Products / Detail').split('/').map((x) => x.trim())
  let bx = el.x + 4
  crumbs.forEach((c, i) => {
    const tw = s.measureText(c, { size: 13 }).width + 2
    sketchText(s, c, bx, el.y + el.h / 2, {
      base: 'middle',
      size: 13,
      color: i === crumbs.length - 1 ? '#333' : '#4a90d9',
    })
    bx += tw + 4
    if (i < crumbs.length - 1) {
      sketchText(s, '/', bx, el.y + el.h / 2, { base: 'middle', size: 13, color: '#aaa' })
      bx += 14
    }
  })
  if (st.selected || st.hovered) selDash(s, el, st)
})

r('tabs', (s, el, st) => {
  const tabs = pipeListAttr(el, 'tabNames', ['Tab 1', 'Tab 2', 'Tab 3'])
  const activeIdx = clamp(numAttr(el, 'active', 0), 0, tabs.length - 1)
  const tw = el.w / tabs.length
  tabs.forEach((t, i) => {
    const active = i === activeIdx
    sketchRect(s, el.x + i * tw, el.y, tw, 32, {
      fill: active ? '#fff' : '#f0f0f0',
      stroke: '#bbb',
      lw: 1.5,
    })
    sketchText(s, t, el.x + i * tw + tw / 2, el.y + 16, {
      align: 'center',
      base: 'middle',
      size: 13,
      bold: active,
      color: active ? '#222' : '#888',
    })
  })
  sketchRect(s, el.x, el.y + 32, el.w, el.h - 32, { fill: '#fff', stroke: '#bbb' })
  sketchText(s, el.label || 'Tab content', el.x + 10, el.y + 44, {
    size: 13,
    color: '#999',
    italic: true,
  })
  if (st.selected) {
    s.rect(el.x - 2, el.y - 2, el.w + 4, el.h + 4, {
      stroke: PALETTE.selection,
      strokeWidth: 2,
    })
  }
})

r('badge', (s, el) => {
  const bg = strAttr(el, 'badgeColor', '#e94560')
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: 'transparent', r: 0.5 })
  sketchText(s, el.label || 'Badge', el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    size: 11,
    bold: true,
    color: '#fff',
  })
})

r('progress', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#eee', stroke: strokeColor(st) })
  const pct = Math.max(0, Math.min(100, numAttr(el, 'progress', 60)))
  sketchRect(s, el.x + 1, el.y + 1, ((el.w - 2) * pct) / 100, el.h - 2, {
    fill: '#4a90d9',
    stroke: 'transparent',
    r: 0.3,
  })
  sketchText(s, `${pct}%`, el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    size: 11,
    bold: true,
    color: '#fff',
  })
})

r('avatar', (s, el, st) => {
  const r2 = Math.min(el.w, el.h) / 2
  s.arc(s.jitter(el.x + r2, 0.5), s.jitter(el.y + r2, 0.5), r2, {
    fill: '#d0d0d0',
    stroke: strokeColor(st),
    strokeWidth: 2,
  })
  s.arc(el.x + r2, el.y + r2 * 0.75, r2 * 0.3, { fill: '#aaa' })
  s.arcSegment(el.x + r2, el.y + r2 * 1.5, r2 * 0.5, 0, Math.PI, { fill: '#aaa' })
  if (el.label) sketchText(s, el.label, el.x + r2 * 2 + 6, el.y + r2, { base: 'middle', size: 13 })
})

r('alert', (s, el) => {
  const ac = strAttr(el, 'alertColor', '#4a90d9')
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: ac + '22', stroke: ac, lw: 2 })
  sketchText(s, 'ℹ', el.x + 12, el.y + el.h / 2, { base: 'middle', size: 16, color: ac })
  sketchText(s, el.label || 'Alert message here', el.x + 30, el.y + el.h / 2, {
    base: 'middle',
    size: 13,
    color: '#333',
  })
})

r('modal', (s, el, st) => {
  // Drop shadow.
  s.rect(el.x + 6, el.y + 6, el.w, el.h, { fill: 'rgba(0,0,0,0.25)' })
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 2.5 })
  sketchRect(s, el.x, el.y, el.w, 36, { fill: '#f5f5f5', stroke: 'transparent' })
  sketchText(s, el.label || 'Modal Title', el.x + 12, el.y + 18, { base: 'middle', bold: true, size: 14 })
  sketchText(s, '✕', el.x + el.w - 18, el.y + 18, {
    base: 'middle',
    align: 'right',
    size: 14,
    color: '#999',
  })
  sketchLine(s, el.x, el.y + 36, el.x + el.w, el.y + 36, { stroke: '#e0e0e0' })
})

r('pagination', (s, el) => {
  const total = Math.max(1, numAttr(el, 'total', 10))
  const current = clamp(numAttr(el, 'current', 2), 1, total)
  const pages = paginationLabels(current, total)
  const pw = el.w / pages.length
  pages.forEach((p, i) => {
    const active = p === String(current)
    sketchRect(s, el.x + i * pw + 1, el.y + 1, pw - 2, el.h - 2, {
      fill: active ? '#4a90d9' : '#fff',
      stroke: '#ccc',
    })
    sketchText(s, p, el.x + i * pw + pw / 2, el.y + el.h / 2, {
      align: 'center',
      base: 'middle',
      size: 13,
      bold: active,
      color: active ? '#fff' : '#555',
    })
  })
})

/**
 * Produce the page-button labels around `current` for a `total`-page paginator.
 * Always shows: ‹ first … neighbors current neighbors … last ›
 * Collapses to ‹ 1 2 3 … N › for small ranges.
 */
function paginationLabels(current: number, total: number): string[] {
  const out: string[] = ['‹']
  if (total <= 7) {
    for (let i = 1; i <= total; i++) out.push(String(i))
  } else {
    out.push('1')
    if (current > 3) out.push('…')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) out.push(String(i))
    if (current < total - 2) out.push('…')
    out.push(String(total))
  }
  out.push('›')
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Form / interaction
// ─────────────────────────────────────────────────────────────────────────────

r('switch', (s, el, st) => {
  // Pill background turns blue/green when on; circle thumb slides to right.
  const on = boolAttr(el, 'on', false)
  const pillH = Math.min(el.h, 28)
  const pillW = Math.min(el.w, pillH * 1.85)
  const px = el.x
  const py = el.y + (el.h - pillH) / 2
  sketchRect(s, px, py, pillW, pillH, {
    fill: on ? '#22c55e' : '#d4d4d8',
    stroke: on ? '#16a34a' : '#a1a1aa',
    lw: 1.5,
    r: 0.6,
  })
  const knobR = pillH / 2 - 3
  const knobCx = on ? px + pillW - knobR - 3 : px + knobR + 3
  s.arc(s.jitter(knobCx, 0.4), s.jitter(py + pillH / 2, 0.4), knobR, {
    fill: '#fff',
    stroke: '#888',
    strokeWidth: 1,
  })
  if (el.label) {
    sketchText(s, el.label, px + pillW + 10, el.y + el.h / 2, { base: 'middle', size: 13 })
  }
})

r('slider', (s, el, st) => {
  const min = numAttr(el, 'min', 0)
  const max = numAttr(el, 'max', 100)
  const value = clamp(numAttr(el, 'value', (min + max) / 2), min, max)
  const pct = max === min ? 0 : (value - min) / (max - min)
  const trackY = el.y + el.h / 2
  // Track background.
  s.rect(el.x, trackY - 2, el.w, 4, { fill: '#e4e4e7' })
  // Filled portion.
  s.rect(el.x, trackY - 2, el.w * pct, 4, { fill: '#3b82c4' })
  // Thumb.
  const thumbCx = el.x + el.w * pct
  s.arc(s.jitter(thumbCx, 0.4), s.jitter(trackY, 0.4), 8, {
    fill: '#fff',
    stroke: strokeColor(st),
    strokeWidth: 2,
  })
})

r('search', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(255,255,255,.97)',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  // Magnifier icon: small circle + handle line.
  const cx = el.x + 12
  const cy = el.y + el.h / 2
  s.arc(cx, cy, 5, { stroke: '#888', strokeWidth: 1.5 })
  s.line(cx + 4, cy + 4, cx + 8, cy + 8, { stroke: '#888', strokeWidth: 1.5 })
  sketchText(s, el.label || 'Search…', el.x + 28, cy, {
    base: 'middle',
    italic: !el.attrs.value,
    size: 13,
    color: el.attrs.value ? '#222' : '#aaa',
  })
})

r('chip', (s, el, st) => {
  const bg = strAttr(el, 'chipColor', '#e4e4e7')
  const closable = boolAttr(el, 'closable', false)
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: '#a1a1aa', lw: 1, r: 0.6 })
  const textRight = closable ? el.w - 16 : el.w - 8
  sketchText(s, el.label || 'Chip', el.x + 8, el.y + el.h / 2, {
    base: 'middle',
    size: 12,
    color: '#3f3f46',
    maxW: textRight - 8,
  })
  if (closable) {
    const xCx = el.x + el.w - 10
    const xCy = el.y + el.h / 2
    s.line(xCx - 3, xCy - 3, xCx + 3, xCy + 3, { stroke: '#666', strokeWidth: 1.2 })
    s.line(xCx + 3, xCy - 3, xCx - 3, xCy + 3, { stroke: '#666', strokeWidth: 1.2 })
  }
})

r('segmented-control', (s, el, st) => {
  const items = pipeListAttr(el, 'items', ['Day', 'Week', 'Month'])
  const activeIdx = clamp(numAttr(el, 'active', 0), 0, items.length - 1)
  // Outer pill background.
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#f4f4f5', stroke: '#d4d4d8', lw: 1, r: 0.5 })
  const segW = (el.w - 4) / items.length
  items.forEach((label, i) => {
    const sx = el.x + 2 + i * segW
    const sy = el.y + 2
    if (i === activeIdx) {
      sketchRect(s, sx, sy, segW, el.h - 4, { fill: '#fff', stroke: '#bbb', lw: 1, r: 0.4 })
    }
    sketchText(s, label, sx + segW / 2, el.y + el.h / 2, {
      align: 'center',
      base: 'middle',
      size: 12,
      bold: i === activeIdx,
      color: i === activeIdx ? '#222' : '#666',
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Navigation / overlays
// ─────────────────────────────────────────────────────────────────────────────

r('sidebar', (s, el, st) => {
  const collapsed = boolAttr(el, 'collapsed', false)
  const items = pipeListAttr(el, 'items', ['Home', 'Inbox', 'Settings'])
  const activeIdx = clamp(numAttr(el, 'active', 0), -1, items.length - 1)
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#f8f8fb', stroke: strokeColor(st), lw: 1 })
  if (el.label) {
    sketchText(s, el.label, el.x + 12, el.y + 14, { size: 14, bold: true, color: '#222' })
  }
  const startY = el.label ? el.y + 38 : el.y + 12
  const rowH = 32
  items.forEach((label, i) => {
    const ry = startY + i * rowH
    if (ry + rowH > el.y + el.h) return
    if (i === activeIdx) {
      s.rect(el.x + 6, ry, el.w - 12, rowH - 4, { fill: '#e0eefc' })
    }
    // Icon dot.
    s.arc(el.x + 16, ry + (rowH - 4) / 2, 4, { fill: i === activeIdx ? '#3b82c4' : '#a1a1aa' })
    if (!collapsed) {
      sketchText(s, label, el.x + 30, ry + (rowH - 4) / 2, {
        base: 'middle',
        size: 13,
        bold: i === activeIdx,
        color: i === activeIdx ? '#1a5590' : '#444',
      })
    }
  })
})

r('dropdown-menu', (s, el, st) => {
  const items = pipeListAttr(el, 'items', ['Edit', 'Duplicate', '---', 'Delete'])
  // Drop shadow.
  s.rect(el.x + 3, el.y + 3, el.w, el.h, { fill: 'rgba(0,0,0,0.12)' })
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 1.5 })
  const rowH = 28
  let y = el.y + 6
  for (const item of items) {
    if (y + rowH > el.y + el.h) break
    if (item === '---') {
      sketchLine(s, el.x + 8, y + rowH / 2, el.x + el.w - 8, y + rowH / 2, { stroke: '#e4e4e7' })
    } else {
      sketchText(s, item, el.x + 12, y + rowH / 2, {
        base: 'middle',
        size: 13,
        color: item.toLowerCase() === 'delete' ? '#dc2626' : '#222',
      })
    }
    y += rowH
  }
})

r('tooltip', (s, el) => {
  const arrow = strAttr(el, 'arrow', 'top')
  // Body.
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#1f2937', stroke: '#0f172a', lw: 1, r: 0.4 })
  sketchText(s, el.label || 'Tooltip', el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    size: 12,
    color: '#fff',
  })
  // Arrow triangle pointing the indicated direction.
  const sz = 6
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  let pts: string
  if (arrow === 'bottom') pts = `M ${cx - sz} ${el.y + el.h} L ${cx + sz} ${el.y + el.h} L ${cx} ${el.y + el.h + sz} Z`
  else if (arrow === 'left') pts = `M ${el.x} ${cy - sz} L ${el.x} ${cy + sz} L ${el.x - sz} ${cy} Z`
  else if (arrow === 'right') pts = `M ${el.x + el.w} ${cy - sz} L ${el.x + el.w} ${cy + sz} L ${el.x + el.w + sz} ${cy} Z`
  else pts = `M ${cx - sz} ${el.y} L ${cx + sz} ${el.y} L ${cx} ${el.y - sz} Z`
  s.path(pts, { fill: '#1f2937', stroke: '#0f172a' })
})

r('toast', (s, el) => {
  const variant = strAttr(el, 'variant', 'info')
  const colors: Record<string, { bg: string; ic: string }> = {
    info: { bg: '#1f2937', ic: '#60a5fa' },
    success: { bg: '#14532d', ic: '#22c55e' },
    warn: { bg: '#78350f', ic: '#f59e0b' },
    error: { bg: '#7f1d1d', ic: '#ef4444' },
  }
  const c = colors[variant] ?? colors.info!
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: c.bg, stroke: '#0f172a', lw: 1, r: 0.5 })
  s.arc(el.x + 16, el.y + el.h / 2, 6, { fill: c.ic })
  sketchText(s, el.label || 'Toast notification', el.x + 32, el.y + el.h / 2, {
    base: 'middle',
    size: 13,
    color: '#fff',
  })
})

r('spinner', (s, el) => {
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  const r = Math.min(el.w, el.h) / 2 - 2
  // Three-quarter arc (open from 0 to π/2 means rotation indicator).
  s.arcSegment(cx, cy, r, Math.PI / 2, Math.PI * 2, {
    stroke: strokeColor({ selected: false, hovered: false, inGroup: false }),
    strokeWidth: 3,
    fill: 'transparent',
  })
})

r('skeleton', (s, el) => {
  const lines = clamp(numAttr(el, 'lines', 3), 1, 12)
  const lineH = Math.max(8, Math.min(16, (el.h - (lines - 1) * 6) / lines))
  for (let i = 0; i < lines; i++) {
    const ly = el.y + i * (lineH + 6)
    if (ly + lineH > el.y + el.h) break
    // Last line is shorter (mimics ragged paragraph end).
    const lw = i === lines - 1 ? el.w * 0.65 : el.w
    s.rect(el.x, ly, lw, lineH, { fill: '#e4e4e7' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────────────────────

r('code-block', (s, el) => {
  const lang = strAttr(el, 'lang', '')
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#1e1e2e', stroke: '#3f3f46', lw: 1.5, r: 0.4 })
  if (lang) {
    s.rect(el.x + el.w - 70, el.y + 6, 60, 20, { fill: '#3f3f46', stroke: 'transparent' })
    sketchText(s, lang, el.x + el.w - 40, el.y + 16, {
      align: 'center',
      base: 'middle',
      size: 11,
      color: '#a1a1aa',
      font: 'ui-monospace, monospace',
    })
  }
  const lineCount = Math.max(1, Math.floor((el.h - 24) / 16))
  const text = el.label || 'function example() {\n  return true\n}'
  const lines = text.split('\n').slice(0, lineCount)
  lines.forEach((line, i) => {
    sketchText(s, line, el.x + 12, el.y + 20 + i * 16, {
      size: 12,
      color: '#a5d6ff',
      font: 'ui-monospace, monospace',
    })
  })
})

r('accordion', (s, el, st) => {
  const expanded = boolAttr(el, 'expanded', false)
  const headerH = Math.min(40, el.h)
  // Header.
  sketchRect(s, el.x, el.y, el.w, headerH, { fill: '#f4f4f5', stroke: strokeColor(st), lw: 1 })
  sketchText(s, el.label || 'Section title', el.x + 12, el.y + headerH / 2, {
    base: 'middle',
    bold: true,
    size: 13,
    color: '#222',
  })
  // Chevron — points down when expanded, right when collapsed.
  const chx = el.x + el.w - 16
  const chy = el.y + headerH / 2
  if (expanded) {
    s.path(`M ${chx - 5} ${chy - 3} L ${chx} ${chy + 3} L ${chx + 5} ${chy - 3}`, {
      stroke: '#444',
      strokeWidth: 1.5,
      fill: 'transparent',
    })
  } else {
    s.path(`M ${chx - 3} ${chy - 5} L ${chx + 3} ${chy} L ${chx - 3} ${chy + 5}`, {
      stroke: '#444',
      strokeWidth: 1.5,
      fill: 'transparent',
    })
  }
  // Body (only if expanded and there's room).
  if (expanded && el.h > headerH) {
    sketchRect(s, el.x, el.y + headerH, el.w, el.h - headerH, {
      fill: '#fff',
      stroke: strokeColor(st),
      lw: 1,
    })
    sketchText(s, 'Section content…', el.x + 12, el.y + headerH + 16, {
      size: 12,
      color: '#666',
      italic: true,
    })
  }
})

r('chat-bubble', (s, el) => {
  const side = strAttr(el, 'side', 'left')
  const bg = strAttr(el, 'bubbleColor', side === 'left' ? '#f4f4f5' : '#3b82c4')
  const fg = strAttr(el, 'textColor', side === 'left' ? '#222' : '#fff')
  // Bubble body — rounded by virtue of sketchy edges; tail added below.
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: side === 'left' ? '#d4d4d8' : '#1a5590', lw: 1.5, r: 0.6 })
  // Tail at bottom corner.
  if (side === 'left') {
    s.path(`M ${el.x + 8} ${el.y + el.h} L ${el.x} ${el.y + el.h + 8} L ${el.x + 18} ${el.y + el.h} Z`, {
      fill: bg,
      stroke: '#d4d4d8',
    })
  } else {
    s.path(
      `M ${el.x + el.w - 8} ${el.y + el.h} L ${el.x + el.w} ${el.y + el.h + 8} L ${el.x + el.w - 18} ${el.y + el.h} Z`,
      { fill: bg, stroke: '#1a5590' },
    )
  }
  // Text — wrapped.
  wrapText(s, el.label || 'Message', el.x + 10, el.y + 8, el.w - 20, 16, 99, {
    size: 13,
    color: fg,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Data viz
// ─────────────────────────────────────────────────────────────────────────────

r('chart-bar', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 1 })
  const data = numListAttr(el, 'data', [3, 5, 2, 7, 4, 6, 3])
  const maxV = Math.max(1, ...data)
  const padding = 12
  const innerW = el.w - padding * 2
  const innerH = el.h - padding * 2
  const barGap = 4
  const barW = (innerW - barGap * (data.length - 1)) / data.length
  data.forEach((v, i) => {
    const h = (v / maxV) * innerH
    const bx = el.x + padding + i * (barW + barGap)
    const by = el.y + el.h - padding - h
    sketchRect(s, bx, by, barW, h, { fill: '#3b82c4', stroke: '#1a5590', lw: 1 })
  })
})

r('chart-line', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 1 })
  const data = numListAttr(el, 'data', [3, 5, 2, 7, 4, 8, 6])
  const maxV = Math.max(1, ...data)
  const padding = 12
  const innerW = el.w - padding * 2
  const innerH = el.h - padding * 2
  const stepX = innerW / Math.max(1, data.length - 1)
  // Build path through points with slight wobble.
  let d = ''
  data.forEach((v, i) => {
    const px = el.x + padding + i * stepX
    const py = el.y + el.h - padding - (v / maxV) * innerH
    d += `${i === 0 ? 'M' : ' L'} ${s.jitter(px, 1.5)} ${s.jitter(py, 1.5)}`
  })
  s.path(d, { stroke: '#3b82c4', strokeWidth: 2, fill: 'transparent' })
  // Dots at points.
  data.forEach((v, i) => {
    const px = el.x + padding + i * stepX
    const py = el.y + el.h - padding - (v / maxV) * innerH
    s.arc(px, py, 3, { fill: '#fff', stroke: '#3b82c4', strokeWidth: 1.5 })
  })
})

r('chart-donut', (s, el, st) => {
  const data = numListAttr(el, 'data', [40, 30, 20, 10])
  const total = data.reduce((a, b) => a + b, 0) || 1
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  const r = Math.min(el.w, el.h) / 2 - 6
  const palette = ['#3b82c4', '#22c55e', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4']
  let start = -Math.PI / 2
  data.forEach((v, i) => {
    const angle = (v / total) * Math.PI * 2
    const end = start + angle
    // Filled wedge.
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const large = angle > Math.PI ? 1 : 0
    s.path(`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, {
      fill: palette[i % palette.length]!,
      stroke: '#fff',
      strokeWidth: 1.5,
    })
    start = end
  })
  // Inner hole for donut effect.
  s.arc(cx, cy, r * 0.55, { fill: '#fff', stroke: strokeColor(st), strokeWidth: 1 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Calendar
// ─────────────────────────────────────────────────────────────────────────────

r('calendar', (s, el, st) => {
  const month = clamp(numAttr(el, 'month', 1), 1, 12)
  const year = numAttr(el, 'year', 2026)
  const selected = numAttr(el, 'selected', -1)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekday = new Date(year, month - 1, 1).getDay()

  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 1 })
  // Month header.
  const headerH = 28
  sketchText(s, `${monthNames[month - 1]} ${year}`, el.x + el.w / 2, el.y + headerH / 2, {
    align: 'center',
    base: 'middle',
    size: 13,
    bold: true,
  })
  // Weekday row.
  const weekdayY = el.y + headerH + 8
  const cellW = el.w / 7
  weekdays.forEach((d, i) => {
    sketchText(s, d, el.x + i * cellW + cellW / 2, weekdayY, {
      align: 'center',
      base: 'middle',
      size: 10,
      color: '#888',
      bold: true,
    })
  })
  // Day grid (6 rows max).
  const gridY = weekdayY + 14
  const cellH = (el.y + el.h - gridY - 4) / 6
  for (let day = 1; day <= daysInMonth; day++) {
    const cellIdx = firstWeekday + day - 1
    const row = Math.floor(cellIdx / 7)
    const col = cellIdx % 7
    if (row > 5) break
    const px = el.x + col * cellW + cellW / 2
    const py = gridY + row * cellH + cellH / 2
    if (day === selected) {
      s.arc(px, py, Math.min(cellW, cellH) / 2 - 2, { fill: '#3b82c4' })
    }
    sketchText(s, String(day), px, py, {
      align: 'center',
      base: 'middle',
      size: 11,
      color: day === selected ? '#fff' : '#222',
      bold: day === selected,
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Mobile chrome
// ─────────────────────────────────────────────────────────────────────────────

r('phone-frame', (s, el) => {
  const model = strAttr(el, 'model', 'iphone')
  // Outer body — sketchy rounded rect (corner radius via jitter on extra long edges).
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#1f2937', stroke: '#0f172a', lw: 2.5 })
  // Inner screen.
  const inset = 8
  sketchRect(s, el.x + inset, el.y + inset, el.w - inset * 2, el.h - inset * 2, {
    fill: '#fff',
    stroke: '#0f172a',
    lw: 1,
  })
  // Notch / dynamic island (top center).
  if (model !== 'android') {
    const notchW = el.w * 0.32
    const notchH = 18
    s.rect(el.x + (el.w - notchW) / 2, el.y + inset + 4, notchW, notchH, { fill: '#0f172a' })
  }
  // Side buttons (right side).
  s.rect(el.x + el.w, el.y + el.h * 0.18, 3, el.h * 0.06, { fill: '#0f172a' })
  s.rect(el.x + el.w, el.y + el.h * 0.28, 3, el.h * 0.1, { fill: '#0f172a' })
})

r('status-bar', (s, el) => {
  s.rect(el.x, el.y, el.w, el.h, { fill: el.attrs.bg ? String(el.attrs.bg) : 'transparent' })
  // Time on left.
  sketchText(s, el.label || '9:41', el.x + 14, el.y + el.h / 2, {
    base: 'middle',
    size: 12,
    bold: true,
    color: '#222',
  })
  // Right-side icons: signal bars + wifi + battery.
  const right = el.x + el.w - 12
  // Battery body.
  s.rect(right - 24, el.y + el.h / 2 - 6, 22, 12, { stroke: '#222', strokeWidth: 1 })
  s.rect(right - 22, el.y + el.h / 2 - 4, 12, 8, { fill: '#222' })
  s.rect(right - 2, el.y + el.h / 2 - 3, 2, 6, { fill: '#222' })
  // Wifi icon (3 arcs).
  for (let i = 0; i < 3; i++) {
    s.arcSegment(right - 38, el.y + el.h / 2 + 4, 3 + i * 3, Math.PI + 0.2, -0.2, {
      stroke: '#222',
      strokeWidth: 1,
      fill: 'transparent',
    })
  }
  // Signal bars.
  for (let i = 0; i < 4; i++) {
    const bh = 3 + i * 2
    s.rect(right - 60 + i * 3, el.y + el.h / 2 + 4 - bh, 2, bh, { fill: '#222' })
  }
})

r('home-indicator', (s, el) => {
  const w = Math.min(el.w * 0.32, 140)
  const h = Math.min(el.h, 5)
  s.rect(el.x + (el.w - w) / 2, el.y + (el.h - h) / 2, w, h, { fill: '#222' })
})

r('fab', (s, el, st) => {
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  const r = Math.min(el.w, el.h) / 2 - 2
  // Soft drop shadow.
  s.arc(cx + 2, cy + 3, r, { fill: 'rgba(0,0,0,0.18)' })
  // Body.
  s.arc(s.jitter(cx, 0.4), s.jitter(cy, 0.4), r, {
    fill: '#3b82c4',
    stroke: st.selected ? PALETTE.selection : '#1a5590',
    strokeWidth: 2,
  })
  // Glyph (default '+').
  const glyph = el.label || strAttr(el, 'glyph', '+')
  sketchText(s, glyph, cx, cy, {
    align: 'center',
    base: 'middle',
    size: r * 0.9,
    bold: true,
    color: '#fff',
  })
})

r('app-icon', (s, el) => {
  const bg = strAttr(el, 'bg', '#3b82c4')
  const glyph = strAttr(el, 'glyph', el.label || 'A')
  const badge = numAttr(el, 'badge', 0)
  // Rounded square (sketchy approximation).
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: bg, stroke: 'transparent', r: 1 })
  sketchText(s, glyph, el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    size: el.h * 0.45,
    bold: true,
    color: '#fff',
  })
  if (badge > 0) {
    const br = Math.min(el.w, el.h) * 0.18
    const bcx = el.x + el.w - br + 2
    const bcy = el.y + br - 2
    s.arc(bcx, bcy, br, { fill: '#dc2626', stroke: '#fff', strokeWidth: 1.5 })
    sketchText(s, String(badge), bcx, bcy, {
      align: 'center',
      base: 'middle',
      size: br * 1.1,
      bold: true,
      color: '#fff',
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// System chrome
// ─────────────────────────────────────────────────────────────────────────────

r('window-frame', (s, el) => {
  // macOS-style window with traffic lights and a content area.
  const titleH = 28
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: '#0f172a', lw: 2, r: 0.5 })
  sketchRect(s, el.x, el.y, el.w, titleH, { fill: '#e8e8ee', stroke: '#0f172a', lw: 1 })
  // Traffic lights (red, yellow, green).
  s.arc(el.x + 12, el.y + titleH / 2, 6, { fill: '#ef4444', stroke: '#b91c1c', strokeWidth: 1 })
  s.arc(el.x + 28, el.y + titleH / 2, 6, { fill: '#f59e0b', stroke: '#b45309', strokeWidth: 1 })
  s.arc(el.x + 44, el.y + titleH / 2, 6, { fill: '#22c55e', stroke: '#15803d', strokeWidth: 1 })
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + titleH / 2, {
      align: 'center',
      base: 'middle',
      size: 12,
      bold: true,
      color: '#444',
    })
  }
})

r('browser-frame', (s, el) => {
  // Browser chrome: tabs row + URL bar + content area.
  const tabH = 30
  const urlH = 36
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: '#0f172a', lw: 1.5, r: 0.4 })
  // Tabs strip.
  sketchRect(s, el.x, el.y, el.w, tabH, { fill: '#e2e8f0', stroke: 'transparent' })
  // Active tab.
  const tabsAttr = strAttr(el, 'tabs', 'Boceto · Wireframes that fit in markdown')
  const tabLabels = tabsAttr.split('|').map((t) => t.trim())
  let tx = el.x + 6
  tabLabels.forEach((tabLabel, i) => {
    const tw = Math.min(220, s.measureText(tabLabel, { size: 11 }).width + 36)
    if (i === 0) {
      sketchRect(s, tx, el.y + 4, tw, tabH - 4, { fill: '#fff', stroke: '#cbd5e1', lw: 1, r: 0.5 })
    }
    sketchText(s, tabLabel, tx + 12, el.y + tabH / 2, {
      base: 'middle',
      size: 11,
      color: i === 0 ? '#222' : '#666',
      bold: i === 0,
    })
    // Close × on first tab only.
    if (i === 0) {
      const cx = tx + tw - 10
      const cy = el.y + tabH / 2
      s.line(cx - 3, cy - 3, cx + 3, cy + 3, { stroke: '#999', strokeWidth: 1 })
      s.line(cx + 3, cy - 3, cx - 3, cy + 3, { stroke: '#999', strokeWidth: 1 })
    }
    tx += tw + 4
  })
  // URL bar row.
  sketchRect(s, el.x, el.y + tabH, el.w, urlH, { fill: '#f1f5f9', stroke: 'transparent' })
  // Back/forward/refresh icons.
  s.path(`M ${el.x + 16} ${el.y + tabH + urlH / 2} L ${el.x + 22} ${el.y + tabH + urlH / 2 - 5} M ${el.x + 16} ${el.y + tabH + urlH / 2} L ${el.x + 22} ${el.y + tabH + urlH / 2 + 5}`, { stroke: '#666', strokeWidth: 1.5, fill: 'transparent' })
  s.path(`M ${el.x + 36} ${el.y + tabH + urlH / 2 - 5} L ${el.x + 30} ${el.y + tabH + urlH / 2} L ${el.x + 36} ${el.y + tabH + urlH / 2 + 5}`, { stroke: '#bbb', strokeWidth: 1.5, fill: 'transparent' })
  s.arcSegment(el.x + 50, el.y + tabH + urlH / 2, 6, 0.5, Math.PI * 1.7, { stroke: '#666', strokeWidth: 1.5, fill: 'transparent' })
  // URL pill.
  const urlW = el.w - 80
  sketchRect(s, el.x + 70, el.y + tabH + 6, urlW, urlH - 12, { fill: '#fff', stroke: '#cbd5e1', lw: 1, r: 0.4 })
  const urlText = el.label || 'https://boceto.dev'
  sketchText(s, '🔒 ' + urlText, el.x + 80, el.y + tabH + urlH / 2, {
    base: 'middle',
    size: 12,
    color: '#444',
    font: 'ui-monospace, monospace',
  })
})

r('terminal', (s, el) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#0f172a', stroke: '#020617', lw: 1.5, r: 0.4 })
  // Optional traffic-light header strip when h > 100.
  let bodyY = el.y + 8
  if (el.h > 100) {
    s.rect(el.x, el.y, el.w, 22, { fill: '#1e293b' })
    s.arc(el.x + 12, el.y + 11, 4, { fill: '#ef4444' })
    s.arc(el.x + 26, el.y + 11, 4, { fill: '#f59e0b' })
    s.arc(el.x + 40, el.y + 11, 4, { fill: '#22c55e' })
    bodyY = el.y + 28
  }
  const text = el.label || '$ pnpm test\n✓ 156 passed\n$ '
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const ly = bodyY + 6 + i * 16
    if (ly + 16 > el.y + el.h) return
    sketchText(s, line, el.x + 12, ly, {
      size: 12,
      color: line.startsWith('$') ? '#a5d6ff' : line.startsWith('✓') ? '#86efac' : '#e2e8f0',
      font: 'ui-monospace, monospace',
    })
  })
  // Blinking-cursor approximation: small bar at end of last line.
  const lastLine = lines[lines.length - 1] ?? ''
  const cursorX = el.x + 12 + s.measureText(lastLine, { size: 12, font: 'ui-monospace, monospace' }).width + 2
  const cursorY = bodyY + 6 + (lines.length - 1) * 16
  if (cursorY + 14 <= el.y + el.h) {
    s.rect(cursorX, cursorY, 8, 14, { fill: '#a5d6ff' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Form (long-tail)
// ─────────────────────────────────────────────────────────────────────────────

r('combobox', (s, el, st) => {
  // Input with chevron + open suggestions box below.
  const inputH = Math.min(36, el.h)
  sketchRect(s, el.x, el.y, el.w, inputH, {
    fill: 'rgba(255,255,255,.97)',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  sketchText(s, el.label || 'Type to search…', el.x + 8, el.y + inputH / 2, {
    base: 'middle',
    size: 13,
    color: '#aaa',
    italic: true,
  })
  // Chevron.
  s.path(
    `M ${el.x + el.w - 18} ${el.y + inputH / 2 - 3} L ${el.x + el.w - 10} ${el.y + inputH / 2 + 4} L ${el.x + el.w - 2} ${el.y + inputH / 2 - 3}`,
    { stroke: '#777', strokeWidth: 1.5, fill: 'transparent' },
  )
  // Open suggestions (only if h leaves room).
  if (el.h > inputH + 20) {
    const items = pipeListAttr(el, 'items', ['Apple', 'Banana', 'Cherry'])
    sketchRect(s, el.x, el.y + inputH + 2, el.w, el.h - inputH - 2, {
      fill: '#fff',
      stroke: '#cbd5e1',
      lw: 1,
    })
    const rowH = 28
    items.forEach((label, i) => {
      const ry = el.y + inputH + 6 + i * rowH
      if (ry + rowH > el.y + el.h) return
      if (i === 0) s.rect(el.x + 4, ry, el.w - 8, rowH - 4, { fill: '#e0eefc' })
      sketchText(s, label, el.x + 12, ry + (rowH - 4) / 2, {
        base: 'middle',
        size: 13,
        color: '#222',
      })
    })
  }
})

r('date-picker', (s, el, st) => {
  // Trigger: text field showing date, with calendar icon on the right.
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(255,255,255,.97)',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  sketchText(s, el.label || '2026-03-15', el.x + 12, el.y + el.h / 2, {
    base: 'middle',
    size: 13,
    color: '#222',
  })
  // Calendar icon on right.
  const cx = el.x + el.w - 16
  const cy = el.y + el.h / 2
  s.rect(cx - 7, cy - 7, 14, 13, { stroke: '#666', strokeWidth: 1.2, fill: 'transparent' })
  s.line(cx - 7, cy - 3, cx + 7, cy - 3, { stroke: '#666', strokeWidth: 1 })
  s.rect(cx - 5, cy - 9, 2, 4, { fill: '#666' })
  s.rect(cx + 3, cy - 9, 2, 4, { fill: '#666' })
})

r('color-picker', (s, el, st) => {
  // Color swatch + hex code.
  const swatchSize = el.h - 4
  const color = strAttr(el, 'color', el.label || '#3b82c4')
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(255,255,255,.97)',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  s.rect(el.x + 4, el.y + 2, swatchSize, swatchSize, { fill: color, stroke: '#888', strokeWidth: 1 })
  sketchText(s, color, el.x + swatchSize + 14, el.y + el.h / 2, {
    base: 'middle',
    size: 13,
    color: '#222',
    font: 'ui-monospace, monospace',
  })
})

r('file-upload', (s, el, st) => {
  // Dashed border drop zone with cloud icon.
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: '#f8fafc',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  // Dashed inner border for the drop zone feel.
  s.rect(el.x + 6, el.y + 6, el.w - 12, el.h - 12, {
    fill: 'transparent',
    stroke: '#94a3b8',
    strokeWidth: 1.5,
  })
  // Cloud icon (simplified — three arcs forming the top + flat bottom).
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2 - 8
  s.arc(cx - 8, cy + 2, 8, { fill: '#cbd5e1' })
  s.arc(cx + 4, cy - 2, 10, { fill: '#cbd5e1' })
  s.arc(cx + 14, cy + 4, 7, { fill: '#cbd5e1' })
  s.rect(cx - 16, cy + 4, 36, 8, { fill: '#cbd5e1' })
  // Up arrow inside cloud.
  s.path(`M ${cx} ${cy + 12} L ${cx} ${cy + 2} M ${cx - 4} ${cy + 6} L ${cx} ${cy + 2} L ${cx + 4} ${cy + 6}`, {
    stroke: '#fff',
    strokeWidth: 2,
    fill: 'transparent',
  })
  sketchText(s, el.label || 'Drag & drop files here', el.x + el.w / 2, el.y + el.h - 16, {
    align: 'center',
    base: 'middle',
    size: 12,
    color: '#666',
  })
})

r('rating', (s, el) => {
  const max = clamp(numAttr(el, 'max', 5), 1, 10)
  const value = clamp(numAttr(el, 'value', 4), 0, max)
  const starGap = 4
  const starSize = Math.min(el.h, (el.w - (max - 1) * starGap) / max)
  for (let i = 0; i < max; i++) {
    const cx = el.x + i * (starSize + starGap) + starSize / 2
    const cy = el.y + el.h / 2
    const filled = i < Math.floor(value)
    drawStar(s, cx, cy, starSize / 2, {
      fill: filled ? '#f59e0b' : '#fff',
      stroke: filled ? '#b45309' : '#94a3b8',
      strokeWidth: 1.2,
    })
  }
})

r('otp-input', (s, el, st) => {
  const count = clamp(numAttr(el, 'count', 6), 1, 10)
  const value = strAttr(el, 'value', el.label || '12')
  const gap = 6
  const boxSize = Math.min(el.h, (el.w - (count - 1) * gap) / count)
  for (let i = 0; i < count; i++) {
    const bx = el.x + i * (boxSize + gap)
    const filled = i < value.length
    sketchRect(s, bx, el.y + (el.h - boxSize) / 2, boxSize, boxSize, {
      fill: '#fff',
      stroke: filled ? PALETTE.selection : strokeColor(st),
      lw: filled ? 2 : 1.2,
    })
    if (filled) {
      sketchText(s, value[i] ?? '', bx + boxSize / 2, el.y + el.h / 2, {
        align: 'center',
        base: 'middle',
        size: boxSize * 0.55,
        bold: true,
        color: '#222',
        font: 'ui-monospace, monospace',
      })
    }
  }
})

r('tag-input', (s, el, st) => {
  // Input with tag pills inside.
  const tags = pipeListAttr(el, 'tags', ['design', 'wireframe'])
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(255,255,255,.97)',
    stroke: strokeColor(st),
    lw: 1.5,
  })
  let cx = el.x + 8
  const cy = el.y + el.h / 2
  for (const tag of tags) {
    const tw = s.measureText(tag, { size: 11 }).width + 22
    if (cx + tw > el.x + el.w - 60) break
    sketchRect(s, cx, cy - 10, tw, 20, { fill: '#e0eefc', stroke: '#3b82c4', lw: 1, r: 0.4 })
    sketchText(s, tag, cx + 6, cy, { base: 'middle', size: 11, color: '#1a5590' })
    // × close.
    const xCx = cx + tw - 8
    s.line(xCx - 2, cy - 2, xCx + 2, cy + 2, { stroke: '#1a5590', strokeWidth: 1 })
    s.line(xCx + 2, cy - 2, xCx - 2, cy + 2, { stroke: '#1a5590', strokeWidth: 1 })
    cx += tw + 4
  }
  // Trailing placeholder text for next tag entry.
  sketchText(s, 'Add tag…', cx + 4, cy, { base: 'middle', size: 12, color: '#aaa', italic: true })
})

r('stepper-input', (s, el, st) => {
  const buttonW = el.h
  // Minus button.
  sketchRect(s, el.x, el.y, buttonW, el.h, {
    fill: '#f1f5f9',
    stroke: strokeColor(st),
    lw: 1.2,
  })
  s.line(el.x + buttonW / 2 - 6, el.y + el.h / 2, el.x + buttonW / 2 + 6, el.y + el.h / 2, {
    stroke: '#222',
    strokeWidth: 2,
  })
  // Value field.
  sketchRect(s, el.x + buttonW, el.y, el.w - buttonW * 2, el.h, {
    fill: '#fff',
    stroke: strokeColor(st),
    lw: 1.2,
  })
  const value = strAttr(el, 'value', el.label || '12')
  sketchText(s, value, el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    size: 14,
    bold: true,
    color: '#222',
  })
  // Plus button.
  sketchRect(s, el.x + el.w - buttonW, el.y, buttonW, el.h, {
    fill: '#f1f5f9',
    stroke: strokeColor(st),
    lw: 1.2,
  })
  s.line(el.x + el.w - buttonW / 2 - 6, el.y + el.h / 2, el.x + el.w - buttonW / 2 + 6, el.y + el.h / 2, {
    stroke: '#222',
    strokeWidth: 2,
  })
  s.line(el.x + el.w - buttonW / 2, el.y + el.h / 2 - 6, el.x + el.w - buttonW / 2, el.y + el.h / 2 + 6, {
    stroke: '#222',
    strokeWidth: 2,
  })
})

r('range-slider', (s, el, st) => {
  // Two thumbs on a single track.
  const min = numAttr(el, 'min', 0)
  const max = numAttr(el, 'max', 100)
  const low = clamp(numAttr(el, 'low', min + (max - min) * 0.3), min, max)
  const high = clamp(numAttr(el, 'high', min + (max - min) * 0.7), low, max)
  const lowPct = max === min ? 0 : (low - min) / (max - min)
  const highPct = max === min ? 1 : (high - min) / (max - min)
  const trackY = el.y + el.h / 2
  s.rect(el.x, trackY - 2, el.w, 4, { fill: '#e4e4e7' })
  s.rect(el.x + el.w * lowPct, trackY - 2, el.w * (highPct - lowPct), 4, { fill: '#3b82c4' })
  s.arc(s.jitter(el.x + el.w * lowPct, 0.4), s.jitter(trackY, 0.4), 8, {
    fill: '#fff',
    stroke: strokeColor(st),
    strokeWidth: 2,
  })
  s.arc(s.jitter(el.x + el.w * highPct, 0.4), s.jitter(trackY, 0.4), 8, {
    fill: '#fff',
    stroke: strokeColor(st),
    strokeWidth: 2,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Content (long-tail)
// ─────────────────────────────────────────────────────────────────────────────

r('tree', (s, el, st) => {
  // Indented file-tree style. items use leading "/" per indent level:
  //   items="src|/components|//Button.tsx|/utils|//format.ts"
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 1 })
  const items = pipeListAttr(el, 'items', [
    'src',
    '/components',
    '//Button.tsx',
    '//Card.tsx',
    '/utils',
    '//format.ts',
  ])
  const rowH = 22
  items.forEach((rawItem, i) => {
    const ry = el.y + 8 + i * rowH
    if (ry + rowH > el.y + el.h) return
    const depth = (rawItem.match(/^\/+/) ?? [''])[0]!.length
    const label = rawItem.replace(/^\/+/, '')
    const indent = 8 + depth * 16
    // Folder/file glyph.
    const isFile = label.includes('.')
    sketchText(s, isFile ? '◦' : '▸', el.x + indent, ry + rowH / 2, {
      base: 'middle',
      size: 11,
      color: isFile ? '#94a3b8' : '#666',
    })
    sketchText(s, label, el.x + indent + 16, ry + rowH / 2, {
      base: 'middle',
      size: 12,
      color: '#222',
    })
  })
})

r('stepper', (s, el) => {
  const items = pipeListAttr(el, 'items', ['Account', 'Profile', 'Confirm', 'Done'])
  const current = clamp(numAttr(el, 'current', 1), 0, items.length - 1)
  const stepGap = (el.w - 32 * items.length) / Math.max(1, items.length - 1)
  items.forEach((label, i) => {
    const cx = el.x + 16 + i * (32 + stepGap)
    const cy = el.y + 20
    const done = i < current
    const active = i === current
    s.arc(cx, cy, 14, {
      fill: done ? '#22c55e' : active ? '#3b82c4' : '#fff',
      stroke: done ? '#15803d' : active ? '#1a5590' : '#94a3b8',
      strokeWidth: 1.5,
    })
    sketchText(s, done ? '✓' : String(i + 1), cx, cy, {
      align: 'center',
      base: 'middle',
      size: 13,
      bold: true,
      color: done || active ? '#fff' : '#666',
    })
    sketchText(s, label, cx, cy + 26, {
      align: 'center',
      base: 'top',
      size: 11,
      bold: active,
      color: active ? '#222' : '#666',
    })
    // Connector line to next step.
    if (i < items.length - 1) {
      sketchLine(s, cx + 16, cy, cx + 16 + stepGap, cy, {
        stroke: i < current ? '#22c55e' : '#cbd5e1',
        lw: 2,
      })
    }
  })
})

r('carousel', (s, el, st) => {
  // Wide image area + arrow controls + dot indicators below.
  const dotsH = 18
  sketchRect(s, el.x, el.y, el.w, el.h - dotsH, { fill: '#f1f5f9', stroke: strokeColor(st), lw: 1.5 })
  // Diagonal lines (image placeholder).
  sketchLine(s, el.x + 8, el.y + 8, el.x + el.w - 8, el.y + el.h - dotsH - 8, { stroke: '#cbd5e1' })
  sketchLine(s, el.x + el.w - 8, el.y + 8, el.x + 8, el.y + el.h - dotsH - 8, { stroke: '#cbd5e1' })
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + (el.h - dotsH) / 2 + 16, {
      align: 'center',
      base: 'middle',
      size: 12,
      italic: true,
      color: '#666',
    })
  }
  // Arrow controls.
  const ay = el.y + (el.h - dotsH) / 2
  s.arc(el.x + 14, ay, 12, { fill: 'rgba(0,0,0,0.4)' })
  s.path(`M ${el.x + 18} ${ay - 5} L ${el.x + 12} ${ay} L ${el.x + 18} ${ay + 5}`, {
    stroke: '#fff',
    strokeWidth: 2,
    fill: 'transparent',
  })
  s.arc(el.x + el.w - 14, ay, 12, { fill: 'rgba(0,0,0,0.4)' })
  s.path(
    `M ${el.x + el.w - 18} ${ay - 5} L ${el.x + el.w - 12} ${ay} L ${el.x + el.w - 18} ${ay + 5}`,
    { stroke: '#fff', strokeWidth: 2, fill: 'transparent' },
  )
  // Dots.
  const total = clamp(numAttr(el, 'total', 5), 1, 12)
  const active = clamp(numAttr(el, 'active', 0), 0, total - 1)
  const dotGap = 12
  const dotsW = total * 8 + (total - 1) * (dotGap - 8)
  let dx = el.x + (el.w - dotsW) / 2
  for (let i = 0; i < total; i++) {
    s.arc(dx + 4, el.y + el.h - dotsH / 2, i === active ? 5 : 3, {
      fill: i === active ? '#222' : '#cbd5e1',
    })
    dx += dotGap
  }
})

r('popover', (s, el, st) => {
  const arrow = strAttr(el, 'arrow', 'top')
  // Drop shadow.
  s.rect(el.x + 3, el.y + 3, el.w, el.h, { fill: 'rgba(0,0,0,0.12)' })
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: '#fff',
    stroke: strokeColor(st),
    lw: 1.5,
    r: 0.5,
  })
  // Header (if label present).
  if (el.label) {
    sketchText(s, el.label, el.x + 12, el.y + 16, {
      base: 'middle',
      size: 13,
      bold: true,
      color: '#222',
    })
    sketchLine(s, el.x + 8, el.y + 32, el.x + el.w - 8, el.y + 32, { stroke: '#e4e4e7' })
  }
  // Body content placeholder.
  sketchText(s, 'Popover content goes here.', el.x + 12, el.y + (el.label ? 48 : 20), {
    size: 12,
    color: '#666',
    italic: true,
  })
  // Arrow tail.
  const sz = 8
  let pts: string
  if (arrow === 'bottom') pts = `M ${el.x + el.w / 2 - sz} ${el.y + el.h} L ${el.x + el.w / 2 + sz} ${el.y + el.h} L ${el.x + el.w / 2} ${el.y + el.h + sz} Z`
  else if (arrow === 'left') pts = `M ${el.x} ${el.y + el.h / 2 - sz} L ${el.x} ${el.y + el.h / 2 + sz} L ${el.x - sz} ${el.y + el.h / 2} Z`
  else if (arrow === 'right') pts = `M ${el.x + el.w} ${el.y + el.h / 2 - sz} L ${el.x + el.w} ${el.y + el.h / 2 + sz} L ${el.x + el.w + sz} ${el.y + el.h / 2} Z`
  else pts = `M ${el.x + el.w / 2 - sz} ${el.y} L ${el.x + el.w / 2 + sz} ${el.y} L ${el.x + el.w / 2} ${el.y - sz} Z`
  s.path(pts, { fill: '#fff', stroke: strokeColor(st) })
})

r('kbd', (s, el) => {
  // Keycap-shaped key shortcut display.
  // Drop shadow underneath.
  s.rect(el.x + 1, el.y + 2, el.w, el.h, { fill: '#94a3b8' })
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#f8fafc', stroke: '#475569', lw: 1.2, r: 0.4 })
  sketchText(s, el.label || '⌘K', el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    size: Math.min(13, el.h * 0.55),
    bold: true,
    color: '#222',
    font: 'ui-monospace, monospace',
  })
})

r('quote', (s, el) => {
  // Left border bar + indented italic text.
  s.rect(el.x, el.y, 4, el.h, { fill: '#94a3b8' })
  sketchText(s, '"', el.x + 12, el.y + 4, { size: 32, color: '#cbd5e1' })
  wrapText(s, el.label || 'A short quote that wraps if needed.', el.x + 36, el.y + 16, el.w - 44, 18, 99, {
    size: 14,
    color: '#475569',
    italic: true,
  })
})

r('status-dot', (s, el) => {
  const status = strAttr(el, 'status', el.label || 'online')
  const colors: Record<string, string> = {
    online: '#22c55e',
    away: '#f59e0b',
    offline: '#94a3b8',
    busy: '#dc2626',
  }
  const color = colors[status] ?? colors.online!
  const radius = Math.min(el.w, el.h) / 2 - 1
  s.arc(el.x + el.w / 2, el.y + el.h / 2, radius, { fill: color, stroke: '#fff', strokeWidth: 1.5 })
})

r('notification-bell', (s, el) => {
  const count = numAttr(el, 'count', 3)
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  // Bell shape (simplified: rounded trapezoid + handle).
  const bw = el.w * 0.55
  const bh = el.h * 0.55
  s.path(
    `M ${cx - bw / 2} ${cy + bh / 2 - 4} L ${cx - bw / 2} ${cy - bh / 4} A ${bw / 2} ${bw / 2} 0 0 1 ${cx + bw / 2} ${cy - bh / 4} L ${cx + bw / 2} ${cy + bh / 2 - 4} Z`,
    { fill: '#475569', stroke: '#1e293b', strokeWidth: 1.5 },
  )
  // Clapper.
  s.arc(cx, cy + bh / 2 + 2, 3, { fill: '#475569' })
  // Top stem.
  s.rect(cx - 2, cy - bh / 2 - 4, 4, 4, { fill: '#475569' })
  // Badge.
  if (count > 0) {
    const br = Math.min(el.w, el.h) * 0.22
    const bcx = el.x + el.w - br + 2
    const bcy = el.y + br - 2
    s.arc(bcx, bcy, br, { fill: '#dc2626', stroke: '#fff', strokeWidth: 1.5 })
    sketchText(s, count > 99 ? '99+' : String(count), bcx, bcy, {
      align: 'center',
      base: 'middle',
      size: br * 1,
      bold: true,
      color: '#fff',
    })
  }
})

r('mention', (s, el) => {
  // Inline @name styled — pill background with @ + name.
  const text = '@' + (el.label || 'username')
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#e0eefc', stroke: '#3b82c4', lw: 1, r: 0.5 })
  sketchText(s, text, el.x + el.w / 2, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    size: 12,
    bold: true,
    color: '#1a5590',
  })
})

r('ai-suggestion', (s, el) => {
  // Inline AI suggestion panel: sparkle + suggested text + Tab/accept hint.
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(139,92,246,0.08)',
    stroke: '#8b5cf6',
    lw: 1.5,
    r: 0.5,
  })
  // Sparkle icon.
  sketchText(s, '✦', el.x + 10, el.y + el.h / 2, {
    base: 'middle',
    size: 14,
    color: '#8b5cf6',
  })
  // Suggested text.
  sketchText(s, el.label || 'Apply suggestion', el.x + 32, el.y + el.h / 2, {
    base: 'middle',
    size: 12,
    italic: true,
    color: '#5b21b6',
  })
  // Tab hint on the right.
  const hint = '[Tab]'
  const hintW = s.measureText(hint, { size: 11 }).width
  sketchRect(s, el.x + el.w - hintW - 18, el.y + el.h / 2 - 9, hintW + 12, 18, {
    fill: '#fff',
    stroke: '#8b5cf6',
    lw: 1,
    r: 0.4,
  })
  sketchText(s, hint, el.x + el.w - hintW / 2 - 12, el.y + el.h / 2, {
    align: 'center',
    base: 'middle',
    size: 11,
    bold: true,
    color: '#5b21b6',
    font: 'ui-monospace, monospace',
  })
})

r('presence-cursor', (s, el) => {
  const color = strAttr(el, 'cursorColor', '#dc2626')
  // Cursor arrow shape (Figma/Notion style).
  s.path(
    `M ${el.x} ${el.y} L ${el.x + 12} ${el.y + 12} L ${el.x + 6} ${el.y + 12} L ${el.x + 8} ${el.y + 18} L ${el.x + 5} ${el.y + 19} L ${el.x + 3} ${el.y + 13} L ${el.x} ${el.y + 16} Z`,
    { fill: color, stroke: '#fff', strokeWidth: 1.2 },
  )
  // Name pill next to cursor.
  if (el.label) {
    const pillW = s.measureText(el.label, { size: 11, bold: true }).width + 14
    sketchRect(s, el.x + 14, el.y + 12, pillW, 20, { fill: color, stroke: 'transparent', r: 0.4 })
    sketchText(s, el.label, el.x + 14 + pillW / 2, el.y + 22, {
      align: 'center',
      base: 'middle',
      size: 11,
      bold: true,
      color: '#fff',
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Data viz (long-tail)
// ─────────────────────────────────────────────────────────────────────────────

r('chart-area', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 1 })
  const data = numListAttr(el, 'data', [3, 5, 2, 7, 4, 8, 6])
  const maxV = Math.max(1, ...data)
  const padding = 12
  const innerW = el.w - padding * 2
  const innerH = el.h - padding * 2
  const stepX = innerW / Math.max(1, data.length - 1)
  // Build filled path.
  let d = `M ${el.x + padding} ${el.y + el.h - padding}`
  data.forEach((v, i) => {
    const px = el.x + padding + i * stepX
    const py = el.y + el.h - padding - (v / maxV) * innerH
    d += ` L ${s.jitter(px, 1)} ${s.jitter(py, 1)}`
  })
  d += ` L ${el.x + el.w - padding} ${el.y + el.h - padding} Z`
  s.path(d, { fill: 'rgba(59,130,196,0.25)', stroke: '#3b82c4', strokeWidth: 2 })
})

r('chart-sparkline', (s, el) => {
  // Tiny inline trend; no axes, no padding, no background.
  const data = numListAttr(el, 'data', [3, 5, 2, 7, 4, 8, 6, 9, 5, 7])
  const maxV = Math.max(...data)
  const minV = Math.min(...data)
  const range = Math.max(1, maxV - minV)
  const stepX = el.w / Math.max(1, data.length - 1)
  let d = ''
  data.forEach((v, i) => {
    const px = el.x + i * stepX
    const py = el.y + el.h - ((v - minV) / range) * el.h
    d += `${i === 0 ? 'M' : ' L'} ${px.toFixed(1)} ${py.toFixed(1)}`
  })
  s.path(d, { stroke: '#3b82c4', strokeWidth: 1.5, fill: 'transparent' })
  // Endpoint dot.
  const lastPx = el.x + (data.length - 1) * stepX
  const lastPy = el.y + el.h - ((data[data.length - 1]! - minV) / range) * el.h
  s.arc(lastPx, lastPy, 2.5, { fill: '#3b82c4' })
})

r('gantt', (s, el, st) => {
  // Horizontal bars on a time axis. items="Design:0:3|Build:2:6|Ship:5:7"
  // Format: name:startWeek:endWeek (week index, 0-based out of `total` weeks).
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 1 })
  const total = numAttr(el, 'total', 8)
  const labelW = 80
  // Tick lines.
  for (let i = 0; i <= total; i++) {
    const x = el.x + labelW + (i * (el.w - labelW)) / total
    s.line(x, el.y + 8, x, el.y + el.h - 8, { stroke: '#e4e4e7', strokeWidth: 1 })
  }
  const tasksAttr = strAttr(el, 'tasks', '')
  const tasks = tasksAttr
    ? tasksAttr.split('|').map((t) => {
        const [name, startStr, endStr] = t.split(':')
        return { name: name?.trim() ?? '', start: Number(startStr), end: Number(endStr) }
      })
    : [
        { name: 'Design', start: 0, end: 3 },
        { name: 'Build', start: 2, end: 6 },
        { name: 'QA', start: 5, end: 7 },
        { name: 'Ship', start: 7, end: 8 },
      ]
  const rowH = (el.h - 16) / Math.max(1, tasks.length)
  tasks.forEach((task, i) => {
    const ry = el.y + 8 + i * rowH
    sketchText(s, task.name, el.x + 8, ry + rowH / 2, {
      base: 'middle',
      size: 11,
      color: '#222',
    })
    const bx = el.x + labelW + (task.start * (el.w - labelW)) / total
    const bw = ((task.end - task.start) * (el.w - labelW)) / total
    sketchRect(s, bx, ry + 4, bw, rowH - 8, {
      fill: '#3b82c4',
      stroke: '#1a5590',
      lw: 1,
      r: 0.4,
    })
  })
})

r('heatmap', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#fff', stroke: strokeColor(st), lw: 1 })
  const cols = clamp(numAttr(el, 'cols', 12), 1, 50)
  const rows = clamp(numAttr(el, 'rows', 7), 1, 20)
  const padding = 8
  const cw = (el.w - padding * 2) / cols
  const ch = (el.h - padding * 2) / rows
  // Pseudo-random intensity per cell (deterministic via jitter seed).
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      // Use jitter to derive an intensity 0..1 for variety.
      const v = (s.jitter(0.5, 1) + 0.5) % 1
      const alpha = 0.1 + v * 0.85
      s.rect(el.x + padding + c * cw, el.y + padding + row * ch, cw - 1, ch - 1, {
        fill: `rgba(34,197,94,${alpha.toFixed(2)})`,
      })
    }
  }
})

r('map', (s, el, st) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#e0e7ff', stroke: strokeColor(st), lw: 1 })
  // Curvy "roads" — a few wobbly lines.
  for (let i = 0; i < 5; i++) {
    const y1 = el.y + 20 + i * (el.h / 6)
    const cy = y1 + (i % 2 === 0 ? 12 : -12)
    s.path(
      `M ${el.x} ${y1} Q ${el.x + el.w / 2} ${cy} ${el.x + el.w} ${y1 + (i % 2 === 0 ? 8 : -8)}`,
      { stroke: '#fff', strokeWidth: 3, fill: 'transparent' },
    )
  }
  // Map pin.
  const px = el.x + el.w / 2
  const py = el.y + el.h / 2 - 8
  s.path(
    `M ${px} ${py - 14} A 8 8 0 1 1 ${px - 0.001} ${py - 14} L ${px} ${py + 4} Z`,
    { fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 1.5 },
  )
  s.arc(px, py - 8, 3, { fill: '#fff' })
  if (el.label) {
    sketchText(s, el.label, px, py + 20, {
      align: 'center',
      base: 'top',
      size: 12,
      bold: true,
      color: '#222',
    })
  }
})

r('code-diff', (s, el) => {
  sketchRect(s, el.x, el.y, el.w, el.h, { fill: '#1e293b', stroke: '#0f172a', lw: 1.5, r: 0.4 })
  // Default sample diff if no label provided.
  const text = el.label || '- function old() {}\n+ function newer() {\n+   return true\n+ }\n  // unchanged'
  const lines = text.split('\n')
  const lineH = 16
  const maxLines = Math.floor((el.h - 12) / lineH)
  lines.slice(0, maxLines).forEach((line, i) => {
    const ly = el.y + 8 + i * lineH
    let bgColor = ''
    let prefix = ' '
    let textColor = '#e2e8f0'
    if (line.startsWith('+')) {
      bgColor = 'rgba(34,197,94,0.18)'
      textColor = '#86efac'
      prefix = '+'
    } else if (line.startsWith('-')) {
      bgColor = 'rgba(239,68,68,0.18)'
      textColor = '#fca5a5'
      prefix = '-'
    }
    if (bgColor) s.rect(el.x + 1, ly, el.w - 2, lineH, { fill: bgColor })
    sketchText(s, prefix, el.x + 8, ly + lineH / 2, {
      base: 'middle',
      size: 12,
      color: textColor,
      font: 'ui-monospace, monospace',
    })
    sketchText(s, line.replace(/^[+\-]\s?/, ''), el.x + 24, ly + lineH / 2, {
      base: 'middle',
      size: 12,
      color: textColor,
      font: 'ui-monospace, monospace',
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AR / spatial (visionOS / WebXR)
// ─────────────────────────────────────────────────────────────────────────────

r('glass-window', (s, el) => {
  // visionOS-style translucent rounded window with bottom handle bar.
  // Soft shadow.
  sketchRect(s, el.x + 4, el.y + 6, el.w, el.h, { fill: 'rgba(0,0,0,0.18)' })
  // Glass body — light fill with high transparency simulation.
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: 'rgba(241,245,249,0.85)',
    stroke: 'rgba(255,255,255,0.7)',
    lw: 1.5,
    r: 1,
  })
  // Inner subtle highlight.
  s.rect(el.x + 2, el.y + 2, el.w - 4, 2, { fill: 'rgba(255,255,255,0.55)' })
  // Handle bar at bottom (visionOS pattern).
  const handleW = Math.min(el.w * 0.18, 80)
  s.rect(el.x + (el.w - handleW) / 2, el.y + el.h + 8, handleW, 5, {
    fill: 'rgba(100,116,139,0.6)',
  })
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + 18, {
      align: 'center',
      base: 'middle',
      size: 14,
      bold: true,
      color: '#222',
    })
  }
})

r('gaze-cursor', (s, el) => {
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  const r = Math.min(el.w, el.h) / 2 - 3
  // Outer ring.
  s.arc(cx, cy, r, { stroke: '#3b82c4', strokeWidth: 2, fill: 'transparent' })
  // Inner dot.
  s.arc(cx, cy, Math.max(2, r * 0.18), { fill: '#3b82c4' })
})

r('pinch-indicator', (s, el) => {
  // Two small circles representing thumb + index meeting (pinch gesture).
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  const r = Math.min(el.w, el.h) / 4
  s.arc(cx - r * 0.7, cy, r, { fill: 'rgba(255,255,255,0.85)', stroke: '#0f172a', strokeWidth: 1.5 })
  s.arc(cx + r * 0.7, cy, r, { fill: 'rgba(255,255,255,0.85)', stroke: '#0f172a', strokeWidth: 1.5 })
  // Spark / contact dot in the middle.
  s.arc(cx, cy, 3, { fill: '#3b82c4' })
  // Faint glow ring.
  s.arc(cx, cy, r * 1.6, { stroke: 'rgba(59,130,196,0.4)', strokeWidth: 1, fill: 'transparent' })
})

r('volumetric-scene', (s, el, st) => {
  // Simplified 3D scene placeholder: stage floor with perspective grid + a cube.
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: '#1e293b',
    stroke: strokeColor(st),
    lw: 1.5,
    r: 0.4,
  })
  // Perspective floor grid.
  const horizon = el.y + el.h * 0.55
  for (let i = 0; i <= 6; i++) {
    const x = el.x + (i / 6) * el.w
    s.path(
      `M ${x} ${horizon} L ${el.x + el.w * (0.2 + 0.6 * (i / 6))} ${el.y + el.h - 4}`,
      { stroke: 'rgba(148,163,184,0.4)', strokeWidth: 1, fill: 'transparent' },
    )
  }
  for (let i = 1; i <= 3; i++) {
    const y = horizon + (i / 3) * (el.h - (horizon - el.y) - 8)
    sketchLine(s, el.x + el.w * 0.18, y, el.x + el.w * 0.82, y, {
      stroke: 'rgba(148,163,184,0.3)',
      lw: 1,
    })
  }
  // Cube on the stage.
  const cx = el.x + el.w / 2
  const cy = el.y + el.h * 0.62
  const cs = Math.min(el.w, el.h) * 0.15
  // Front face.
  s.path(`M ${cx - cs / 2} ${cy} L ${cx + cs / 2} ${cy} L ${cx + cs / 2} ${cy + cs} L ${cx - cs / 2} ${cy + cs} Z`, {
    fill: '#475569',
    stroke: '#94a3b8',
    strokeWidth: 1.5,
  })
  // Top face.
  s.path(
    `M ${cx - cs / 2} ${cy} L ${cx - cs / 2 + cs * 0.4} ${cy - cs * 0.4} L ${cx + cs / 2 + cs * 0.4} ${cy - cs * 0.4} L ${cx + cs / 2} ${cy} Z`,
    { fill: '#64748b', stroke: '#94a3b8', strokeWidth: 1.5 },
  )
  // Right face.
  s.path(
    `M ${cx + cs / 2} ${cy} L ${cx + cs / 2 + cs * 0.4} ${cy - cs * 0.4} L ${cx + cs / 2 + cs * 0.4} ${cy + cs * 0.6} L ${cx + cs / 2} ${cy + cs} Z`,
    { fill: '#334155', stroke: '#94a3b8', strokeWidth: 1.5 },
  )
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + 16, {
      align: 'center',
      base: 'middle',
      size: 12,
      italic: true,
      color: '#cbd5e1',
    })
  }
})

r('passthrough-frame', (s, el) => {
  // Camera-edge fade indicator — outer dark frame with inner clear area.
  const inset = 10
  // Outer dark border.
  s.rect(el.x, el.y, el.w, inset, { fill: 'rgba(15,23,42,0.85)' })
  s.rect(el.x, el.y + el.h - inset, el.w, inset, { fill: 'rgba(15,23,42,0.85)' })
  s.rect(el.x, el.y + inset, inset, el.h - inset * 2, { fill: 'rgba(15,23,42,0.85)' })
  s.rect(el.x + el.w - inset, el.y + inset, inset, el.h - inset * 2, { fill: 'rgba(15,23,42,0.85)' })
  // Inner sketchy frame.
  sketchRect(s, el.x + inset, el.y + inset, el.w - inset * 2, el.h - inset * 2, {
    fill: 'transparent',
    stroke: '#94a3b8',
    lw: 1.5,
  })
  // "Live" indicator dot top-right.
  s.arc(el.x + el.w - 18, el.y + 18, 5, { fill: '#dc2626', stroke: '#fff', strokeWidth: 1 })
  sketchText(s, el.label || 'PASSTHROUGH', el.x + el.w / 2, el.y + el.h - inset / 2, {
    align: 'center',
    base: 'middle',
    size: 10,
    bold: true,
    color: '#fff',
  })
})

r('voice-input', (s, el) => {
  // Listening waveform indicator.
  sketchRect(s, el.x, el.y, el.w, el.h, {
    fill: '#0f172a',
    stroke: '#3b82c4',
    lw: 2,
    r: 1,
  })
  // Waveform bars.
  const barCount = 12
  const barGap = 4
  const totalGap = (barCount - 1) * barGap
  const barW = (el.w * 0.7 - totalGap) / barCount
  const startX = el.x + (el.w - barW * barCount - totalGap) / 2
  for (let i = 0; i < barCount; i++) {
    // Bars vary in height — taller in the middle.
    const dist = Math.abs(i - barCount / 2) / (barCount / 2)
    const heightFactor = 0.4 + (1 - dist) * 0.6
    const bh = el.h * 0.55 * heightFactor
    s.rect(startX + i * (barW + barGap), el.y + (el.h - bh) / 2, barW, bh, {
      fill: '#3b82c4',
    })
  }
  if (el.label) {
    sketchText(s, el.label, el.x + el.w / 2, el.y + el.h - 10, {
      align: 'center',
      base: 'middle',
      size: 11,
      bold: true,
      color: '#94a3b8',
    })
  }
})

// ── helpers ──

function selDash(s: Surface, el: Element, st: DrawState): void {
  s.rect(el.x - 2, el.y - 2, el.w + 4, el.h + 4, {
    stroke: strokeColor(st),
    strokeWidth: 1,
  })
}

function numAttr(el: Element, key: string, fallback: number): number {
  const v = el.attrs[key]
  return typeof v === 'number' ? v : fallback
}

function strAttr(el: Element, key: string, fallback: string): string {
  const v = el.attrs[key]
  return typeof v === 'string' ? v : fallback
}

function pipeListAttr(el: Element, key: string, fallback: string[]): string[] {
  const v = el.attrs[key]
  if (typeof v !== 'string' || v === '') return fallback
  return v.split('|').map((x) => x.trim())
}

function numListAttr(el: Element, key: string, fallback: number[]): number[] {
  const v = el.attrs[key]
  if (typeof v !== 'string' || v === '') return fallback
  const out: number[] = []
  for (const part of v.split(',')) {
    const n = Number(part.trim())
    if (Number.isFinite(n)) out.push(n)
  }
  return out.length ? out : fallback
}

function boolAttr(el: Element, key: string, fallback: boolean): boolean {
  const v = el.attrs[key]
  if (v === undefined) return fallback
  if (typeof v === 'number') return v !== 0
  return v === 'true' || v === 'yes' || v === '1' || v === ''
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Draws a 5-pointed star centered at (cx, cy) with outer radius `r`. */
function drawStar(
  s: Surface,
  cx: number,
  cy: number,
  r: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number },
): void {
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const radius = i % 2 === 0 ? r : r * 0.45
    const px = cx + Math.cos(angle) * radius
    const py = cy + Math.sin(angle) * radius
    points.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`)
  }
  s.path(points.join(' ') + ' Z', opts)
}
