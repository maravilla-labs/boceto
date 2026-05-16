# Boceto

> *Boceto is to wireframes what Mermaid is to diagrams.*

**[Live site →](https://maravilla-labs.github.io/boceto/)** · all 83 elements rendered &nbsp;·&nbsp; by **[Maravilla Labs](https://www.maravillalabs.com)** ([github.com/maravilla-labs](https://github.com/maravilla-labs))

A tiny DSL for hand-drawn wireframes that lives inside fenced markdown code blocks, plus
framework-free web components and markdown plugins to render them anywhere. **83 element types**
covering desktop, mobile, AR, dashboards, AI/chat, and system chrome — plus composite components,
layout primitives, named IDs, and SVG output for SSR.

````markdown
```boceto:Login
element navbar       60  40 340  44 "MyApp"
element heading     130 110 200  28 "Welcome back"
element input       100 190 260  36 "Email"
element input       100 236 260  36 "Password"
element primary-button 100 284 260 36 "Sign In"
```
````

→ renders to a sketchy wireframe via `<boceto-view>`.

In the markdown plugins (`@boceto/remark`, `@boceto/markdown-it`) the SVG-mode
output auto-fits the content of each fence. You can pin a specific viewport on
a single block with per-fence hints in the fence info string:

````markdown
```boceto:Mobile width=320 height=640
…
```

```boceto:Showcase fit=fixed width=1280 height=800
…
```
````

Recognized keys: `fit` (`content` | `fixed`), `width`, `height`, `padding`.

## Packages

**Runtime**

| Package                  | What it is                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `@boceto/core`           | Parser, serializer, types, canvas + SVG renderer                                          |
| `@boceto/view`           | `<boceto-view>` read-only web component                                                   |
| `@boceto/edit`           | `<boceto-edit>` editor + `<boceto-palette>` + `<boceto-inspector>` web components         |
| `@boceto/lint`           | DSL linter + auto-fixer (CLI / playground / MCP / CI)                                     |

**Markdown / editor integrations**

| Package                  | What it is                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `@boceto/remark`         | remark plugin — `lang=boceto` → `<boceto-view>` (or inline SVG, cross-block context)      |
| `@boceto/markdown-it`    | markdown-it plugin — same, for the other parser                                           |
| `@boceto/tiptap`         | TipTap node + extension — embed Boceto blocks in any TipTap editor, cross-block context   |

**Framework wrappers**

| Package                  | What it is                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `@boceto/react`          | React wrappers — `<BocetoView>`, `<BocetoEdit>`, `<BocetoEditFull>`, palette + inspector  |
| `@boceto/vue`            | Vue 3 wrappers for `<boceto-view>` and `<boceto-edit>`                                    |
| `@boceto/svelte`         | Svelte components — works with Svelte 4 and Svelte 5                                      |

**AI assistance**

| Package                  | What it is                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `boceto` (CLI)           | `npx boceto init` / `add skill` / `add mcp` — wires AI tools to the skill + MCP server    |
| `@boceto/skill`          | SKILL.md authoring rules + references, installable into Claude Code, Cursor, Cline, etc.  |
| `@boceto/mcp`            | MCP server — parse, lint, fix, render-svg, catalog tools + skill/spec as resources        |

## Spec

The Boceto DSL is documented in [`spec/boceto-spec.md`](./spec/boceto-spec.md). For an
interactive element catalog see the [docs site](https://maravilla-labs.github.io/boceto/elements.html).

## Develop

Requires **Node ≥ 18.17** and **pnpm ≥ 9** (`corepack enable` will install it for you).

```bash
pnpm install        # link the workspace and pull deps
pnpm build          # build all packages (required before typecheck/examples)
pnpm test           # run vitest in every package
pnpm typecheck      # tsc --noEmit across packages
pnpm dev            # tsup --watch in every package, in parallel
pnpm format         # prettier --write
pnpm changeset      # author a release note (changesets)
```

Per-package: each package has the same scripts (`build`, `dev`, `test`). Run a
single package with pnpm's filter, e.g. `pnpm --filter @boceto/core test`.

## Try the examples

Each example is a workspace package under `examples/` with a `start` script.
After `pnpm install` + `pnpm build`:

```bash
# Web components in a static HTML page (open the printed URL).
pnpm --filter @boceto/example-vanilla-html start

# remark plugin → prints HTML to stdout.
pnpm --filter @boceto/example-remark-demo start

# markdown-it plugin → prints HTML to stdout.
pnpm --filter @boceto/example-markdown-it-demo start

# Vite + React + TipTap — opens at http://localhost:5174.
pnpm --filter @boceto/example-tiptap-demo dev
```

The `react-app` example is a placeholder skeleton — see
[`examples/react-app/README.md`](./examples/react-app/README.md).

## Repo layout

```
boceto/
├── spec/                    DSL specification
├── skill/                   Authoring skill content (SKILL.md + references)
├── site/                    Static docs site (deployed to GitHub Pages)
├── packages/
│   ├── core/                @boceto/core — parser, serializer, renderer
│   ├── view/                @boceto/view — <boceto-view>
│   ├── edit/                @boceto/edit — <boceto-edit> + palette + inspector
│   ├── lint/                @boceto/lint — DSL linter + auto-fixer
│   ├── remark-boceto/       @boceto/remark
│   ├── markdown-it-boceto/  @boceto/markdown-it
│   ├── tiptap-boceto/       @boceto/tiptap
│   ├── react/               @boceto/react
│   ├── vue/                 @boceto/vue
│   ├── svelte/              @boceto/svelte
│   ├── cli/                 boceto — unified install CLI (npx boceto …)
│   ├── skill/               @boceto/skill — distributable skill bundle
│   └── mcp/                 @boceto/mcp — MCP server for AI clients
├── examples/
│   ├── vanilla-html/
│   ├── markdown-it-demo/
│   ├── remark-demo/
│   ├── react-app/
│   └── tiptap-demo/
└── .github/workflows/       CI + GitHub Pages deploy
```

## License

MIT © [Maravilla Labs](https://www.maravillalabs.com) — see the rest of our work on GitHub at [github.com/maravilla-labs](https://github.com/maravilla-labs).
