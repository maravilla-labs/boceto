---
slug: "react"
kind: "stack"
stack: "react"
title: "React app (no TipTap)"
summary: "@boceto/react wrappers — <BocetoEditFull> for the full authoring surface, or à-la-carte <BocetoEdit> + <BocetoPalette> + <BocetoInspector>."
---

# Embedding the boceto editor in a React app

Use this recipe when the editor is the main surface of a React app — a standalone design tool, an admin panel, an embedded canvas in a SaaS dashboard. (For TipTap-style rich-text docs, use `tiptap-react` instead.)

## Install

```bash
pnpm add @boceto/core @boceto/view @boceto/edit @boceto/react
```

Peer dependency: `react` `^18.0.0 || ^19.0.0`.

## The simplest setup

`<BocetoEditFull>` mounts the canvas plus the palette and inspector, wired together by a stable id:

```tsx
import { BocetoEditFull } from '@boceto/react'

export function Designer() {
  return (
    <BocetoEditFull
      code={initialSource}
      onChange={(code) => save(code)}
      style={{ width: '100%', height: '600px' }}
    />
  )
}
```

That's the whole integration. The palette opens with ⌘K / Ctrl+K; the inspector auto-shows when an element is selected. Both panels mount in `document.body` and escape the React subtree (no clipping by ancestor `overflow: hidden`).

## À-la-carte

Compose the pieces yourself when you need different layout / lifecycle:

```tsx
import { BocetoEdit, BocetoPalette, BocetoInspector } from '@boceto/react'

export function Designer() {
  const id = 'main-editor'
  return (
    <>
      <BocetoEdit
        id={id}
        code={initialSource}
        onChange={(code) => save(code)}
        style={{ width: '100%', height: '600px' }}
      />
      <BocetoPalette for={id} />
      <BocetoInspector for={id} auto />
    </>
  )
}
```

The `id` prop on `<BocetoEdit>` flows through to the underlying `<boceto-edit>` so each panel's `for={id}` finds the right target. When omitted, `<BocetoEditFull>` generates a stable `useId`-based id automatically.

## The Components panel

`<BocetoEditFull>` does not include the component-library panel yet (it's the most recent addition). Mount it yourself alongside:

```tsx
import { useEffect } from 'react'
import { defineBocetoComponents } from '@boceto/edit'

function ComponentsPanel({ editorId }: { editorId: string }) {
  useEffect(() => { defineBocetoComponents() }, [])
  // The custom element is framework-agnostic — pass through as a lower-cased tag.
  return <boceto-components for={editorId} open />
}
```

Declare the JSX intrinsic once in a `*.d.ts`:

```ts
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'boceto-components': React.HTMLAttributes<HTMLElement> & { for?: string; open?: boolean | string }
    }
  }
}
```

The panel lists every component in scope (local + imported), supports create/rename/edit-in-place/promote-from-selection. See `boceto://references/components.md` for full UX details.

## Reading the source

`onChange` fires on every user commit. The detail is the new DSL source string:

```tsx
<BocetoEdit
  code={src}
  onChange={(next) => {
    setSrc(next)
    persistDebounced(next)
  }}
/>
```

Two-way data flow: setting the `code` prop replaces the doc (clears history, drops selection if the items no longer exist). For incremental edits, prefer letting the editor own the source between `onChange` callbacks.

## Cross-document component sharing

Pass library source via the `imports` prop:

```tsx
<BocetoEdit
  code={pageSource}
  imports={libSource}  // one or more fenced ```boceto blocks
  onChange={setSrc}
/>
```

For docs-app style file-based imports (resolving paths in YAML frontmatter), see the `docs-site` integration — that recipe shows how to build the merged `imports` string from a `LibraryCache` and feed it to the React wrapper.

## Reading editor state imperatively

`<BocetoEdit>` forwards a `ref` to the underlying custom element. Its `.editor` property is the headless `BocetoEditor` controller:

```tsx
import { useRef, useEffect } from 'react'

function MyTools() {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current as (HTMLElement & { editor: any }) | null
    if (!el?.editor) return
    // Subscribe to controller events not exposed via React props:
    return el.editor.on('select', (e: { ids: string[] }) => updateToolbar(e.ids))
  }, [])

  return <BocetoEdit ref={ref} code={src} onChange={setSrc} />
}
```

See `boceto://references/components.md` for the full controller surface (CRUD, promote-to-component, edit mode, etc.).

## Custom elements / events you ship

Same as the `web-components` recipe — `<BocetoEditFull>` is just a React wrapper around the same custom elements:
- `<BocetoEdit>` → `<boceto-edit>` with `onChange`, `onSelect`, `onPage` props.
- `<BocetoView>` → `<boceto-view>` (read-only).
- `<BocetoPalette>` / `<BocetoInspector>` → bind via `for` prop.
- `<boceto-components>` → mount manually as shown above.

Available DOM events on the underlying element: `change`, `select`, `page`, `gotodefinition`, `componenteditmode`.

## Common pitfalls

- **Strict-mode double-mount**: in React 18 dev mode, `<BocetoEditFull>` mounts twice on first render. The underlying custom element is idempotent — the second mount reuses the same `<boceto-edit>` constructor. No visual flicker; safe.
- **Server-side rendering**: `<boceto-edit>` requires a DOM (it uses `ResizeObserver`, `Canvas`, etc.). For SSR, render `<BocetoView>` (the read-only variant) on the server and hydrate to `<BocetoEdit>` on the client.
- **Width / height**: the underlying element observes its CSS-rendered size — set both via the `style` prop or a parent container. Width/height attributes act as fallbacks only.
- **Multiple editors**: assign each one an explicit `id` and the matching `for=` on every panel.
- **`<BocetoEditFull>` does not include the Components panel** yet — see above for adding it. We'll fold it in once the API stabilises.

## Reference

- Source of `<BocetoEditFull>`: `packages/react/src/BocetoEditFull.tsx`.
- Web-component recipe (for the underlying surface): `boceto_read_integration({ slug: "web-components" })`.
- Editor controller + Components panel: `boceto://references/components.md`.
