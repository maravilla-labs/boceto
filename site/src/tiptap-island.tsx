/**
 * The TipTap island for `site/editor.html`. Built by
 * `scripts/build-site-tiptap-island.mjs` into a single
 * `site/assets/tiptap-island.js` ESM bundle with React + TipTap +
 * `@boceto/tiptap` all inlined.
 *
 * The docs site loads it as `<script type="module">` and the bundle
 * auto-mounts onto an element with id `tt-island`.
 */
import { createRoot } from 'react-dom/client'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { BocetoBlock, BocetoContext, BOCETO_ICON_SVG } from '@boceto/tiptap'
import { withReactNodeView } from '@boceto/tiptap/react'

const SEED = `
<h2>Pricing</h2>
<p>The first fence defines a <code>pricing-card</code> component. The two later fences <em>use</em> it — and would normally fail to render in an editor that scopes parsing to one block. The <code>BocetoContext</code> extension fixes that by broadcasting the doc-level Boceto source so each node view resolves references through the same registry.</p>
<p><strong>Try:</strong> click any boceto block to edit it. Then click into the prose, format some text, insert a table, or insert a new Boceto block from the toolbar.</p>
<pre><code class="language-boceto">component pricing-card(title, price, blurb)
  element card 0 0 240 200 ""
  element heading 12 12 216 28 "$title"
  element heading 12 50 216 36 "$price"
  element label 12 100 216 60 "$blurb"
  element primary-button 12 168 216 32 "Choose"
end</code></pre>
<h3>Plans</h3>
<table><tbody>
<tr><th>Plan</th><th>Audience</th><th>Mockup</th></tr>
<tr><td><strong>Pro</strong></td><td>Solo builders</td><td>Below ↓</td></tr>
<tr><td><strong>Team</strong></td><td>5+ seats</td><td>Two rows down ↓</td></tr>
</tbody></table>
<p>Pro:</p>
<pre><code class="language-boceto">element pricing-card 0 0 240 200 "" title="Pro" price="$29/mo" blurb="Everything you need to ship."</code></pre>
<p>Team:</p>
<pre><code class="language-boceto">element pricing-card 0 0 240 200 "" title="Team" price="$99/mo" blurb="Five seats and priority support."</code></pre>
`

// ─── Toolbar ──────────────────────────────────────────────────────────────

interface BtnProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function Btn(props: BtnProps): JSX.Element {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className={'tt-btn' + (props.active ? ' tt-btn--active' : '')}
    >
      {props.children}
    </button>
  )
}

function Sep(): JSX.Element {
  return <span className="tt-sep" aria-hidden="true" />
}

function Toolbar({ editor }: { editor: Editor | null }): JSX.Element | null {
  if (!editor) return null
  const chain = () => editor.chain().focus()
  const is = (name: string, opts?: Record<string, unknown>) => editor.isActive(name, opts)

  return (
    <div className="tt-toolbar" role="toolbar" aria-label="Editor toolbar">
      <Btn
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
        active={is('heading', { level: 1 })}
        title="Heading 1"
      >
        H1
      </Btn>
      <Btn
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
        active={is('heading', { level: 2 })}
        title="Heading 2"
      >
        H2
      </Btn>
      <Btn
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
        active={is('heading', { level: 3 })}
        title="Heading 3"
      >
        H3
      </Btn>
      <Btn
        onClick={() => chain().setParagraph().run()}
        active={is('paragraph')}
        title="Paragraph"
      >
        ¶
      </Btn>
      <Sep />
      <Btn onClick={() => chain().toggleBold().run()} active={is('bold')} title="Bold (⌘B)">
        <strong>B</strong>
      </Btn>
      <Btn onClick={() => chain().toggleItalic().run()} active={is('italic')} title="Italic (⌘I)">
        <em>I</em>
      </Btn>
      <Btn onClick={() => chain().toggleStrike().run()} active={is('strike')} title="Strikethrough">
        <s>S</s>
      </Btn>
      <Btn onClick={() => chain().toggleCode().run()} active={is('code')} title="Inline code (⌘E)">
        <code>{'<>'}</code>
      </Btn>
      <Btn
        onClick={() => {
          const prev = editor.getAttributes('link').href as string | undefined
          const url = window.prompt('URL', prev ?? 'https://')
          if (url == null) return
          if (url === '') chain().unsetLink().run()
          else chain().extendMarkRange('link').setLink({ href: url }).run()
        }}
        active={is('link')}
        title="Link"
      >
        ↗
      </Btn>
      <Sep />
      <Btn
        onClick={() => chain().toggleBulletList().run()}
        active={is('bulletList')}
        title="Bullet list"
      >
        •
      </Btn>
      <Btn
        onClick={() => chain().toggleOrderedList().run()}
        active={is('orderedList')}
        title="Numbered list"
      >
        1.
      </Btn>
      <Btn
        onClick={() => chain().toggleBlockquote().run()}
        active={is('blockquote')}
        title="Blockquote"
      >
        “
      </Btn>
      <Btn
        onClick={() => chain().toggleCodeBlock().run()}
        active={is('codeBlock')}
        title="Code block"
      >
        {'{ }'}
      </Btn>
      <Btn onClick={() => chain().setHorizontalRule().run()} title="Horizontal rule">
        —
      </Btn>
      <Sep />
      <Btn
        onClick={() =>
          chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Insert table"
      >
        ⊞
      </Btn>
      <Btn
        onClick={() => chain().addColumnAfter().run()}
        disabled={!editor.can().addColumnAfter()}
        title="Add column after"
      >
        +col
      </Btn>
      <Btn
        onClick={() => chain().addRowAfter().run()}
        disabled={!editor.can().addRowAfter()}
        title="Add row after"
      >
        +row
      </Btn>
      <Btn
        onClick={() => chain().deleteColumn().run()}
        disabled={!editor.can().deleteColumn()}
        title="Delete column"
      >
        −col
      </Btn>
      <Btn
        onClick={() => chain().deleteRow().run()}
        disabled={!editor.can().deleteRow()}
        title="Delete row"
      >
        −row
      </Btn>
      <Btn
        onClick={() => chain().deleteTable().run()}
        disabled={!editor.can().deleteTable()}
        title="Delete table"
      >
        ⊠
      </Btn>
      <Sep />
      <Btn
        onClick={() => editor.chain().focus().insertBocetoBlock().run()}
        title="Insert Boceto block"
      >
        <span className="tt-icon" dangerouslySetInnerHTML={{ __html: BOCETO_ICON_SVG }} />
        Boceto
      </Btn>
      <span className="tt-spacer" />
      <Btn
        onClick={() => chain().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (⌘Z)"
      >
        ↶
      </Btn>
      <Btn
        onClick={() => chain().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (⌘⇧Z)"
      >
        ↷
      </Btn>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────

function App(): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      withReactNodeView(BocetoBlock),
      BocetoContext,
    ],
    content: SEED,
  })

  return (
    <>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </>
  )
}

function mountTiptapIsland(el: HTMLElement): void {
  createRoot(el).render(<App />)
}

if (typeof document !== 'undefined') {
  const found = document.getElementById('tt-island')
  if (found) mountTiptapIsland(found)
}
