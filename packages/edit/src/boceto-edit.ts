import { CanvasRenderer, parse, type BocetoDoc } from '@boceto/core'

const DEFAULT_W = 860
const DEFAULT_H = 600

/**
 * `<boceto-edit>` — read-only canvas. Editing interactions (select / drag /
 * resize / undo / multi-page tabs) are not implemented yet; the component
 * currently renders identically to `<boceto-view>` but exposes the editor's
 * eventual API surface (attribute reflection + `change` event) so consumers
 * wire up against the stable contract from day one.
 *
 * Attributes:
 *   - `code`     current DSL source
 *   - `src`      URL to fetch DSL source from (mirrors <boceto-view>)
 *   - `width`    canvas width
 *   - `height`   canvas height
 *   - `page`     page id, name, or numeric index
 *
 * Events:
 *   - `change`   `CustomEvent<{ code: string }>` fired when the `code`
 *                attribute is set programmatically. Once interactions land,
 *                user edits will fire it too.
 */
export class BocetoEditElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['code', 'src', 'width', 'height', 'page']
  }

  #shadow: ShadowRoot
  #canvas: HTMLCanvasElement
  #renderer: CanvasRenderer
  #lastDoc: BocetoDoc | null = null

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = `:host { display: block; } canvas { display: block; max-width: 100%; height: auto; }`
    this.#shadow.appendChild(style)

    this.#canvas = document.createElement('canvas')
    this.#canvas.width = DEFAULT_W
    this.#canvas.height = DEFAULT_H
    this.#shadow.appendChild(this.#canvas)
    this.#renderer = new CanvasRenderer(this.#canvas)
  }

  connectedCallback(): void {
    void this.#refresh()
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'code') {
      this.dispatchEvent(
        new CustomEvent('change', { detail: { code: value ?? '' }, bubbles: true }),
      )
    }
    void this.#refresh()
  }

  /** Latest parsed document. */
  get document(): BocetoDoc | null {
    return this.#lastDoc
  }

  /** Convenience accessor mirroring the v0.1 API. */
  get code(): string {
    return this.getAttribute('code') ?? this.textContent?.trim() ?? ''
  }
  set code(v: string) {
    this.setAttribute('code', v)
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

export const TAG = 'boceto-edit'

export function defineBocetoEdit(tag = TAG): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, BocetoEditElement)
}
