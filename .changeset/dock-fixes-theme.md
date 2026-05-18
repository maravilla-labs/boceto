---
'@boceto/edit': minor
'@boceto/react': minor
'@boceto/vue': patch
'@boceto/svelte': patch
---

Multiple fixes + dark-theme support for the panel chrome.

**Right-click no longer paints the host blue.** `interactions.ts`'s
`onContextMenu` now calls `stopPropagation()` after `preventDefault()`,
keeping ProseMirror (TipTap NodeViews) and other hosts from seeing the
gesture and selecting the wrapping node. The canvas also gains
`user-select: none` so no surrounding text-selection bleeds across it.

**`<BocetoEditFull>` can now opt-out of internal panels.** New props
`palette` / `inspector` / `components` (booleans) let a host that
already mounts docked panels for the same editor skip the floating
duplicate. Defaults match v0.4 behaviour (palette + inspector mounted,
components not).

**Dark theme for panel chrome.** All three panels gain a `theme`
attribute (`"light"` | `"dark"` | `"auto"`) plus a suite of CSS
variables (`--boceto-panel-bg`, `--boceto-panel-fg`,
`--boceto-panel-border`, `--boceto-panel-accent`, …) seeded on the
panel root. `auto` follows `prefers-color-scheme`. The canvas surface
is intentionally **not** themed — only the chrome of the
palette / inspector / components panels and the context menu.

```tsx
<BocetoInspector for={id} mount="rail-inspector" dock theme="dark" />
```

Hosts wanting fine-grained custom palettes can override the CSS
variables from light-DOM CSS without setting a `theme` at all.
