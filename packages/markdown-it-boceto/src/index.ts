import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import {
  applyFlexLayout,
  LibraryCache,
  pageContentBox,
  parse,
  resolveBocetoImports,
  selectPage,
  SvgRenderer,
  type Component,
  type FsAdapter,
  type GlobAdapter,
} from '@boceto/core'

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

/**
 * Per-render environment used by the markdown-it plugin. Pass this as the
 * `env` argument of `md.render(src, env)` to provide cross-document context:
 *
 *     const { importedComponents } = await prewarmBocetoCache({ ... })
 *     md.render(src, { bocetoImportedComponents: importedComponents })
 *
 * Same-file fence aggregation is automatic and needs no env.
 */
export interface BocetoEnv {
  /**
   * Pre-resolved components from cross-file `boceto.import` frontmatter.
   * Populate via `prewarmBocetoCache` (or call `resolveBocetoImports`
   * yourself). Without this, only same-file fence aggregation happens.
   */
  bocetoImportedComponents?: readonly Component[]
}

type FenceOpts = { fit?: 'content' | 'fixed'; width?: number; height?: number; padding?: number }

interface ParsedFence {
  page: string | null
  opts: FenceOpts
}

/**
 * Parse the fence info-string portion after `boceto`. Recognized `key=value`
 * tokens (`fit`, `width`, `height`, `padding`) are extracted as per-fence
 * overrides; everything else is joined back as the page name. Unknown keys
 * or invalid values fall through to the page name.
 */
function parseFenceMeta(meta: string): ParsedFence {
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

function wrapFence(source: string, pageName: string | null): string {
  return '```boceto' + (pageName ? ':' + pageName : '') + '\n' + source + '\n```'
}

interface EnvSlot {
  /** Pre-wrapped fence sources for same-file aggregation, in document order. */
  siblings: string[]
  /** Map from fence token index → position in `siblings` (so renderer can subtract self). */
  positionByTokenIdx: Map<number, number>
}

const ENV_KEY = '__bocetoFenceContext__'

function getOrInitSlot(env: Record<string, unknown> | undefined): EnvSlot | null {
  if (!env) return null
  const existing = env[ENV_KEY] as EnvSlot | undefined
  if (existing) return existing
  const slot: EnvSlot = { siblings: [], positionByTokenIdx: new Map() }
  env[ENV_KEY] = slot
  return slot
}

/**
 * markdown-it plugin: replaces fenced ```boceto blocks with either
 * `<boceto-view>` (default) or inline `<svg>` (mode: 'svg').
 *
 * **Same-file fence aggregation** is automatic: every ```boceto fence in a
 * single source shares a component registry, so block N can use components
 * defined in earlier blocks.
 *
 * **Cross-file imports**: markdown-it renders synchronously, so the host
 * application must resolve frontmatter imports BEFORE `md.render(...)`.
 * Use `prewarmBocetoCache` from this module to populate a `LibraryCache`,
 * then pass the returned components via `env.bocetoImportedComponents`.
 *
 * **`mode: 'svg'` requires pre-initialization.** Call `await initYoga()`
 * from `@boceto/core` once before calling `md.render(...)`.
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

  // Core rule: walk every fence token before rendering so the fence rule can
  // see its siblings on the env. This runs once per document.
  md.core.ruler.push('boceto-collect-fences', (state) => {
    const slot = getOrInitSlot(state.env)
    if (!slot) return
    slot.siblings = []
    slot.positionByTokenIdx.clear()
    for (let i = 0; i < state.tokens.length; i++) {
      const tok = state.tokens[i] as Token | undefined
      if (!tok || tok.type !== 'fence') continue
      const info = (tok.info ?? '').trim()
      const [lang, ...metaParts] = info.split(/\s+/)
      if (lang !== 'boceto') continue
      const { page } = parseFenceMeta(metaParts.join(' '))
      slot.positionByTokenIdx.set(i, slot.siblings.length)
      slot.siblings.push(wrapFence(tok.content, page))
    }
  })

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

    // Same-file aggregation: pull this doc's sibling fences from env, omit self.
    const slot = (env as Record<string, unknown> | undefined)?.[ENV_KEY] as
      | EnvSlot
      | undefined
    let otherFences: string[] = []
    if (slot) {
      const myPos = slot.positionByTokenIdx.get(idx) ?? -1
      otherFences = slot.siblings.filter((_, j) => j !== myPos)
    }

    const importedComponents =
      ((env as BocetoEnv | undefined)?.bocetoImportedComponents) ?? undefined

    if (mode === 'svg') {
      const fit = fence.fit ?? options.fit ?? 'content'
      const padding = fence.padding ?? options.padding ?? 16
      const minW = fence.width ?? options.width
      const minH = fence.height ?? options.height
      const wrapped = wrapFence(source, pageName)
      const doc = applyFlexLayout(
        parse(wrapped, {
          imports: otherFences.length > 0 ? otherFences : undefined,
          importedComponents,
        }),
      )
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

// ─────────────────────────────────────────────────────────────────────────────
// Prewarm helper — async resolution for sync `md.render(...)`
// ─────────────────────────────────────────────────────────────────────────────

export interface PrewarmBocetoCacheOptions {
  /** Absolute path of the markdown file whose imports we're resolving. */
  filePath: string
  /** Raw source text of `filePath` (frontmatter still present). */
  source: string
  fs: FsAdapter
  glob: GlobAdapter
  cache: LibraryCache
  projectRoot?: string
}

/**
 * Convenience wrapper around `resolveBocetoImports` for markdown-it users.
 * Call this before `md.render(src, { bocetoImportedComponents: ... })`.
 *
 *     const cache = new LibraryCache()
 *     const { importedComponents, importedPaths } = await prewarmBocetoCache({
 *       filePath: '/proj/page.md',
 *       source: await fs.readFile('/proj/page.md', 'utf8'),
 *       fs: { readFile: (p) => fs.readFile(p) },
 *       glob: tinyglobby.glob,
 *       cache,
 *       projectRoot: '/proj',
 *     })
 *     const html = md.render(src, { bocetoImportedComponents: importedComponents })
 *
 * `importedPaths` is the flat list of files consulted — useful for HMR
 * subscriptions.
 */
export async function prewarmBocetoCache(opts: PrewarmBocetoCacheOptions): Promise<{
  importedComponents: Component[]
  importedPaths: string[]
}> {
  return await resolveBocetoImports({
    filePath: opts.filePath,
    source: opts.source,
    fs: opts.fs,
    glob: opts.glob,
    cache: opts.cache,
    projectRoot: opts.projectRoot,
  })
}

export { LibraryCache } from '@boceto/core'

function renderTag(tag: string, attrs: Record<string, string>): string {
  const parts = [tag]
  for (const [k, v] of Object.entries(attrs)) parts.push(`${k}="${escapeAttr(v)}"`)
  return `<${parts.join(' ')}></${tag}>`
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
