import type { Code, Html, Root } from 'mdast'
import { visit } from 'unist-util-visit'
import {
  applyFlexLayout,
  initYoga,
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
  /**
   * Cross-document component sharing.
   *
   * Within a single markdown file, every ```boceto fence shares a component
   * registry — block N can use a `component` defined in block 1. This is
   * **always on** and requires no configuration.
   *
   * Across files, declare imports in YAML frontmatter:
   *
   *     ---
   *     boceto:
   *       import:
   *         - ./00-component-library.md
   *         - ./shared/*-component.md
   *     ---
   *
   *  - `true` (default): file imports are resolved using `node:fs/promises`
   *    and `tinyglobby` (lazy-loaded). The plugin allocates one
   *    `LibraryCache` per instance so libraries parse once per build.
   *  - `false`: file imports are disabled; only same-file fences share.
   *  - Object: explicit adapter overrides (custom fs, custom glob, shared
   *    cache for HMR, project-root constraint).
   *
   * The list of absolute paths consulted is written to
   * `file.data.bocetoImports` for watch-mode subscription.
   */
  resolveImports?:
    | boolean
    | {
        cache?: LibraryCache
        fs?: FsAdapter
        glob?: GlobAdapter
        projectRoot?: string
        /**
         * Fallback for the importing file's absolute path when the unified
         * pipeline doesn't expose one on the VFile. Pipelines that call
         * `.process({ path, value })` (typical for `unified()` directly,
         * Astro, Next remark) set `file.path` automatically — those hosts
         * leave this option unset. Pipelines that hand the source in as a
         * bare string (`react-markdown`'s `children` prop) cannot set the
         * VFile path; pass it here so frontmatter `boceto.import` paths
         * resolve relative to the right directory.
         */
        currentFilePath?: string
      }
}

/**
 * Minimal structural subset of `unified`'s VFile that this plugin reads.
 * Avoids a direct dependency on `vfile` while staying compatible with the
 * real type passed in by `unified`/`remark`.
 */
interface BocetoVFile {
  path?: string
  value?: unknown
  data?: Record<string, unknown>
  message?: (reason: string, place?: unknown, source?: string) => unknown
}

export type Plugin = () => (tree: Root, file: BocetoVFile) => Promise<void>

type FenceOpts = { fit?: 'content' | 'fixed'; width?: number; height?: number; padding?: number }

interface FenceTarget {
  node: Code
  index: number
  parent: Root
  source: string
  meta: string | null
  pageName: string | null
  fenceOpts: FenceOpts
}

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
 *   transformer is async so it can `await initYoga()` once before resolving
 *   FlexContainer layout. By default each fence auto-sizes to its content
 *   (plus 16px padding); `width` / `height` act as minimum floors. Pass
 *   `fit: 'fixed'` for a fixed canvas. Authors can override any of
 *   `fit` / `width` / `height` / `padding` per fence via the info string,
 *   e.g. ` ```boceto Login width=1280 fit=content `.
 *
 * **Cross-document sharing.** Sibling fences in the same markdown file always
 * share a component registry. Files can also pull in libraries declared in
 * YAML frontmatter — see `RemarkBocetoOptions.resolveImports`.
 */
export default function remarkBoceto(
  options: RemarkBocetoOptions = {},
): (tree: Root, file: BocetoVFile) => Promise<void> {
  const mode = options.mode ?? 'wc'
  const tag = options.tag ?? 'boceto-view'
  const extraAttrs = options.attributes ?? {}
  const svgRenderer = mode === 'svg' ? new SvgRenderer() : null

  const importsCfg = resolveImportsConfig(options.resolveImports)
  // One cache per plugin instance unless the caller supplied one.
  const cache = importsCfg?.cache ?? (importsCfg ? new LibraryCache() : null)

  return async (tree, file) => {
    // 1. Collect every boceto fence in document order.
    const targets: FenceTarget[] = []
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || index == null) return
      if ((node.lang ?? '') !== 'boceto') return
      const meta = node.meta ?? null
      const { page, opts } = parseFenceMeta(meta)
      targets.push({
        node,
        index,
        parent: parent as Root,
        source: node.value,
        meta,
        pageName: page,
        fenceOpts: opts,
      })
    })
    if (targets.length === 0) return

    // 2. Resolve cross-file imports declared in frontmatter (best-effort).
    let importedComponents: readonly Component[] = []
    let importedPaths: string[] = []
    // `file.path` wins; `currentFilePath` is the fallback for hosts that
    // can't set it on the VFile (react-markdown's `children` API is the
    // motivating case). Without either, frontmatter `boceto.import` paths
    // have no anchor and resolution is skipped silently — same as before.
    const filePath = file?.path ?? importsCfg?.currentFilePath
    // `fs` and `glob` adapters MUST be supplied explicitly. The plugin no
    // longer ships built-in Node defaults — that kept this entry point
    // free of `node:fs` / `tinyglobby` static imports so browser bundlers
    // never see them. Node consumers import the adapters from
    // `@boceto/remark/node-adapters` and pass them through; browser /
    // Tauri / react-markdown consumers inject their own.
    if (
      importsCfg &&
      cache &&
      filePath &&
      typeof file?.value === 'string' &&
      importsCfg.fs &&
      importsCfg.glob
    ) {
      try {
        const res = await resolveBocetoImports({
          filePath,
          source: String(file.value),
          fs: importsCfg.fs,
          glob: importsCfg.glob,
          cache,
          projectRoot: importsCfg.projectRoot,
        })
        importedComponents = res.importedComponents
        importedPaths = res.importedPaths
      } catch (err) {
        // Don't crash the whole pipeline on import resolution failure —
        // surface the error on the VFile so the host can handle it.
        const msg = (err as Error).message ?? String(err)
        if (file?.message) {
          file.message(msg, undefined, 'remark-boceto:imports')
        }
      }
    } else if (
      importsCfg &&
      filePath &&
      typeof file?.value === 'string' &&
      (!importsCfg.fs || !importsCfg.glob)
    ) {
      // Adapters missing — emit a VFile warning so the host can wire them.
      if (file?.message) {
        file.message(
          'resolveImports needs explicit `fs` + `glob` adapters. Import them from `@boceto/remark/node-adapters` (Node) or inject your own (browser/Tauri).',
          undefined,
          'remark-boceto:imports-missing-adapters',
        )
      }
    }
    if (file?.data) {
      ;(file.data as { bocetoImports?: string[] }).bocetoImports = importedPaths
    }

    // 3. Same-file fence aggregation: each fence's siblings act as in-doc
    //    imports (string form), additive with `importedComponents`.
    const fenceImports = targets.map((t) => wrapFence(t.source, t.pageName))

    if (mode === 'svg') await initYoga()

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]!
      const others = fenceImports.filter((_, j) => j !== i)
      let html: string
      if (options.render) {
        html = options.render(t.source, { lang: 'boceto', meta: t.meta })
      } else if (mode === 'svg') {
        html = renderSvg(t, others, importedComponents, options, svgRenderer!)
      } else {
        html = renderWc(t, tag, extraAttrs)
      }
      t.parent.children[t.index] = { type: 'html', value: html } as Html
    }
  }
}

function renderWc(
  t: FenceTarget,
  tag: string,
  extraAttrs: Record<string, string>,
): string {
  const attrs: Record<string, string> = { ...extraAttrs, code: t.source }
  if (t.pageName) attrs['data-page'] = t.pageName
  return renderTag(tag, attrs)
}

function renderSvg(
  t: FenceTarget,
  otherFences: string[],
  importedComponents: readonly Component[],
  options: RemarkBocetoOptions,
  renderer: SvgRenderer,
): string {
  const fit = t.fenceOpts.fit ?? options.fit ?? 'content'
  const padding = t.fenceOpts.padding ?? options.padding ?? 16
  const minW = t.fenceOpts.width ?? options.width
  const minH = t.fenceOpts.height ?? options.height
  const wrapped = wrapFence(t.source, t.pageName)
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
  return renderer.renderToString(doc, { width: w, height: h })
}

function wrapFence(source: string, pageName: string | null): string {
  return '```boceto' + (pageName ? ':' + pageName : '') + '\n' + source + '\n```'
}

function resolveImportsConfig(
  v: RemarkBocetoOptions['resolveImports'],
): {
  cache?: LibraryCache
  fs?: FsAdapter
  glob?: GlobAdapter
  projectRoot?: string
  currentFilePath?: string
} | null {
  if (v === false) return null
  if (v === true || v == null) return {}
  return v
}

function renderTag(tag: string, attrs: Record<string, string>): string {
  const parts = [tag]
  for (const [k, v] of Object.entries(attrs)) parts.push(`${k}="${escapeAttr(v)}"`)
  return `<${parts.join(' ')}></${tag}>`
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
