import type {
  AttrValue,
  BocetoDoc,
  Component,
  ComponentInstance,
  Element,
  Page,
  PageItem,
} from './types'
import { isComponentInstance } from './types'

export interface SerializeOptions {
  /**
   * Output format. `markdown` (default) wraps content in fenced `boceto`
   * blocks; `boceto` emits a standalone .boceto file with `---` page
   * separators.
   */
  format?: 'markdown' | 'boceto'
}

export function serialize(doc: BocetoDoc, options: SerializeOptions = {}): string {
  const format = options.format ?? 'markdown'
  const blocks: string[] = []

  // Component definitions go in their own leading block (no page name) so
  // diffs of authored vs round-tripped output stay clean and definitions
  // don't get mixed with page content.
  if (doc.components.length > 0) {
    const defs = doc.components.map(serializeComponent).join('\n\n')
    blocks.push(format === 'markdown' ? '```boceto\n' + defs + '\n```' : defs)
  }

  for (const page of doc.pages) {
    blocks.push(serializePage(page, format))
  }
  return format === 'markdown' ? blocks.join('\n\n') : blocks.join('\n\n')
}

function serializePage(page: Page, format: 'markdown' | 'boceto'): string {
  const body = serializePageBody(page)
  if (format === 'markdown') return '```boceto:' + page.name + '\n' + body + '\n```'
  return `--- ${page.name}\n${body}`
}

function serializePageBody(page: Page): string {
  const lines: string[] = []
  for (const item of page.elements) {
    lines.push(isComponentInstance(item) ? serializeInstance(item) : serializeElement(item))
  }
  for (const ar of page.arrows) {
    const label = ar.label ? ` ${quote(ar.label)}` : ''
    lines.push(`arrow ${ar.from} ${ar.to}${label}`)
  }
  return lines.join('\n')
}

function serializeComponent(c: Component): string {
  const header = `component ${c.name}${c.params.length ? '(' + c.params.join(', ') + ')' : ''}`
  const bodyLines: string[] = []
  for (const item of c.body) {
    if ('from' in item && 'to' in item) {
      const label = item.label ? ` ${quote(item.label)}` : ''
      bodyLines.push(`  arrow ${item.from} ${item.to}${label}`)
    } else {
      bodyLines.push('  ' + serializeElement(item))
    }
  }
  bodyLines.push('end')
  return `${header}\n${bodyLines.join('\n')}`
}

const AUTO_ID_RE = /^p\d+e\d+$/
const AUTO_INSTANCE_ID_RE = /^p\d+c\d+$/
const NAMED_ID_RE = /^[A-Za-z][A-Za-z0-9_-]*$/

function serializeElement(el: Element): string {
  const isAuto = AUTO_ID_RE.test(el.id) || el.id.includes('.') /* expanded child */
  if (!isAuto && !NAMED_ID_RE.test(el.id)) {
    throw new Error(
      `Cannot serialize element with id "${el.id}": ids must match [A-Za-z][A-Za-z0-9_-]*`,
    )
  }
  const typeToken = isAuto ? el.type : `${el.type}#${el.id}`

  const parts = [
    'element',
    typeToken,
    String(el.x),
    String(el.y),
    String(el.w),
    String(el.h),
    quote(el.label),
  ]
  if (el.note !== undefined && el.note !== '') parts.push(quote(el.note))
  for (const [k, v] of Object.entries(el.attrs)) parts.push(`${k}=${formatAttr(v)}`)
  return parts.join(' ')
}

function serializeInstance(ci: ComponentInstance): string {
  const isAuto = AUTO_INSTANCE_ID_RE.test(ci.id)
  if (!isAuto && !NAMED_ID_RE.test(ci.id)) {
    throw new Error(
      `Cannot serialize component instance with id "${ci.id}": ids must match [A-Za-z][A-Za-z0-9_-]*`,
    )
  }
  const typeToken = isAuto ? ci.componentName : `${ci.componentName}#${ci.id}`
  const parts = [
    'element',
    typeToken,
    String(ci.x),
    String(ci.y),
    String(ci.w),
    String(ci.h),
    '""',
  ]
  for (const [k, v] of Object.entries(ci.params)) parts.push(`${k}=${formatAttr(v)}`)
  return parts.join(' ')
}

function quote(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

function formatAttr(v: AttrValue): string {
  if (typeof v === 'number') return String(v)
  if (/[\s"\\]/.test(v)) {
    return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }
  return v
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export PageItem helpers for callers that need them
// ─────────────────────────────────────────────────────────────────────────────

export type { PageItem }
