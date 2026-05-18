---
slug: "tiptap-react"
kind: "stack"
stack: "tiptap"
title: "TipTap + React"
summary: "BocetoBlock TipTap node + BocetoContext extension + withReactNodeView. Multi-block component context is broadcast automatically."
---

# Embedding the boceto editor in a TipTap + React document

Use this when your host is a TipTap-powered rich-text editor in React (the typical "block-based" doc UI). Users write prose and embed boceto mockups as fenced blocks; the integration handles cross-block component sharing.

## Install

```bash
pnpm add @boceto/core @boceto/edit @boceto/view @boceto/tiptap @tiptap/core @tiptap/react @tiptap/starter-kit
```

Peer dependencies (host must install):
- `@tiptap/core` `^2.0.0 || ^3.0.0`
- `@tiptap/react` `^2.0.0 || ^3.0.0` (optional but required for `withReactNodeView`)
- `react` `^18.0.0 || ^19.0.0`

## Wire the editor

```tsx
// Editor.tsx
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { BocetoBlock, BocetoContext, BOCETO_ICON_SVG } from '@boceto/tiptap'
import { withReactNodeView } from '@boceto/tiptap/react'

export function Editor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      withReactNodeView(BocetoBlock), // node + React node view, in one
      BocetoContext,                  // broadcasts cross-block component defs
    ],
    content,
  })

  return (
    <>
      <button
        type="button"
        onClick={() => editor?.chain().focus().insertBocetoBlock().run()}
        title="Insert boceto block"
      >
        <span dangerouslySetInnerHTML={{ __html: BOCETO_ICON_SVG }} />
        Insert boceto
      </button>
      <EditorContent editor={editor} />
    </>
  )
}
```

That's the entire integration. `withReactNodeView(BocetoBlock)` returns a TipTap extension that mounts a React node view per block; the view toggles between read-mode (`<boceto-view>`) and edit-mode (`<boceto-edit>` + palette + inspector) on click. `BocetoContext` keeps `editor.storage.bocetoContext` in sync so every block sees every sibling block's `component … end` definitions.

## Insert a boceto block

The `BocetoBlock` node registers an `insertBocetoBlock(args?)` command:

```ts
editor.chain().focus().insertBocetoBlock().run()
editor.chain().focus().insertBocetoBlock({ code: 'element button 0 0 120 36 "Save"' }).run()
editor.chain().focus().insertBocetoBlock({ page: 'Login' }).run() // sets the fence's page name
```

## How multi-block context works

When the doc contains:

````
```boceto
component pricing-card(title, price)
  element card 0 0 240 160 ""
  element heading 8 8 220 28 "$title"
end
```

(prose)

```boceto
element pricing-card 0 0 240 160 "" title="Pro" price="$29"
```
````

…the `BocetoContext` extension aggregates every fence's source into `editor.storage.bocetoContext`. Each block's node view subtracts its own code and passes the remainder as the `imports` attribute on `<boceto-edit>`, so the call-site block resolves `pricing-card` against the defining block. The Components panel labels imported entries with `block N` hints automatically — see `boceto://references/components.md` for the panel UX.

## Handling cross-document navigation

When a user clicks "Go to source" on an imported component (in the Components panel or Inspector), `<boceto-edit>` dispatches a `gotodefinition` CustomEvent with `{ componentName, origin, hint }`. The TipTap integration already handles this by focusing the sibling block that defines the component — no extra code needed in your host. Listen on the React node view if you want to add extra UX (e.g. a toast).

## DSL source ↔ TipTap attrs

Each `BocetoBlock` node carries two attributes:
- `code` — the boceto DSL source (no fence markers).
- `page` — optional page name (the `:Page` suffix on a fence).

When serialized back to HTML (e.g. via `editor.getHTML()`), each block becomes `<pre><code class="language-boceto[:Page]">…</code></pre>`. Parse on the way back in: `BocetoBlock`'s `parseHTML` matches that exact shape.

## Custom elements / events you ship

After mounting, every block exposes:
- `<boceto-edit>` (edit mode) — events: `change`, `select`, `page`, `gotodefinition`, `componenteditmode`
- `<boceto-view>` (read mode)
- `<boceto-palette for=…>` (⌘K to open)
- `<boceto-inspector for=…>` (auto-shows on selection)
- `<boceto-components for=…>` (mount it yourself if you want the component-library panel — `withReactNodeView` does not include it by default; see the recipe additions below)

## Adding the Components panel

The default React node view mounts palette + inspector. To add the component-library panel, fork the node view from `@boceto/tiptap/react`'s source (it's small) and add a `<boceto-components for={editorId} open />` next to the inspector, or wrap the editor with a custom React node view:

```tsx
import { defineBocetoComponents } from '@boceto/edit'

useEffect(() => { defineBocetoComponents() }, [])

// Inside the edit-mode branch of your node view:
<boceto-components for={editorId} open />
```

## Common pitfalls

- **Palette + inspector + components panels target one editor at a time.** The `for=<id>` attribute binds each panel to the right `<boceto-edit>`; the underlying `activeEditor` registry auto-hides panels when focus moves to a different editor. Don't try to share a single panel across blocks.
- **`BocetoContext` is not optional** for multi-block docs. Without it, each block parses in isolation and a `component` defined in block A won't resolve in block B.
- **TipTap v2 vs v3** — `@boceto/tiptap` supports both. The peer-dep matrix is `^2.0.0 || ^3.0.0`.
- **Server-side rendering** — `<boceto-edit>` requires a DOM. Render the read-only `<boceto-view>` for SSR (or wait until client mount); both are exported from `@boceto/view` / `@boceto/edit`.
- **Big sources** — `imports` can grow with many components. Set it via the JS property (`el.imports = src`) rather than the attribute to skip attribute serialisation.

## Reference

- Canonical example: `examples/tiptap-demo/src/main.tsx` (this repo).
- Editor controller API: `boceto://references/components.md` (the "Authoring components in the editor" section).
- Underlying parser, component grammar: `boceto://references/components.md`.
