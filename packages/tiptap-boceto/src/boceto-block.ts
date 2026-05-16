import { Node, mergeAttributes } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { findBocetoName } from './parse-fence'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bocetoBlock: {
      /**
       * Insert a new Boceto block. Defaults to a simple placeholder element
       * so the canvas opens with something visible; pass `code` to override.
       */
      insertBocetoBlock: (attrs?: { code?: string; page?: string | null }) => ReturnType
    }
  }
}

export interface BocetoBlockOptions {
  /** Source string used when `insertBocetoBlock()` is called without `code`. */
  defaultCode: string
}

const DEFAULT_STARTER = 'element button 60 40 120 32 "Click me"'

/**
 * `bocetoBlock` — atomic TipTap node storing one Boceto fence.
 *
 * Attrs:
 *  - `code` — the DSL source for this block (no fence markers).
 *  - `page` — optional page name (matches the `:Page Name` suffix on
 *             `language-boceto:Page Name`). `null` for unnamed fences.
 *
 * The node serializes to `<pre><code class="language-boceto[:Page]">…</code></pre>`
 * so it round-trips through any markdown ↔ HTML pipeline that respects
 * highlight-style language classes.
 */
export const BocetoBlock = Node.create<BocetoBlockOptions>({
  name: 'bocetoBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { defaultCode: DEFAULT_STARTER }
  },

  addAttributes() {
    return {
      code: { default: '' },
      page: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        // Only claim <pre> blocks whose <code> child carries a language-boceto* class.
        getAttrs: (el: HTMLElement | string) => {
          if (typeof el === 'string') return false
          const code = el.querySelector(':scope > code')
          if (!code) return false
          const name = findBocetoName(code.getAttribute('class'))
          if (name === null) return false
          return {
            code: (code.textContent ?? '').replace(/\n$/, ''),
            page: name === '' ? null : name,
          }
        },
        priority: 60,
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const page = node.attrs.page as string | null
    const className = page ? `language-boceto:${page}` : 'language-boceto'
    return [
      'pre',
      mergeAttributes(HTMLAttributes),
      ['code', { class: className }, node.attrs.code ?? ''],
    ]
  },

  addCommands() {
    return {
      insertBocetoBlock:
        (attrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              code: attrs.code ?? this.options.defaultCode,
              page: attrs.page ?? null,
            },
          })
        },
    }
  },
})

/** Convenience: pull every `bocetoBlock` node from a TipTap editor's doc. */
export function eachBocetoBlock(
  editor: Editor,
  visit: (attrs: { code: string; page: string | null }, pos: number) => void,
): void {
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'bocetoBlock') {
      visit(
        {
          code: (node.attrs.code as string) ?? '',
          page: (node.attrs.page as string | null) ?? null,
        },
        pos,
      )
    }
  })
}
