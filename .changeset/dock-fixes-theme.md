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

**WKWebView / Tauri host fixes.** Several quiet failure modes surfaced
when embedding the editor in a Tauri 2 webview:

- `promoteToComponent` (right-click → "Make component from selection…")
  no longer uses `window.prompt` / `window.alert` (silently blocked in
  WKWebView). It renders an in-DOM modal mounted to `document.body`
  instead — same gesture, works in every host.
- `<boceto-edit>` derives `min-width` / `min-height` from its `width`
  / `height` attributes when the host doesn't supply CSS dimensions,
  so the canvas isn't 0-height on first paint in containers without an
  explicit height.
- Canvas `dragover` now accepts any active drag and validates the MIME
  type at `drop` time. Safari / WKWebView hide custom MIME types from
  `dataTransfer.types` during `dragover`, so the previous gate on
  `application/boceto-element-type` always failed there and palette
  drags never registered as drops.
- Canvas `dragover` + `drop` `stopPropagation()` defensively so a
  surrounding rich-text host (ProseMirror, etc.) can't claim a drop
  the canvas has already handled.
- Components panel header is now `flex-wrap: wrap` with the search
  input as `flex: 1 1 120px; min-width: 0` — on a narrow docked rail
  (e.g. 280px) the "+ New" button drops onto a second row instead of
  being clipped off-screen.
