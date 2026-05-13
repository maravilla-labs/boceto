import type { Code, Html, Root } from 'mdast'
import { visit } from 'unist-util-visit'
import { parse, SvgRenderer } from '@boceto/core'

export interface RemarkBocetoOptions {
  /**
   * Output mode.
   *  - `'wc'` (default): emit `<boceto-view>` custom element. Requires the WC
   *    runtime in the browser.
   *  - `'svg'`: parse the source and inline a complete `<svg>` document.
   *    Renders with **zero JS at runtime** — works in GitHub READMEs, RSS
   *    readers, and SSGs.
   */
  mode?: 'wc' | 'svg'
  /** Tag to emit in `'wc'` mode. Default `'boceto-view'`. Use `'boceto-edit'` for editable blocks. */
  tag?: string
  /** Extra static attributes to attach to every emitted element (`'wc'` mode only). */
  attributes?: Record<string, string>
  /** SVG render dimensions (`'svg'` mode only). Defaults: 860 × 600. */
  width?: number
  height?: number
  /**
   * Receive the boceto source and return arbitrary HTML. If provided, all
   * other options are ignored. Use this if you want a custom wrapper or to
   * swap renderers entirely.
   */
  render?: (source: string, info: { lang: string; meta: string | null }) => string
}

export type Plugin = () => (tree: Root) => void

/**
 * remark plugin that transforms `code` nodes whose language is `boceto`
 * into `html` nodes.
 *
 * - `mode: 'wc'` (default): emits `<boceto-view code="…">`.
 * - `mode: 'svg'`: emits a full `<svg>…</svg>` rendered server-side.
 */
export default function remarkBoceto(options: RemarkBocetoOptions = {}): (tree: Root) => void {
  const mode = options.mode ?? 'wc'
  const tag = options.tag ?? 'boceto-view'
  const extraAttrs = options.attributes ?? {}
  const width = options.width ?? 860
  const height = options.height ?? 600
  const svgRenderer = mode === 'svg' ? new SvgRenderer() : null

  return (tree) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || index == null) return
      if ((node.lang ?? '') !== 'boceto') return

      const source = node.value
      const meta = node.meta ?? null

      let html: string
      if (options.render) {
        html = options.render(source, { lang: 'boceto', meta })
      } else if (mode === 'svg') {
        // Boceto fence body doesn't include the fence markers; wrap so the
        // parser sees a valid block. The page name comes from `meta`.
        const wrapped = '```boceto' + (meta ? ':' + meta : '') + '\n' + source + '\n```'
        const doc = parse(wrapped)
        html = svgRenderer!.renderToString(doc, { width, height })
      } else {
        const attrs: Record<string, string> = { ...extraAttrs, code: source }
        if (meta) attrs['data-page'] = meta.trim()
        html = renderTag(tag, attrs)
      }

      const replacement: Html = { type: 'html', value: html }
      parent.children[index] = replacement
    })
  }
}

function renderTag(tag: string, attrs: Record<string, string>): string {
  const parts = [tag]
  for (const [k, v] of Object.entries(attrs)) parts.push(`${k}="${escapeAttr(v)}"`)
  return `<${parts.join(' ')}></${tag}>`
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
