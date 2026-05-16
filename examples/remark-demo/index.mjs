import { remark } from 'remark'
import remarkHtml from 'remark-html'
import remarkBoceto from '@boceto/remark'

const source = `# Dashboard

\`\`\`boceto Dashboard
element navbar 0 0 460 44 "MyApp Dashboard"
element card 20 60 200 100 "Users"
element card 240 60 200 100 "Revenue"
element progress 20 280 420 16 "" progress=72
\`\`\`

A second fence — same plugin, smaller mobile viewport set with a per-fence hint:

\`\`\`boceto Mobile width=320
element phone-frame 0 0 320 640 ""
element heading 20 80 280 32 "Welcome"
element primary-button 20 560 280 44 "Continue"
\`\`\`
`

console.log('=== mode: wc (default) — renders <boceto-view>, needs the WC at runtime ===\n')
const wcOut = await remark()
  .use(remarkBoceto)
  .use(remarkHtml, { sanitize: false })
  .process(source)
console.log(String(wcOut))

// SVG mode auto-sizes each fence to its content by default; no global
// width/height needed. The "Mobile" fence above sets `width=320` per fence
// to act as a minimum floor for that one block.
console.log('\n=== mode: svg — inlines <svg>, zero JS at runtime ===\n')
const svgOut = await remark()
  .use(remarkBoceto, { mode: 'svg' })
  .use(remarkHtml, { sanitize: false })
  .process(source)
console.log(String(svgOut))
