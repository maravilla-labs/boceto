import {
  CanvasRenderer,
  applyFlexLayout,
  initYoga,
  pageContentBox,
  parse,
  selectPage,
  type BocetoDoc,
} from '@boceto/core'

/**
 * Singleton: `initYoga()` is idempotent and memoizes the WASM load promise,
 * so calling it from every `<boceto-view>` instance is safe — only the first
 * call actually fetches/instantiates Yoga. Subsequent instances await the
 * same already-resolved promise.
 */
const yogaReady = initYoga()

const DEFAULT_W = 860
const DEFAULT_H = 600

/**
 * `<boceto-view>` — read-only renderer for Boceto wireframes.
 *
 * Attributes:
 *   - `code`    inline DSL source (overrides slot content)
 *   - `src`     URL to fetch DSL source from
 *   - `width`   canvas pixel width (default 860). When `fit="content"`, this
 *               value acts as a *minimum* — the canvas grows if the mockup
 *               extends past it.
 *   - `height`  canvas pixel height (default 600). Same minimum behavior under
 *               `fit="content"`.
 *   - `page`    page id, name, or numeric index
 *   - `fit`     `fixed` (default) — render at the declared `width × height`,
 *               clipping content that extends past it. `content` — grow the
 *               canvas to encompass every element (plus an optional
 *               `padding`).
 *   - `padding` pixels of breathing room when `fit="content"`. Default 16.
 *   - `imports` additional DSL source whose `component … end` definitions
 *               feed the parser before `code` is parsed. Use when this view
 *               renders one fence of a multi-fence doc and needs to resolve
 *               components defined in sibling fences.
 *
 * If neither `code` nor `src` is set, the element parses its slot text content.
 *
 * Emits a `boceto-render` CustomEvent on every successful render with
 * `{ doc, page }` in `event.detail`.
 */
export class BocetoViewElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['code', 'src', 'width', 'height', 'page', 'fit', 'padding', 'imports']
  }

  #canvas: HTMLCanvasElement
  #renderer: CanvasRenderer
  #shadow: ShadowRoot
  #lastDoc: BocetoDoc | null = null
  /**
   * Imports source set via the DOM property (bypasses the attribute, which
   * would force serialization of potentially-large strings). Falls back to
   * the `imports` attribute when this is `null`.
   */
  #importsProp: string | null = null

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#canvas = document.createElement('canvas')
    this.#canvas.width = DEFAULT_W
    this.#canvas.height = DEFAULT_H
    this.#canvas.style.maxWidth = '100%'
    this.#canvas.style.height = 'auto'
    const style = document.createElement('style')
    style.textContent = `:host { display: block; } canvas { display: block; }`
    this.#shadow.appendChild(style)
    this.#shadow.appendChild(this.#canvas)
    this.#renderer = new CanvasRenderer(this.#canvas)
  }

  connectedCallback(): void {
    void this.#refresh()
  }

  attributeChangedCallback(): void {
    void this.#refresh()
  }

  /** Programmatic alternative to setting the `code` attribute. */
  setCode(code: string): void {
    this.setAttribute('code', code)
  }

  /**
   * Imports source — component definitions to merge before parsing `code`.
   * Setting via property avoids attribute serialization for large strings;
   * setting via the `imports` attribute also works.
   */
  get imports(): string | null {
    return this.#importsProp ?? this.getAttribute('imports')
  }
  set imports(v: string | null) {
    this.#importsProp = v
    void this.#refresh()
  }

  /** Latest parsed document, if any. */
  get document(): BocetoDoc | null {
    return this.#lastDoc
  }

  async #refresh(): Promise<void> {
    let w = numAttr(this, 'width', DEFAULT_W)
    let h = numAttr(this, 'height', DEFAULT_H)

    let source = this.getAttribute('code')
    if (source == null) {
      const src = this.getAttribute('src')
      if (src) {
        try {
          const res = await fetch(src)
          if (res.ok) source = await res.text()
        } catch {
          source = null
        }
      }
    }
    if (source == null) source = this.textContent ?? ''

    const imports = this.#importsProp ?? this.getAttribute('imports') ?? undefined
    // raw mode skips the component-resolution pass, so disable it whenever
    // imports are present — the caller is asking us to merge sibling-block
    // definitions, which requires Pass-1.
    const looksRaw = !source.includes('```') && !/^---/m.test(source.trim())
    let doc: BocetoDoc
    try {
      doc = parse(source, {
        raw: looksRaw && !imports,
        ...(imports ? { imports } : {}),
      })
    } catch {
      return
    }

    // Yoga WASM is loaded once per page (singleton promise) — wait for it
    // before laying out, then resolve container computed boxes.
    await yogaReady
    applyFlexLayout(doc)

    const pageAttr = this.getAttribute('page')
    const pageOpt = pageAttr == null ? undefined : isNumeric(pageAttr) ? Number(pageAttr) : pageAttr

    // `fit="content"` grows the canvas to encompass every element on the
    // active page. `width`/`height` become *minimums* in that mode, so
    // `<boceto-view width="900" height="200" fit="content">` keeps the
    // minimum 900×200 footprint and only grows when the content needs more
    // room. Default behavior (`fit="fixed"`) is unchanged.
    if (this.getAttribute('fit') === 'content') {
      const page = selectPage(doc, pageOpt)
      if (page) {
        const bb = pageContentBox(page.elements)
        if (bb) {
          const pad = Math.max(0, numAttr(this, 'padding', 16))
          // bb.x / bb.y may be negative, but Boceto coords are non-negative
          // (parser enforces that). Use the right/bottom edge directly.
          const need = {
            w: Math.ceil(bb.x + bb.w + pad),
            h: Math.ceil(bb.y + bb.h + pad),
          }
          w = Math.max(w, need.w)
          h = Math.max(h, need.h)
        }
      }
    }

    if (this.#canvas.width !== w) this.#canvas.width = w
    if (this.#canvas.height !== h) this.#canvas.height = h

    this.#lastDoc = doc
    this.#renderer.render(doc, { width: w, height: h, page: pageOpt })

    this.dispatchEvent(
      new CustomEvent('boceto-render', { detail: { doc, page: pageOpt }, bubbles: true }),
    )
  }
}

function numAttr(el: HTMLElement, name: string, fallback: number): number {
  const v = el.getAttribute(name)
  if (v == null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isNumeric(s: string): boolean {
  return s !== '' && !Number.isNaN(Number(s))
}

export const TAG = 'boceto-view'

/**
 * Idempotently registers the custom element. Safe to call multiple times.
 */
export function defineBocetoView(tag = TAG): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, BocetoViewElement)
}
