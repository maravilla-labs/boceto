---
slug: "react-markdown"
kind: "stack"
stack: "react-markdown"
title: "react-markdown (with @boceto/remark)"
summary: "Plug @boceto/remark into react-markdown via rehype-raw + a `boceto-view` component override. Same-file fence aggregation and cross-file imports come from the remark plugin; no new boceto package needed."
---

# Rendering boceto inside a `react-markdown` view

Use this recipe when your React app already renders markdown through
[`react-markdown`](https://github.com/remarkjs/react-markdown) and you want
to drop boceto support in without switching renderers. The Flightdeck docs-app
and any react-markdown-backed wiki / docs / inbox UI is the target.

`react-markdown` exposes the standard remark / rehype plugin pipeline, so the
already-shipped `@boceto/remark` plugin slots in directly. The only extra
piece is a `rehype-raw` pass that re-parses the raw HTML the plugin emits
into a real DOM element, plus a `components` override that swaps
`<boceto-view>` for the typed `BocetoView` React component.

## Install

```bash
pnpm add @boceto/core @boceto/view @boceto/react @boceto/remark react-markdown rehype-raw
```

Peer dependencies the host must already have:

- `react` `^18.0.0 || ^19.0.0`
- `react-markdown` `^9.0.0 || ^10.0.0`

## Wire the renderer

```tsx
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkBoceto from '@boceto/remark'
import rehypeRaw from 'rehype-raw'
import { BocetoView } from '@boceto/react'

const components: Components = {
  // `@boceto/react` augments `JSX.IntrinsicElements` so `'boceto-view'` is
  // first-class typed — no `as any` cast required. `BocetoView` is the
  // React component; the props that survive through rehype-raw are
  // `code` (string), `page` (string | undefined) and `imports` (string).
  'boceto-view': (props) => (
    <BocetoView
      code={props.code as string}
      page={props.page as string | undefined}
      imports={props.imports as string | undefined}
    />
  ),
}

function DocView({ body }: { body: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkBoceto]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {body}
    </ReactMarkdown>
  )
}
```

That's the whole integration. Every ```boceto fence in `body` becomes a
`<BocetoView>` element. Same-file sibling fences automatically share their
`component … end` definitions (the remark plugin does this for every host —
TipTap, Astro, react-markdown, all the same code path).

## Cross-document imports via frontmatter

`@boceto/remark` resolves `boceto.import` declared in YAML frontmatter:

```md
---
title: Courses page
boceto:
  import:
    - ./00-component-library.md
---

```boceto
element feature-card 0 0 240 140 "" title="React" body="Hooks deep dive"
```
```

**In a Node / SSR context** (an Astro / Next / Vite SSR server route that
runs `remark` against files on disk), the unified pipeline sets `file.path`
automatically when the consumer calls `.process({ path, value })`, and the
plugin walks the file system from there.

**In a browser / Tauri / non-Node host** — including
[`react-markdown`](https://github.com/remarkjs/react-markdown#syntax) — the
source comes in via the `children` prop as a bare string. There's no VFile
path; the plugin needs both a custom `fs` adapter (Node's `node:fs/promises`
isn't available) and a `currentFilePath` so it knows what directory to
resolve `./shared/cards.md` against:

```tsx
import { LibraryCache } from '@boceto/core'

const cache = new LibraryCache()                    // share across renders
const projectRoot = '/Users/me/proj'                // absolute root
const docAbsPath = `${projectRoot}/page.md`         // current doc

const remarkPlugins = [
  [
    remarkBoceto,
    {
      resolveImports: {
        cache,
        projectRoot,
        currentFilePath: docAbsPath,
        // Custom fs adapter (Tauri example — replace with your host's read).
        fs: {
          readFile: async (absPath: string) => {
            const text = await tauriReadFile(absPath)
            return new TextEncoder().encode(text)
          },
        },
        // v1 ships no default glob in browser hosts — pass relative paths.
        glob: async () => [],
      },
    },
  ],
] satisfies import('react-markdown').Options['remarkPlugins']

<ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={[rehypeRaw]} components={components}>
  {body}
</ReactMarkdown>
```

The same `LibraryCache` survives across doc switches — second + later
renders that import the same library skip the read entirely. When a library
file changes on disk, call `cache.invalidateDependents(absPath)` (typically
from your host's file-watch event) so the next render re-reads it.

## `mode: 'svg'` — zero-JS rendering

Pass `mode: 'svg'` to the plugin and skip the `'boceto-view'` component
override — `@boceto/remark` will emit a complete `<svg>` document inline:

```tsx
<ReactMarkdown
  remarkPlugins={[[remarkBoceto, { mode: 'svg' }]]}
  rehypePlugins={[rehypeRaw]}
>
  {body}
</ReactMarkdown>
```

Use SVG mode for read-only views you want renderable in environments
without the client-side `<boceto-view>` runtime (RSS readers, plain print,
etc.). The default `'wc'` mode keeps interactivity (custom-element zoom /
selection events).

## Why `rehype-raw`?

`@boceto/remark` transforms ```boceto fences into raw HTML mdast nodes —
specifically `{ type: 'html', value: '<boceto-view code="…">' }`.
`react-markdown` drops raw HTML by default for safety; `rehype-raw`
reparses it into proper hast so the `components` map can swap the tag for
a real React component.

**Security note**: `rehype-raw` allows *every* raw HTML node in the source,
not just boceto. If `body` is user-authored from untrusted users, add
[`rehype-sanitize`](https://github.com/rehypejs/rehype-sanitize) AFTER
`rehype-raw` with a schema that allowlists the `boceto-view` element (and
its `code` / `page` / `imports` attributes). For trusted content (CMS-style
authoring with your own contributors), `rehype-raw` alone is fine.

## Custom elements / events you ship

After mounting:

- `<boceto-view>` (read-only canvas). Events: `boceto-render`
  `{ doc, page }` on every successful render. Available on the `BocetoView`
  React component as `onRender`.

The interactive editor (`<boceto-edit>`, palette, inspector, components
panel) lives in `@boceto/edit`; the read-only view typical to a docs
renderer is enough for this recipe. If you want users to edit boceto
mockups inline, use the `tiptap-react` recipe or the `react` recipe
(`@boceto/react`'s `<BocetoEditFull>`).

## Common pitfalls

- **Plugin order matters.** `rehypeRaw` MUST run BEFORE `rehype-highlight`
  / `rehype-sanitize`. The `<boceto-view>` element should pass through
  highlighters and sanitisers as-is once it's been parsed.
- **`<pre>` double-frame.** The default `react-markdown` styling wraps
  fenced code blocks in `<pre><code>`. `@boceto/remark` replaces the
  `<code>` with `<boceto-view>` but the surrounding `<pre>` may still
  render — add a `pre` override that unwraps when its only child is a
  boceto view, or style `pre:has(boceto-view)` away in CSS. (The Flightdeck
  docs-app does this; example in `frontend/src/components/DocContent.tsx`.)
- **TypeScript and custom elements.** `@boceto/react` declares
  `'boceto-view'`, `'boceto-edit'`, `'boceto-palette'`, `'boceto-inspector'`,
  and `'boceto-components'` on `JSX.IntrinsicElements`, so the `components`
  map entry is type-clean. If you haven't imported anything from
  `@boceto/react` yet, add a side-effect import (`import '@boceto/react'`)
  to pull in the declarations.
- **`code` attribute size.** Large boceto sources serialised as HTML
  attributes can hit the browser's attribute-length budget. `<boceto-view>`
  reads the attribute fine up to a few hundred KB, but for *very* big
  fences consider rendering them via `mode: 'svg'` instead.
- **Same-file fence aggregation matches by source.** Two identical fence
  bodies in one doc are rare but possible; the matcher handles them by
  consumption order (same as `@boceto/remark` in every other host).

## Reference

- Plugin source + options: `packages/remark-boceto/src/index.ts` (top-of-file doc-comment).
- Cross-document import contract: `boceto://references/components.md` (the "Cross-document libraries" section).
- React component reference: `boceto://integrations/react.md` for the interactive editor variant.
- Real-world consumer: Flightdeck docs-app's `frontend/src/components/DocContent.tsx` (Tauri-backed cross-file resolver wired against this same recipe).
