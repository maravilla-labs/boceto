# Vanilla HTML example

A static `index.html` that loads `@boceto/view/auto` and `@boceto/edit/auto`
from the workspace and renders one `<boceto-view>` plus one `<boceto-edit>`.

## Run

From the repo root:

```bash
pnpm install                                    # once
pnpm build                                      # once (or after editing a package)
pnpm --filter @boceto/example-vanilla-html start
```

That runs `pnpm dlx serve .` in this folder. Open the printed URL.
