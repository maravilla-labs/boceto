import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { remark } from 'remark'
import remarkHtml from 'remark-html'
import remarkBoceto from '@boceto/remark'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 5174

const source = `# Dashboard

\`\`\`boceto Dashboard
element navbar 0 0 460 44 "MyApp Dashboard"
element card 20 60 200 100 "Users"
element card 240 60 200 100 "Revenue"
element progress 20 280 420 16 "" progress=72
\`\`\`
`

async function renderPage() {
  const wcOut = await remark()
    .use(remarkBoceto)
    .use(remarkHtml, { sanitize: false })
    .process(source)

  const svgOut = await remark()
    .use(remarkBoceto, { mode: 'svg', width: 480, height: 320 })
    .use(remarkHtml, { sanitize: false })
    .process(source)

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>remark-demo</title>
  <script type="module" src="/boceto-view.js"></script>
  <style>
    body { font: 14px system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
    section { margin-bottom: 2rem; }
    h2 { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <section>
    <h2>mode: wc (default)</h2>
    ${String(wcOut)}
  </section>
  <section>
    <h2>mode: svg</h2>
    ${String(svgOut)}
  </section>
</body>
</html>`
}

const viewAutoPath = join(
  __dirname,
  '..',
  '..',
  'packages',
  'view',
  'dist',
  'auto.js',
)

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/boceto-view.js') {
      const js = await readFile(viewAutoPath)
      res.writeHead(200, { 'content-type': 'application/javascript' })
      res.end(js)
      return
    }
    const html = await renderPage()
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(html)
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' })
    res.end(String(err?.stack || err))
  }
})

server.listen(PORT, () => {
  console.log(`remark-demo dev server: http://localhost:${PORT}`)
})
