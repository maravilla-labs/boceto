# @boceto/tiptap

TipTap node + extension for embedding [Boceto](https://maravilla-labs.github.io/boceto/) wireframes in any TipTap editor.

Cross-block component context is preserved: define `component pricing-card(...)` in one block, reference `element pricing-card …` in any other block in the same document, and both render correctly — whether you're in read mode or actively editing.

## Install

```sh
pnpm add @boceto/tiptap @tiptap/core @tiptap/react react
```

## Quick start (React)

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { BocetoBlock, BocetoContext, BocetoIcon } from '@boceto/tiptap'
import { withReactNodeView } from '@boceto/tiptap/react'

const editor = useEditor({
  extensions: [StarterKit, withReactNodeView(BocetoBlock), BocetoContext],
  content: '<p>Hello</p><pre><code class="language-boceto">component pricing-card(title) ...end</code></pre>',
})

// Toolbar button:
<button onClick={() => editor?.chain().focus().insertBocetoBlock().run()}>
  <span dangerouslySetInnerHTML={{ __html: BocetoIcon }} />
</button>
```

Vanilla TipTap (no React)? Drop the `/react` import — you can supply your own `addNodeView` on `BocetoBlock` that mounts `<boceto-view>` / `<boceto-edit>` directly.

## What's in the box

- **`BocetoBlock`** — atomic TipTap node that stores a Boceto fence (`code` + optional `page` attrs). Renders to `<pre><code class="language-boceto[:page]">…</code></pre>`.
- **`BocetoContext`** — TipTap extension that watches the doc for `bocetoBlock` nodes, joins their source as a single multi-fence DSL string, and exposes it on `editor.storage.bocetoContext.source`. Node views read it to seed `<boceto-edit>`'s and `<boceto-view>`'s `imports` prop, so component definitions from sibling blocks resolve.
- **`BocetoIcon`** — Boceto's brand B-mark as an inline SVG string. Drop into toolbar buttons via `dangerouslySetInnerHTML` (React) or `innerHTML` (vanilla DOM).
- **React node view** (default): click a Boceto block to enter edit mode (full `<boceto-edit>` + palette + inspector). Click "Done" to return to read mode.

## Gotcha: palette + inspector

The default React node view mounts all three boceto custom elements together — `<boceto-edit>`, `<boceto-palette for=…>`, and `<boceto-inspector for=…>`. If you build a custom node view, do the same: authoring without the palette/inspector is unusable.

If you're hosting the editor *outside* a TipTap context, reach for `BocetoEditFull` from `@boceto/react` — it composes the three elements into a single component with a stable id wired through.

## License

MIT.
