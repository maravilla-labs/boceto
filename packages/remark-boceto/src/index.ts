import type { Code, Html, Root } from 'mdast'
import { visit } from 'unist-util-visit'
import { applyFlexLayout, initYoga, pageContentBox, parse, selectPage, SvgRenderer } from '@boceto/core'

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
   * Breathing room around content in `fit: 'content'` mode. Default `16`,
   * matching `<boceto-view>`'s `padding` attribute. Can be overridden per
   * fence: ` ```boceto padding=32 `.
   */
  padding?: number
  /**
   * Receive the boceto source and return arbitrary HTML. If provided, all
   * other options are ignored. Use this if you want a custom wrapper or to
   * swap renderers entirely.
   */
  render?: (source: string, info: { lang: string; meta: string | null }) => string
}

export type Plugin = () => (tree: Root) => void | Promise<void>

type FenceOpts = { fit?: 'content' | 'fixed'; width?: number; height?: number; padding?: number }

/**
 * Parse the fence info-string portion after `boceto`. Recognized `key=value`
 * tokens (`fit`, `width`, `height`, `padding`) are extracted as per-fence
 * overrides; everything else is joined back as the page name (preserving the
 * original meta semantics). Unknown keys or invalid values fall through to
 * the page name — no throws on typos.
 */
function parseFenceMeta(meta: string | null): { page: string | null; opts: FenceOpts } {
  if (!meta) return { page: null, opts: {} }
  const opts: FenceOpts = {}
  const rest: string[] = []
  for (const tok of meta.trim().split(/\s+/)) {
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
 * remark plugin that transforms `code` nodes whose language is `boceto`
 * into `html` nodes.
 *
 * - `mode: 'wc'` (default): emits `<boceto-view code="…">`.
 * - `mode: 'svg'`: emits a full `<svg>…</svg>` rendered server-side. The
 *   transformer is async in this mode so it can `await initYoga()` once
 *   before resolving FlexContainer layout. By default each fence auto-sizes
 *   to its content (plus 16px padding); `width` / `height` act as minimum
 *   floors. Pass `fit: 'fixed'` for a fixed canvas. Authors can override
 *   any of `fit` / `width` / `height` / `padding` per fence via the info
 *   string, e.g. ` ```boceto Login width=1280 fit=content `.
 */
export default function remarkBoceto(
  options: RemarkBocetoOptions = {},
): (tree: Root) => void | Promise<void> {
  const mode = options.mode ?? 'wc'
  const tag = options.tag ?? 'boceto-view'
  const extraAttrs = options.attributes ?? {}
  const svgRenderer = mode === 'svg' ? new SvgRenderer() : null

  if (mode !== 'svg') {
    // Synchronous transformer for WC mode — no layout to resolve.
    return (tree) => {
      visit(tree, 'code', (node: Code, index, parent) => {
        if (!parent || index == null) return
        if ((node.lang ?? '') !== 'boceto') return
        const source = node.value
        const meta = node.meta ?? null
        let html: string
        if (options.render) {
          html = options.render(source, { lang: 'boceto', meta })
        } else {
          const { page } = parseFenceMeta(meta)
          const attrs: Record<string, string> = { ...extraAttrs, code: source }
          if (page) attrs['data-page'] = page
          html = renderTag(tag, attrs)
        }
        parent.children[index] = { type: 'html', value: html } as Html
      })
    }
  }

  // SVG mode: collect every boceto block, ensure Yoga is loaded once, then
  // parse + lay out + render each in place.
  return async (tree) => {
    const targets: Array<{ node: Code; index: number; parent: Root | Code['data'] }> = []
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || index == null) return
      if ((node.lang ?? '') !== 'boceto') return
      targets.push({ node, index, parent: parent as Root })
    })
    if (targets.length === 0) return
    await initYoga()
    for (const { node, index, parent } of targets) {
      const source = node.value
      const meta = node.meta ?? null
      let html: string
      if (options.render) {
        html = options.render(source, { lang: 'boceto', meta })
      } else {
        const { page: pageName, opts: fence } = parseFenceMeta(meta)
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
        html = svgRenderer!.renderToString(doc, { width: w, height: h })
      }
      ;(parent as Root).children[index] = { type: 'html', value: html } as Html
    }
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
