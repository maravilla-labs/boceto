import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { BocetoBlock } from '../src/boceto-block'

function newEditor(content = ''): Editor {
  return new Editor({
    extensions: [StarterKit, BocetoBlock],
    content,
  })
}

describe('BocetoBlock node', () => {
  it('round-trips through parseHTML → renderHTML (no page name)', () => {
    const html =
      '<pre><code class="language-boceto">element box 0 0 100 50 "Hi"</code></pre>'
    const ed = newEditor(html)
    const out = ed.getHTML()
    expect(out).toContain('class="language-boceto"')
    expect(out).toContain('element box 0 0 100 50 "Hi"')
    ed.destroy()
  })

  it('round-trips a page-named fence', () => {
    const html =
      '<pre><code class="language-boceto:Dashboard">element button 0 0 80 32 "Go"</code></pre>'
    const ed = newEditor(html)
    const out = ed.getHTML()
    expect(out).toContain('class="language-boceto:Dashboard"')
    ed.destroy()
  })

  it('ignores non-boceto fenced blocks', () => {
    const html =
      '<pre><code class="language-ts">const x = 1</code></pre>'
    const ed = newEditor(html)
    // StarterKit's codeBlock should claim this, not BocetoBlock.
    const json = ed.getJSON()
    expect(JSON.stringify(json)).not.toContain('bocetoBlock')
    ed.destroy()
  })

  it('`insertBocetoBlock` command inserts a node with the default starter', () => {
    const ed = newEditor('')
    ed.chain().focus().insertBocetoBlock().run()
    const json = ed.getJSON()
    const str = JSON.stringify(json)
    expect(str).toContain('bocetoBlock')
    expect(str).toContain('Click me')
    ed.destroy()
  })

  it('`insertBocetoBlock` accepts custom code + page', () => {
    const ed = newEditor('')
    ed.chain().focus().insertBocetoBlock({ code: 'element box 0 0 10 10 ""', page: 'P' }).run()
    const out = ed.getHTML()
    expect(out).toContain('class="language-boceto:P"')
    expect(out).toContain('element box 0 0 10 10')
    ed.destroy()
  })
})
