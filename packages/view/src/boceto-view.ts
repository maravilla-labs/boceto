import { CanvasRenderer, parse, type BocetoDoc } from '@boceto/core'

const DEFAULT_W = 860
const DEFAULT_H = 600

/**
 * `<boceto-view>` — read-only renderer for Boceto wireframes.
 *
 * Attributes:
 *   - `code`   inline DSL source (overrides slot content)
 *   - `src`    URL to fetch DSL source from
 *   - `width`  canvas pixel width (default 860)
 *   - `height` canvas pixel height (default 600)
 *   - `page`   page id, name, or numeric index
 *
 * If neither `code` nor `src` is set, the element parses its slot text content.
 *
 * Emits a `boceto-render` CustomEvent on every successful render with
 * `{ doc, page }` in `event.detail`.
 */
export class BocetoViewElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['code', 'src', 'width', 'height', 'page']
  }

  #canvas: HTMLCanvasElement
  #renderer: CanvasRenderer
  #shadow: ShadowRoot
  #lastDoc: BocetoDoc | null = null

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

  /** Latest parsed document, if any. */
  get document(): BocetoDoc | null {
    return this.#lastDoc
  }

  async #refresh(): Promise<void> {
    const w = numAttr(this, 'width', DEFAULT_W)
    const h = numAttr(this, 'height', DEFAULT_H)
    if (this.#canvas.width !== w) this.#canvas.width = w
    if (this.#canvas.height !== h) this.#canvas.height = h

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

    let doc: BocetoDoc
    try {
      doc = parse(source, { raw: !source.includes('```') && !/^---/m.test(source.trim()) })
    } catch {
      return
    }

    this.#lastDoc = doc
    const pageAttr = this.getAttribute('page')
    const pageOpt = pageAttr == null ? undefined : isNumeric(pageAttr) ? Number(pageAttr) : pageAttr
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
