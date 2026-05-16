import MarkdownIt from 'markdown-it'
import bocetoIt from '@boceto/markdown-it'
import { initYoga } from '@boceto/core'

// markdown-it's render pipeline is synchronous; the boceto svg-mode layout
// pass needs Yoga, so the host must initialize it once up front.
await initYoga()

const source = `# Login flow

Some prose around the wireframe.

\`\`\`boceto Login
element navbar 60 40 340 44 "MyApp"
element heading 130 110 200 28 "Welcome back"
element input 100 190 260 36 "Email"
element primary-button 100 240 260 36 "Sign In"
\`\`\`

A second fence — pinned to a fixed 400×200 viewport via per-fence hints:

\`\`\`boceto Toast fit=fixed width=400 height=200
element toast 20 70 360 60 "Saved successfully"
\`\`\`

Done.
`

console.log('=== mode: wc (default) — renders <boceto-view>, needs the WC at runtime ===\n')
const wcMd = new MarkdownIt().use(bocetoIt)
console.log(wcMd.render(source))

// SVG mode auto-sizes each fence to its content; the "Toast" fence above
// opts into a fixed 400×200 viewport with `fit=fixed width=400 height=200`.
console.log('\n=== mode: svg — inlines <svg>, zero JS at runtime ===\n')
const svgMd = new MarkdownIt().use(bocetoIt, { mode: 'svg' })
console.log(svgMd.render(source))
