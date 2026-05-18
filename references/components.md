# Boceto components — reusable definitions, slots, shells

Load this when the user wants to define a reusable wireframe component (e.g. a feature card that gets reused in several places), or when their existing DSL has `component … end` blocks.

## Defining a component

```
component <Name>(<param1>, <param2>) [shell-attrs] [defaults]
  <body using $param substitutions>
end
```

- **Name** must match `[A-Za-z][A-Za-z0-9_-]*` and cannot collide with any built-in element type (so `button` and `card` are reserved; use `my-card` or `feature-card`).
- **Params** are named slots for substitution inside the body. Inside the body, `$name` or `${name}` are replaced with the param value at the call site. Param names follow JS identifier rules (`[A-Za-z_][A-Za-z0-9_]*`) — **no hyphens**. Use camelCase (`navItems`) or snake_case (`nav_items`); the parser rejects `nav-items`.
- **Shell attrs** make the component behave like a flex container (see "Responsive shells" below). When set, the body lays out as flex children of the instance's outer box.
- **Defaults** declare default `w` / `h` (or `auto`) and per-instance flex props (`grow`, `shrink`, etc.) that the call site can override.

### Minimal example

```boceto
component feature-card(title, body)
  element card    0  0 240 140 ""
  element heading 12 12 216 28 "$title"
  element label   12 50 216 60 "$body"
end

# Call sites
element feature-card 40  40 240 140 "" title="Fast" body="Renders in <16ms."
element feature-card 320 40 240 140 "" title="Tiny" body="Under 50kB gzipped."
```

The instance line uses the component name in the `type` slot, an empty label `""`, and the params as attributes.

**Important parser limitation:** *element-as-container* (`element TYPE … : / … / end`) works at the page level but is **NOT supported inside a `component` body** today. Use **absolute coordinates** for body items, like the `feature-card` example above — the children sit at (12, 12), (12, 50), etc. inside the card's 240×140 frame. If you write `element card 0 0 240 140 "" :` inside a component the parser will fail with `Unclosed 'element card' block`.

If you need flex layout *inside* a component, use a `row` / `col` keyword (those *are* supported in component bodies):

```boceto
component toolbar(title)
  row 0 0 0 0 gap=12 align=middle padding=12
    element heading 0 0 0 28 "$title" grow=1
    element primary-button 0 0 100 36 "Save"
  end
end
```

This is the responsive-shell pattern (see "Responsive shells" below).

## Param substitution

Two forms — both work in labels and in attribute values:

```
"$name"      # bare — name continues until a non-identifier character
"${name}!"   # braced — explicit boundary, can adjoin other text
```

Examples:

```
element heading 0 0 200 28 "$title"              # whole label is the param
element heading 0 0 200 28 "Welcome, ${who}!"    # param embedded in text
element progress 0 0 200 18 "" progress=$value   # numeric attr substitution
```

Unknown params substitute to empty string (no error). Use `${param}` form when the param name needs to butt up against other text without ambiguity.

## Responsive shells

When a `component` header sets `direction=row` or `direction=col` (with optional `gap` / `padding` / `justify` / `align` / `wrap`), the body becomes flex children of the instance's outer box. This is how you build components that **adapt** when the call site changes their size.

```boceto
component toolbar(title)
  direction=row padding=12 gap=12 align=middle :
    element heading 0 0 0 28 "$title" grow=1
    element primary-button 0 0 100 36 "Save"
    element button 0 0 100 36 "Cancel"
  end
end

# 600-wide call: heading takes most of the space
element toolbar 0  0 600 60 "" title="Settings"

# 300-wide call: heading shrinks, buttons keep their size
element toolbar 0 80 300 60 "" title="Mobile"
```

Without a shell, the body uses absolute coordinates (relative to the instance origin).

## Defaults

Set defaults on the component header so call sites don't have to repeat themselves:

```boceto
component panel(title) direction=col gap=8 padding=12 w=auto h=auto min-w=200 max-w=600
  element heading 0 0 0 28 "$title"
  slot
end
```

Now `element panel 0 0 auto auto "" title="Sidebar"` automatically picks up min/max width and `direction=col gap=8 padding=12` from the defaults.

| Default key | Meaning |
|---|---|
| `w`, `h` | Default size (number or `auto`). |
| `min-w`, `min-h`, `max-w`, `max-h` | Constraints on the resolved instance box. |
| `grow`, `shrink`, `basis`, `align-self` | Per-child flex defaults — used when the instance is a flex-child of a `row` / `col`. |

## Two parser limitations that bite

Both of these are real constraints of the v0.1 parser, not stylistic preferences. Authors hit them often:

1. **`element ... :` (element-as-container) is NOT supported inside a `component` body.** Use absolute coordinates for body items, or use `row` / `col` instead (those *are* supported). At the page level, element-as-container works fine.

2. **`slot` markers must be direct top-level statements in the component body.** They cannot be nested inside a `row`, a `col`, or an element-as-container. The parser rejects with `'slot' markers belong in component bodies, not inside a 'row' or 'col'`.

   ```boceto
   # WRONG — slot inside a row
   component panel(title)
     row 0 0 0 32 gap=8 align=middle
       element heading 0 0 0 24 "$title" grow=1
       slot actions                       # ✗ parser error
     end
   end

   # RIGHT — slot at the top level, positioned with absolute coords
   component panel(title)
     element heading 12 12 200 24 "$title"
     slot actions                          # ✓ at top level
     element divider 0 44 0 1 ""
     slot                                  # default slot
   end
   ```

   If you want a horizontal header layout, place the heading and the slot at the same `y` with absolute coords — the slot's children are then positioned at absolute coords by the call site to land where you expect (e.g. `element button 240 12 32 28 "+"`).

## Slots — call-site children

Slots let a component accept arbitrary children from the call site:

```boceto
component card-with-actions(title)
  direction=col gap=0 padding=0 :
    element box 0 0 0 40 "$title" grow=0
    slot                                  # default slot — main body
    element box 0 0 0 40 ""    grow=0
    slot footer                           # named slot — footer row
  end
end

# Call site fills the slots with regular DSL
element card-with-actions 0 0 320 280 "" title="Inbox" :
  element list 0 0 0 0 items="Email|Slack|SMS"
  slot footer
    element button 0 0 80 32 "Mark all"
    element primary-button 0 0 80 32 "Reply"
  end
end
```

- A bare `slot` in the body marks the **default slot**.
- `slot NAME` marks a **named slot**.
- At the call site, opening with `:` lets you pass children. Bare children fill the default slot; `slot NAME … end` sub-blocks fill named slots.

Slots are useful when you want to define a layout shape (header / body / footer) once but let each call site supply its own content.

## When to use components

Reach for `component` when:

- The same chunk of DSL appears 3+ times in the doc.
- A part of the wireframe should adapt size (use a flex shell).
- You want to expose a "design token" — e.g. `metric-card(label, value)` for a dashboard.

For one-off shapes, plain `box` / `card` / `row` / `col` are faster to author. Components add value when reused or when they hide complexity from the page-level DSL.

## Pitfalls

- **Name collision with built-ins**: `component card(t)` errors with "name collides with built-in element type". Use `my-card` or `feature-card`.
- **Component instances in tight columns**: `element my-card 0 0 0 auto "" grow=1` works only if the component's shell or defaults give it a sensible min-height. Otherwise the instance can collapse to 0.
- **Duplicate param names**: `component foo(name, name)` is a parse error.
- **Forgetting the empty label**: instance lines always have `""` in the label slot, even when params drive the content: `element my-card 0 0 200 60 "" title="X"`. Omitting it causes the parser to read `title="X"` as the label.

## Authoring components in the editor

The DSL is one way in; `<boceto-edit>` plus the `<boceto-components>` panel is the other. The panel is the source of truth for "what components exist" — a definition with zero instances stays visible there even though it's invisible on the canvas.

### The Components panel

Mount alongside the palette and inspector:

```html
<boceto-edit id="ed" code="…"></boceto-edit>
<boceto-palette for="ed"></boceto-palette>
<boceto-inspector for="ed" auto></boceto-inspector>
<boceto-components for="ed" open></boceto-components>
```

The panel lists every component in scope, grouped by **Local** (defined in this editor's source — fully editable) and **Available elsewhere** (visible via `imports` — read-only with a "Go to source" affordance). Each row shows the param signature, an instance-count badge ("× 3" or "unused"), and per-row actions.

### Three ways to make a component

1. **+ New** in the panel — opens an inline form (name + comma-separated params). On submit, the editor adds the definition and drops into component-edit mode immediately so you can author the body visually.
2. **Promote selection** — select multiple top-level items on the canvas, right-click → **Make component from selection…**. The selection is lifted into a new component definition (with `$param` tokens preserved) and replaced by a single instance call site at the original bounding box. Param names are inferred from `$ident` tokens unless you supply them explicitly.
3. **DSL directly** — type `component foo(a, b) … end` in source as before; the panel picks it up.

### Editing a component body

Double-click any local instance (or hit **Edit** on the panel row). The canvas swaps to render the component's body as a mini-page. A breadcrumb chip at the top reads `Editing: feature-card · Done`. While in this mode:

- Drag / resize / add / delete / label-edit work normally; mutations land on `Component.body`, not on the current page.
- `$param` placeholders stay literal — they don't expand until an instance renders.
- The Components panel refuses to delete the component you're currently editing. Exit first.
- Pressing **Done** (or the chip's ✕) returns to the previous page. The next `change` event reflects the mutated body.

### Instance call-site params

Selecting a `ComponentInstance` opens the Inspector with a **Component** header and a **Parameters** section — one input per declared param, prefilled from the call site. Edits commit via `editor.updateInstanceParams(id, params)` and round-trip as `param="value"` attrs in the source.

### Cross-document UX

When a component comes from elsewhere (a sibling TipTap block, or a `boceto.import`-loaded file):

- The panel shows it under **Available elsewhere** with a hint (e.g. *"block 2"* in TipTap, or the host's chosen text).
- The Inspector shows the param signature read-only with a **Go to source** button.
- Double-clicking the instance — or any of the navigation buttons — dispatches a `gotodefinition` event on `<boceto-edit>` with `{ componentName, origin, hint }`. The TipTap integration handles this by focusing the sibling block that defines the component; in a docs-app you'd handle it by navigating to the source file.

### Programmatic API

Every gesture above is a method on `BocetoEditor` (accessible via `<boceto-edit>.editor`):

```ts
ed.components()                          // ComponentSummary[] (local + imported, with origin + counts)
ed.instances(name?)                      // ComponentInstance[] on the current page
ed.tagImportOrigin(name, hint)           // host annotation for the panel
ed.createComponent({ name, params })
ed.deleteComponent(name, { deleteInstances: true })
ed.renameComponent(oldName, newName)     // updates def + every instance
ed.updateComponentDef(name, { params, shell, defaults })
ed.updateInstanceParams(instanceId, params)
ed.addInstance(name, x, y, { w, h })
ed.promoteToComponent({ ids, name, params? })
ed.enterComponentEditMode(name)
ed.exitComponentEditMode()
ed.editingComponent                      // null in page mode
```

## Cross-document libraries

Big docs spread their components across multiple files: one library file (or several) holds the shared `component … end` definitions; wireframe pages reference them by name. Boceto ships first-class support for this — same-file sharing is automatic, cross-file sharing is opt-in via YAML frontmatter.

### Sibling fences in the same file

Every ```boceto fence in one markdown file shares a component registry. Block N can use a component defined in block 1 without any extra syntax:

````
```boceto:Defs
component feature-card(title, body)
  element card 0 0 240 140 ""
  element heading 12 12 216 28 "$title"
  element label 12 50 216 60 "$body"
end
```

…some prose between fences…

```boceto:Page
element feature-card 0 0 240 140 "" title="Fast" body="Sub-frame renders"
```
````

This mirrors `@boceto/tiptap`'s editor-level multi-block context. No setup needed.

### Importing components from other files

Declare libraries in YAML frontmatter:

```yaml
---
title: Courses page
boceto:
  import:
    - ./00-component-library.md
    - ./shared/*-component.md
    - ../platform/components/*.boceto
---
```

- `boceto.import` is a string or array of strings.
- Entries resolve relative to the importing file's directory.
- Patterns containing `*`, `?`, `[`, `{` are expanded as globs.
- Paths must stay inside a configurable project root (default: importer's directory) — escapes throw `BocetoImportError`.
- Library files may themselves declare `boceto.import` — transitive resolution is recursive, cycles are silently broken (the registry is flat).
- Duplicate component names across imports are a parse error with both source paths in the message. The importing file's own definitions still win over imports of the same name.

Standalone `.boceto` files support the same frontmatter when the file starts with `---`.

### Plumbing in remark / markdown-it

**remark** — `@boceto/remark` resolves frontmatter imports automatically when given a `VFile` with a `path`. Same-file fence sharing is always on.

```ts
import remarkBoceto from '@boceto/remark'
import { LibraryCache } from '@boceto/core'

const cache = new LibraryCache()
const file = await unified()
  .use(remarkParse)
  .use(remarkBoceto, { mode: 'svg', resolveImports: { cache } })
  .use(remarkHtml)
  .process({ path: '/site/pages/courses.md', value: source })

// Subscribe to file.data.bocetoImports for watch-mode HMR.
```

**markdown-it** — the render pipeline is synchronous, so resolve imports first:

```ts
import md from 'markdown-it'
import bocetoIt, { prewarmBocetoCache } from '@boceto/markdown-it'
import { LibraryCache, initYoga } from '@boceto/core'
import { glob } from 'tinyglobby'
import { readFile } from 'node:fs/promises'

await initYoga()
const cache = new LibraryCache()

const { importedComponents, importedPaths } = await prewarmBocetoCache({
  filePath: '/site/pages/courses.md',
  source,
  fs: { readFile: async (p) => new Uint8Array(await readFile(p)) },
  glob,
  cache,
  projectRoot: '/site',
})

const html = md().use(bocetoIt, { mode: 'svg' })
  .render(source, { bocetoImportedComponents: importedComponents })
```

### Performance / caching contract

- `LibraryCache` parses each library file exactly once and is keyed by absolute path. Two pages importing the same `./components.md` trigger one read, one parse.
- Each cache entry also tracks its transitive dependencies on `entry.paths`, so watch mode can drop dependent entries with `cache.invalidateDependents(changedPath)`.
- The cache survives across multiple `process()` / `render()` calls — share one instance for the whole build, or per request.

### Error UX

- Unknown component reference → `BocetoParseError: Unknown component "feature-card"`. If the page declares `boceto.import` but the component is missing from every library, fix the library or add it to the import list.
- Glob misses → silently zero matches (matches common "wildcards may legitimately match nothing" semantics). To detect, inspect `importedPaths`.
- Duplicate definitions across imports → `BocetoImportError: Component "Button" is defined in multiple boceto imports: /…/a.md and /…/b.md`. Rename one or scope which libraries the page imports.
- Import path escapes project root → `BocetoImportError: Import path escapes projectRoot`. Either move the file inside the root or widen the `projectRoot` constraint.

## Tip: round-trip composition

`<boceto-edit>` treats composite instances as a single draggable / resizable unit, with their body re-laid-out automatically. If the user moves an instance, the surrounding components (and the contents of any flex containers) reflow. This is why `auto` sizing + flex shells are the most-future-proof way to author reusable components.
