import type MarkdownIt from 'markdown-it'
import { parse, SvgRenderer } from '@boceto/core'

export interface MarkdownItBocetoOptions {
  /**
   * Output mode.
   *  - `'wc'` (default): emit `<boceto-view>` custom element.
   *  - `'svg'`: parse the source and inline a complete `<svg>` document.
   */
  mode?: 'wc' | 'svg'
  /** Tag to emit in `'wc'` mode. Default `'boceto-view'`. */
  tag?: string
  /** Extra static attributes to attach to every emitted element (`'wc'` mode only). */
  attributes?: Record<string, string>
  /** SVG render dimensions (`'svg'` mode only). Defaults: 860 × 600. */
  width?: number
  height?: number
  /**
   * Custom renderer. If provided, all other options are ignored.
   */
  render?: (source: string, info: { lang: string; meta: string }) => string
}

/**
 * markdown-it plugin: replaces fenced ```boceto blocks with either
 * `<boceto-view>` (default) or inline `<svg>` (mode: 'svg').
 */
export default function markdownItBoceto(
  md: MarkdownIt,
  options: MarkdownItBocetoOptions = {},
): void {
  const mode = options.mode ?? 'wc'
  const tag = options.tag ?? 'boceto-view'
  const extraAttrs = options.attributes ?? {}
  const width = options.width ?? 860
  const height = options.height ?? 600
  const svgRenderer = mode === 'svg' ? new SvgRenderer() : null
  const defaultFence = md.renderer.rules.fence

  md.renderer.rules.fence = function (tokens, idx, opts, env, self) {
    const token = tokens[idx]!
    const info = (token.info ?? '').trim()
    const [lang, ...metaParts] = info.split(/\s+/)
    if (lang !== 'boceto') {
      return defaultFence ? defaultFence(tokens, idx, opts, env, self) : ''
    }
    const meta = metaParts.join(' ')
    const source = token.content
    if (options.render) {
      return options.render(source, { lang, meta })
    }
    if (mode === 'svg') {
      const wrapped = '```boceto' + (meta ? ':' + meta : '') + '\n' + source + '\n```'
      const doc = parse(wrapped)
      return svgRenderer!.renderToString(doc, { width, height }) + '\n'
    }
    const attrs: Record<string, string> = { ...extraAttrs, code: source }
    if (meta) attrs['data-page'] = meta
    return renderTag(tag, attrs) + '\n'
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
