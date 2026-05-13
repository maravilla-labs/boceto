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
`

console.log('=== mode: wc (default) — renders <boceto-view>, needs the WC at runtime ===\n')
const wcOut = await remark()
  .use(remarkBoceto)
  .use(remarkHtml, { sanitize: false })
  .process(source)
console.log(String(wcOut))

console.log('\n=== mode: svg — inlines <svg>, zero JS at runtime ===\n')
const svgOut = await remark()
  .use(remarkBoceto, { mode: 'svg', width: 480, height: 320 })
  .use(remarkHtml, { sanitize: false })
  .process(source)
console.log(String(svgOut))
