# remark example

A Node script that runs a sample markdown document through the `remark` +
`remark-html` pipeline with `@boceto/remark` plugged in, and prints the
resulting HTML.

## Run

From the repo root:

```bash
pnpm install
pnpm build
pnpm --filter @boceto/example-remark-demo start
```

That runs `node index.mjs` in this folder.
