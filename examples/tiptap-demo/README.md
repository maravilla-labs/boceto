# `@boceto/tiptap` demo

Vite + React + TipTap + `@boceto/tiptap` showing the **literate-component pattern**: one fence defines `pricing-card`, two later fences use it. The `BocetoContext` extension broadcasts the doc-level source so each block resolves references through the same component registry.

## Run

```sh
pnpm install
pnpm --filter @boceto/example-tiptap-demo dev
```

Then open the URL Vite prints. Click any Boceto block to enter edit mode (full canvas + palette + inspector). Hit **Done** to return to read mode.

## What to try

- Edit the `pricing-card` definition (the first fence) — change its label text or default size. Click out. The "Pro" and "Team" blocks update automatically on the next transaction.
- Click the toolbar's Boceto icon to insert a new block, then reference `pricing-card` inside it — the new block sees the component because `BocetoContext` rebuilt the imports source.
