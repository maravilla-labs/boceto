import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { BocetoBlock, BocetoContext, BOCETO_ICON_SVG } from '@boceto/tiptap'
import { withReactNodeView } from '@boceto/tiptap/react'

const SEED = `
<h2>Pricing</h2>
<p>Below we define a <code>pricing-card</code> component once, then reuse it in two flavors. Click any boceto block to edit it.</p>
<pre><code class="language-boceto">component pricing-card(title, price, blurb)
  element card 0 0 240 200 ""
  element heading 12 12 216 28 "$title"
  element heading 12 50 216 36 "$price"
  element label 12 100 216 60 "$blurb"
  element primary-button 12 168 216 32 "Choose"
end</code></pre>
<p>Pro:</p>
<pre><code class="language-boceto">element pricing-card 0 0 240 200 "" title="Pro" price="$29/mo" blurb="Everything you need to ship."</code></pre>
<p>Team:</p>
<pre><code class="language-boceto">element pricing-card 0 0 240 200 "" title="Team" price="$99/mo" blurb="Five seats and priority support."</code></pre>
`

function App() {
  const editor = useEditor({
    extensions: [StarterKit, withReactNodeView(BocetoBlock), BocetoContext],
    content: SEED,
  })

  return (
    <>
      <div className="toolbar">
        <button
          type="button"
          onClick={() => editor?.chain().focus().insertBocetoBlock().run()}
          title="Insert Boceto block"
        >
          <span className="icon" dangerouslySetInnerHTML={{ __html: BOCETO_ICON_SVG }} />
          Insert Boceto
        </button>
      </div>
      <EditorContent editor={editor} />
    </>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
