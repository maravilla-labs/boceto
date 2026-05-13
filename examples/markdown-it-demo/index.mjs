import MarkdownIt from 'markdown-it'
import bocetoIt from '@boceto/markdown-it'

const source = `# Login flow

Some prose around the wireframe.

\`\`\`boceto Login
element navbar 60 40 340 44 "MyApp"
element heading 130 110 200 28 "Welcome back"
element input 100 190 260 36 "Email"
element primary-button 100 240 260 36 "Sign In"
\`\`\`

Done.
`

console.log('=== mode: wc (default) — renders <boceto-view>, needs the WC at runtime ===\n')
const wcMd = new MarkdownIt().use(bocetoIt)
console.log(wcMd.render(source))

console.log('\n=== mode: svg — inlines <svg>, zero JS at runtime ===\n')
const svgMd = new MarkdownIt().use(bocetoIt, { mode: 'svg', width: 480, height: 320 })
console.log(svgMd.render(source))
