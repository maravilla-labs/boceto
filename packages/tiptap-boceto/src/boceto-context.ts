import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { eachBocetoBlock } from './boceto-block'

/**
 * Storage shape exposed on `editor.storage.bocetoContext`.
 *
 * `source` is every `bocetoBlock` node in the doc joined as fenced markdown,
 * in document order. Node views read this, *subtract their own code*, and
 * pass the remainder as the `imports` attribute to `<boceto-view>` /
 * `<boceto-edit>` so cross-block component references resolve.
 */
export interface BocetoContextStorage {
  /** Concatenated multi-fence DSL (or empty string when no blocks exist). */
  source: string
  /** Per-block fenced source, in document order. */
  blocks: string[]
  /**
   * Bumped on every doc change that affects the joined source — node views
   * subscribe via `editor.on('transaction')` and read this counter to know
   * when to re-render. Component instances that capture `editor.storage`
   * by reference get the new `source` automatically, but the counter is
   * useful for React node views that need an effect-dependency hook.
   */
  version: number
}

/**
 * Collect every `bocetoBlock` in the editor, wrap each as a fenced markdown
 * block, and return both the per-block array and the joined source. Skips
 * empty `code` to keep `extractBlocks` from producing useless `RawBlock`s.
 */
export function collectBocetoSource(editor: Editor): {
  blocks: string[]
  source: string
} {
  const blocks: string[] = []
  eachBocetoBlock(editor, ({ code, page }) => {
    if (!code.trim()) return
    const header = page ? `\`\`\`boceto:${page}` : '```boceto'
    blocks.push(`${header}\n${code}\n\`\`\``)
  })
  return { blocks, source: blocks.join('\n\n') }
}

/**
 * `BocetoContext` — TipTap extension that broadcasts the doc-level Boceto
 * source to every node view so cross-block component definitions resolve.
 *
 * Add it to your editor's `extensions: []` alongside `BocetoBlock`:
 *
 *     useEditor({ extensions: [StarterKit, BocetoBlock, BocetoContext] })
 *
 * It runs no commands and adds no schema; it only watches transactions.
 */
export const BocetoContext = Extension.create<unknown, BocetoContextStorage>({
  name: 'bocetoContext',

  addStorage() {
    return { source: '', blocks: [], version: 0 }
  },

  onCreate() {
    // TipTap dispatches `onCreate` on a macrotask after the initial content
    // is materialised, so the doc is ready to read directly here.
    const { source, blocks } = collectBocetoSource(this.editor)
    if (source === this.storage.source) return
    this.storage.source = source
    this.storage.blocks = blocks
    this.storage.version += 1
  },

  onTransaction({ transaction }) {
    if (!transaction.docChanged) return
    const { source, blocks } = collectBocetoSource(this.editor)
    if (source === this.storage.source) return
    this.storage.source = source
    this.storage.blocks = blocks
    this.storage.version += 1
  },
})
