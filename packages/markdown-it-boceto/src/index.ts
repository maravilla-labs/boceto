import type MarkdownIt from 'markdown-it'
import { applyFlexLayout, pageContentBox, parse, selectPage, SvgRenderer } from '@boceto/core'

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
  /**
   * SVG sizing strategy (`'svg'` mode only).
   *  - `'content'` (default): canvas grows to fit the page's content plus
   *    `padding`. `width` / `height`, if set, act as a **minimum floor** —
   *    same semantics as `<boceto-view fit="content">`.
   *  - `'fixed'`: legacy behavior — canvas is exactly `width × height`
   *    (defaults `860 × 600`), content outside is clipped.
   *
   * Can be overridden per fence: ` ```boceto fit=fixed `.
   */
  fit?: 'content' | 'fixed'
  /**
   * SVG canvas dimensions (`'svg'` mode only).
   * In `fit: 'content'` (default) these are floors — the canvas only grows.
   * In `fit: 'fixed'` they are the exact canvas size (defaults 860 / 600).
   *
   * Can be overridden per fence: ` ```boceto width=1280 height=800 `.
   */
  width?: number
  height?: number
  /**
   * Breathing room around content in `fit: 'content'` mode. Default `16`.
   * Can be overridden per fence: ` ```boceto padding=32 `.
   */
  padding?: number
  /**
   * Custom renderer. If provided, all other options are ignored.
   */
  render?: (source: string, info: { lang: string; meta: string }) => string
}

type FenceOpts = { fit?: 'content' | 'fixed'; width?: number; height?: number; padding?: number }

/**
 * Parse the fence info-string portion after `boceto`. Recognized `key=value`
 * tokens (`fit`, `width`, `height`, `padding`) are extracted as per-fence
 * overrides; everything else is joined back as the page name. Unknown keys
 * or invalid values fall through to the page name.
 */
function parseFenceMeta(meta: string): { page: string | null; opts: FenceOpts } {
  if (!meta) return { page: null, opts: {} }
  const opts: FenceOpts = {}
  const rest: string[] = []
  for (const tok of meta.trim().split(/\s+/)) {
    if (!tok) continue
    const eq = tok.indexOf('=')
    if (eq > 0) {
      const key = tok.slice(0, eq)
      const val = tok.slice(eq + 1)
      if (key === 'fit' && (val === 'content' || val === 'fixed')) {
        opts.fit = val
        continue
      }
      if (key === 'width' || key === 'height' || key === 'padding') {
        const n = Number(val)
        if (Number.isFinite(n) && n >= 0) {
          opts[key] = n
          continue
        }
      }
    }
    rest.push(tok)
  }
  return { page: rest.length ? rest.join(' ') : null, opts }
}

/**
 * markdown-it plugin: replaces fenced ```boceto blocks with either
 * `<boceto-view>` (default) or inline `<svg>` (mode: 'svg').
 *
 * **`mode: 'svg'` requires pre-initialization.** Because markdown-it's render
 * pipeline is synchronous, the host application must `await initYoga()` from
 * `@boceto/core` once before calling `md.render(...)`. If that hasn't
 * happened, the layout pass will throw with a descriptive error.
 *
 * In SVG mode each fence auto-sizes to its content by default (plus 16px
 * padding); `width` / `height` act as minimum floors. Pass `fit: 'fixed'`
 * for a fixed canvas. Per-fence overrides via the info string:
 * ` ```boceto Login width=1280 fit=content `.
 */
export default function markdownItBoceto(
  md: MarkdownIt,
  options: MarkdownItBocetoOptions = {},
): void {
  const mode = options.mode ?? 'wc'
  const tag = options.tag ?? 'boceto-view'
  const extraAttrs = options.attributes ?? {}
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
    const { page: pageName, opts: fence } = parseFenceMeta(meta)
    if (mode === 'svg') {
      const fit = fence.fit ?? options.fit ?? 'content'
      const padding = fence.padding ?? options.padding ?? 16
      const minW = fence.width ?? options.width
      const minH = fence.height ?? options.height
      const wrapped = '```boceto' + (pageName ? ':' + pageName : '') + '\n' + source + '\n```'
      const doc = applyFlexLayout(parse(wrapped))
      let w: number, h: number
      if (fit === 'fixed') {
        w = minW ?? 860
        h = minH ?? 600
      } else {
        const pg = selectPage(doc)
        const box = pg ? pageContentBox(pg.elements) : null
        if (box) {
          w = Math.max(minW ?? 0, Math.ceil(box.x + box.w + padding))
          h = Math.max(minH ?? 0, Math.ceil(box.y + box.h + padding))
        } else {
          w = minW ?? 860
          h = minH ?? 600
        }
      }
      return svgRenderer!.renderToString(doc, { width: w, height: h }) + '\n'
    }
    const attrs: Record<string, string> = { ...extraAttrs, code: source }
    if (pageName) attrs['data-page'] = pageName
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
