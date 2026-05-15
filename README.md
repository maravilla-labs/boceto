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

## Packages

| Package                  | What it is                                        |
| ------------------------ | ------------------------------------------------- |
| `@boceto/core`           | Parser, serializer, types, canvas renderer        |
| `@boceto/view`           | `<boceto-view>` read-only web component           |
| `@boceto/edit`           | `<boceto-edit>` editor web component              |
| `@boceto/remark`         | remark plugin — `lang=boceto` → `<boceto-view>`   |
| `@boceto/markdown-it`    | markdown-it plugin — same, for the other parser   |
| `@boceto/react`          | Optional React wrappers around the web components |

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
```

The `react-app` example is a placeholder skeleton — see
[`examples/react-app/README.md`](./examples/react-app/README.md).

## Repo layout

```
boceto/
├── spec/                    DSL specification (v0.1)
├── site/                    Static docs site (deployed to GitHub Pages)
├── packages/
│   ├── core/                @boceto/core — parser, serializer, renderer
│   ├── view/                @boceto/view — <boceto-view>
│   ├── edit/                @boceto/edit — <boceto-edit>
│   ├── remark-boceto/       @boceto/remark
│   ├── markdown-it-boceto/  @boceto/markdown-it
│   └── react/               @boceto/react
├── examples/
│   ├── vanilla-html/
│   ├── markdown-it-demo/
│   ├── remark-demo/
│   └── react-app/
└── .github/workflows/       CI + GitHub Pages deploy
```

## License

MIT © [Maravilla Labs](https://www.maravillalabs.com) — see the rest of our work on GitHub at [github.com/maravilla-labs](https://github.com/maravilla-labs).
