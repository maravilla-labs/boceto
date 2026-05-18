import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { BocetoBlock } from '../src/boceto-block'
import { BocetoContext, type BocetoContextStorage, collectBocetoSource } from '../src/boceto-context'
import { BOCETO_ICON_SVG, bocetoIconAt } from '../src/icon'

const DEFINES =
  '<pre><code class="language-boceto">component pricing-card(title, price)\n  element card 0 0 240 160 ""\n  element heading 8 8 220 28 "$title"\nend</code></pre>'
const USES =
  '<pre><code class="language-boceto">element pricing-card 0 0 240 160 "" title="Pro" price="$29"</code></pre>'

function newEditor(html: string): Editor {
  return new Editor({
    extensions: [StarterKit, BocetoBlock, BocetoContext],
    content: html,
  })
}

describe('BocetoContext extension', () => {
  it('exposes joined source on storage after createEditor', async () => {
    const ed = newEditor(DEFINES + USES)
    // The broadcaster defers initial collect to a microtask so it lands after
    // TipTap finishes hydrating the doc from `content`.
    await new Promise((r) => setTimeout(r, 0))
    const storage = ed.storage.bocetoContext as BocetoContextStorage
    expect(storage.blocks).toHaveLength(2)
    expect(storage.source).toContain('component pricing-card')
    expect(storage.source).toContain('element pricing-card')
    expect(storage.version).toBeGreaterThan(0)
    ed.destroy()
  })

  it('bumps version when a bocetoBlock code attr changes', async () => {
    const ed = newEditor(DEFINES + USES)
    await new Promise((r) => setTimeout(r, 0))
    const before = (ed.storage.bocetoContext as BocetoContextStorage).version

    // Find the first bocetoBlock and mutate its code via setNodeAttribute.
    let pos = -1
    ed.state.doc.descendants((node, p) => {
      if (pos === -1 && node.type.name === 'bocetoBlock') pos = p
    })
    expect(pos).toBeGreaterThanOrEqual(0)
    ed.commands.setNodeSelection(pos)
    ed.commands.updateAttributes('bocetoBlock', { code: 'element box 0 0 10 10 ""' })

    const after = (ed.storage.bocetoContext as BocetoContextStorage).version
    expect(after).toBeGreaterThan(before)
    ed.destroy()
  })

  it('does not bump version when an unrelated transaction fires', async () => {
    const ed = newEditor('<p>hello</p>' + DEFINES)
    await new Promise((r) => setTimeout(r, 0))
    const before = (ed.storage.bocetoContext as BocetoContextStorage).version
    // Make a selection-only transaction (no doc change).
    ed.commands.focus()
    const after = (ed.storage.bocetoContext as BocetoContextStorage).version
    expect(after).toBe(before)
    ed.destroy()
  })

  it('originBlockIndex maps each component name to the block that defines it', async () => {
    const SECOND_DEFINES =
      '<pre><code class="language-boceto">component badge-pill(label)\n  element badge 0 0 80 24 "$label"\nend</code></pre>'
    const ed = newEditor(USES + DEFINES + SECOND_DEFINES)
    await new Promise((r) => setTimeout(r, 0))
    const storage = ed.storage.bocetoContext as BocetoContextStorage
    // USES is at block 0, DEFINES at block 1, SECOND_DEFINES at block 2.
    expect(storage.originBlockIndex.get('pricing-card')).toBe(1)
    expect(storage.originBlockIndex.get('badge-pill')).toBe(2)
    ed.destroy()
  })

  it('collectBocetoSource skips empty bocetoBlocks', () => {
    const ed = new Editor({
      extensions: [StarterKit, BocetoBlock],
      content:
        '<pre><code class="language-boceto"></code></pre><pre><code class="language-boceto">element box 0 0 10 10 ""</code></pre>',
    })
    const { blocks } = collectBocetoSource(ed)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toContain('element box')
    ed.destroy()
  })
})

describe('Boceto icon export', () => {
  it('BOCETO_ICON_SVG is a parseable SVG string', () => {
    expect(BOCETO_ICON_SVG.startsWith('<svg')).toBe(true)
    const wrapper = document.createElement('div')
    wrapper.innerHTML = BOCETO_ICON_SVG
    const svg = wrapper.firstElementChild as SVGSVGElement
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 28 28')
  })

  it('bocetoIconAt rescales width/height while preserving the viewBox', () => {
    const out = bocetoIconAt(18)
    expect(out).toContain('width="18"')
    expect(out).toContain('height="18"')
    expect(out).toContain('viewBox="0 0 28 28"')
  })
})
