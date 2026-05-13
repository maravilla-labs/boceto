# Boceto DSL — Specification (v0.1)

> Status: **draft**, frozen for v0.1 implementation
> Last updated: 2026-05-13

Boceto is a tiny line-oriented DSL for hand-drawn wireframes. It is designed to live inside fenced code blocks
in a markdown document, the same way Mermaid lives in ` ```mermaid ` blocks. A renderer (web component,
markdown plugin, or library) parses a Boceto document and draws it onto a canvas or SVG.

This document specifies the v0.1 grammar exhaustively. Anything not described here is **not** part of v0.1
and may be redefined in later versions.

---

## 1. Conformance

A Boceto v0.1 implementation **MUST**:

- Recognize fenced code blocks whose info string starts with `boceto`.
- Implement the seven statement keywords defined in §4: `element`, `text`, `arrow`, `row`, `col`, `end`,
  `component`.
- Implement all element types listed in §5.
- Accept the `TYPE#ID` shorthand defined in §4.5.
- Resolve composite component references defined in §4.7.
- Round-trip parse → serialize → parse without semantic loss for any document built only from constructs in
  this spec. (Layout primitives in §4.6 are parser sugar and do not round-trip — see that section.)

A Boceto v0.1 implementation **MAY**:

- Add private element types or extra `key=value` attributes; these MUST be preserved by the serializer (passed
  through unchanged) and MUST NOT cause a parse error.
- Provide additional rendering backends beyond canvas (e.g. SVG, WebGL).

A Boceto v0.1 implementation **MUST NOT**:

- Recognize statement keywords other than the seven defined here.

---

## 2. File embedding

Boceto content lives inside markdown fenced code blocks:

````markdown
```boceto
<statements>
```
````

The info string MAY include an optional **page name** after a colon:

````markdown
```boceto:Login Screen
<statements>
```
````

When a markdown document contains multiple `boceto` blocks, each block is treated as a separate **page** of
the same Boceto document, in source order. Pages without an explicit name are auto-named `Page 1`, `Page 2`, …
based on their position.

A standalone Boceto file (`.boceto` extension, recommended MIME `text/boceto`) consists of one or more pages
separated by a line containing only `---` (three hyphens). The optional page name follows on the same line:

```boceto
--- Login
element navbar 60 40 340 44 "MyApp"
…
--- Dashboard
element navbar 0 0 460 44 "MyApp Dashboard"
…
```

A standalone file with no `---` separator is treated as a single unnamed page.

---

## 3. Lexical structure

Boceto is **line-oriented**. Each statement occupies exactly one line.

### 3.1 Comments and blank lines

- A line whose first non-whitespace character is `#` is a **comment** and is ignored.
- A blank line (empty or whitespace only) is ignored.

### 3.2 Tokens

A line is split into **tokens** by whitespace, with the following exceptions:

- A token enclosed in double quotes (`"..."`) preserves its internal whitespace.
- Inside a quoted token, `\"` represents a literal double quote and `\\` represents a literal backslash. No
  other escape sequences are defined in v0.1.
- Quotes MAY contain any printable Unicode character.
- A bare token MAY contain a quoted segment, in which case the segment's contents are absorbed into the
  surrounding token. This is the form used for attribute values that contain whitespace:

  ```
  items="Item one|Item two"          # one token: items=Item one|Item two
  data-q="he said \"hi\""            # one token: data-q=he said "hi"
  ```

  The token's `quoted` flag is **only** set for *pure* quoted strings (a token that starts and ends with
  quotes). A mixed token like `key="value"` is not a quoted token — it's a key/value attribute whose value
  was quoted to permit whitespace.

### 3.3 Numbers

Numeric tokens are **non-negative integers** in decimal notation. The valid range is `0` through `1_000_000`
(one million). Coordinates outside the canvas remain valid syntax (the renderer simply clips them).

### 3.4 Identifiers

Identifiers are sequences of `[A-Za-z0-9_-]` and MUST start with a letter. Used for:

- Element types (§5)
- Element IDs (auto-generated, supplied via `TYPE#ID` shorthand in §4.5, or via `id=` attribute)
- Attribute keys (§4.4)

The `#` character is reserved as a separator inside the type token (see §4.5). It does not appear inside any
identifier.

---

## 4. Statements

v0.1 defines exactly three statement keywords. Each is described as a token sequence; brackets denote
optional tokens.

### 4.1 `element`

Defines a positioned element on the page.

```
element  TYPE[#ID]   X Y W H   "label"   ["note"]   [KEY=VALUE ...]
```

| Token        | Description                                                                        |
| ------------ | ---------------------------------------------------------------------------------- |
| `element`    | The literal keyword.                                                                |
| `TYPE`       | One of the element types listed in §5.                                              |
| `#ID`        | Optional named element ID (see §4.5). When omitted, an ID is auto-generated.        |
| `X Y`        | Top-left corner, in canvas pixels.                                                  |
| `W H`        | Width and height, in canvas pixels. Both MUST be ≥ 1.                               |
| `"label"`    | Display label. MAY be the empty string `""`.                                        |
| `"note"`     | Optional sticky-note annotation. Defaults to empty.                                 |
| `KEY=VALUE`  | Zero or more type-specific attributes. See §4.4.                                    |

**Examples**

```boceto
element button 100 200 120 36 "Sign In"
element button#submit 100 200 120 36 "Sign In"
element table  20 60 300 200 "Users" "" rows=5 cols=4
element input  100 100 240 32 "Email address" "validate format"
```

### 4.2 `text`

Shorthand for an unframed text label.

```
text  X Y  "text"  [KEY=VALUE ...]
```

`text` is semantically equivalent to `element label X Y W H "text"` with `W` and `H` derived from text
metrics by the renderer. Implementations MAY also accept explicit dimensions via `w=` and `h=` attributes.

**Example**

```boceto
text 40 40 "Hello, world"
text 40 80 "Big heading" fontSize=28
```

### 4.3 `arrow`

Connects two elements.

```
arrow  FROM_ID  TO_ID  ["label"]
```

`FROM_ID` and `TO_ID` MUST refer to element IDs that exist on the same page. Element IDs are either
auto-generated (e.g. `p0e1`) or supplied via the `id=` attribute on an `element` statement.

**Example**

```boceto
element button 100 100 120 36 "Save"   id=save
element box    100 200 240 80  "Confirmation" id=confirm
arrow save confirm "opens"
```

### 4.4 Attributes (`key=value`)

Common attributes (any element type):

| Key          | Value type | Meaning                                                       |
| ------------ | ---------- | ------------------------------------------------------------- |
| `id`         | identifier | Stable element ID. If omitted, an auto ID is generated.       |
| `fontSize`   | integer    | Override default font size (px).                              |

Type-specific attributes:

| Key          | Applies to            | Value type | Default |
| ------------ | --------------------- | ---------- | ------- |
| `rows`       | `table`               | integer    | `4`     |
| `cols`       | `table`               | integer    | `3`     |
| `progress`   | `progress`            | 0–100      | `60`    |
| `items`      | `list`                | `\|`-separated string list | (auto) |
| `tabNames`   | `tabs`                | `\|`-separated string list | (auto) |
| `badgeColor` | `badge`               | CSS color  | `#e94560` |
| `alertColor` | `alert`               | CSS color  | `#4a90d9` |

Attribute values are interpreted as integers if the entire string parses as one, otherwise as strings. To
force a string that looks numeric, quote the whole `key="123"` value.

Attribute values that contain whitespace, `"`, or `\` MUST be supplied in quoted form
(`items="Item one|Item two"`). The serializer emits the same quoted form on output and bare values
otherwise — round-trip is lossless either way.

Implementations MUST preserve unknown attributes during round-trip.

### 4.5 Named element IDs

An element ID can be supplied two ways — pick whichever reads better in context:

**1. Shorthand inside the type token** (good for short, inline cases):

```boceto
element button#submit 100 200 120 36 "Sign In"
```

**2. As an `id=` attribute** (good when the line already has other attributes):

```boceto
element table 20 60 300 200 "Users" "" id=user-table rows=5 cols=4
```

`ID` MUST match the identifier rule in §3.4 (`[A-Za-z][A-Za-z0-9_-]*`) in either form.

If both forms are used on the same `element` line and the IDs **differ**, this is a parse error. If they
match, that's accepted but redundant.

When `#ID` is omitted (and no `id=` attribute is supplied), the parser auto-generates an opaque ID of the
form `p<page>e<n>` for the element. Auto-IDs are stable within a parse but should not be referenced from
`arrow` statements — use a named ID for that.

**Canonical output:** the serializer always emits the `TYPE#ID` shorthand for user-supplied IDs. `id=` is
never produced as output. This keeps round-tripped documents diff-friendly regardless of which input form
was used.

### 4.6 Layout primitives (`row`, `col`, `end`)

`row` and `col` are **parse-time layout sugar**. They wrap a sequence of `element`/`text` statements and
compute child positions, so authors don't have to math out coordinates by hand.

```
row  X Y W H  [gap=N align=start|middle|end]
  <statements>
end

col  X Y W H  [gap=N align=start|middle|end|stretch]
  <statements>
end
```

`row` places its children **left-to-right** inside the bounding box `(X, Y, W, H)`. Each child's `x` is
overwritten by the layout engine; `y` is computed from `align`:

- `align=start` — children flush to the top edge (default for `col` is `start`).
- `align=middle` — children vertically centered (default for `row` is `middle`).
- `align=end` — children flush to the bottom edge.

`col` places its children **top-to-bottom**. `align` controls horizontal placement, with the additional
value `align=stretch` overriding child width to match the container's width.

The `gap` attribute (default `0`) is the spacing between consecutive children.

Within a `row`/`col` block, child `element`/`text` statements still take all their positional tokens
(`X Y W H`) — these are **required by the line-oriented grammar** but the X/Y are ignored. By convention
write them as `0 0`. Width and height are preserved (except as noted for `align=stretch`).

`row` and `col` blocks MAY nest. When nested, the inner block's placed children flow into the parent's
children list (one element per item, not grouped) and the parent layout arranges each individually. This
keeps semantics consistent and easy to reason about.

`end` closes the most recent open `row` or `col`. Missing `end` is a parse error pointing at the unclosed
block. An `end` with no matching open block is also a parse error.

**Round-trip:** `row`/`col`/`end` are sugar — they don't survive serialization. After parse + serialize,
the document contains only flat `element`/`text` lines with the computed coordinates. v0.3 may add a
tree-preserving variant for round-trip use cases (e.g. GUI editors).

**Example:**

```boceto
row 100 50 600 60 gap=10 align=middle
  element button 0 0 100 36 "Save"
  element button 0 0 100 36 "Cancel"
  element button 0 0 100 36 "Reset"
end
```

Produces three buttons placed at `x ∈ {100, 210, 320}`, vertically centered in the 60px-tall row.

### 4.7 Composite components (`component`, `end`)

Composites let authors define a reusable widget once and reference it many times — like a function whose
parameters fill in labels and attribute values.

**Definition:**
```
component NAME[(param1, param2, ...)]
  <element / text / arrow / row / col statements>
end
```

- `NAME` matches the identifier rule in §3.4 and **MUST NOT** collide with a built-in element type from §5.
- `(param1, param2, ...)` declares the parameter names accepted at the call site. The parens are optional
  if there are no parameters.
- The body contains the same statements as a page body, with one exception: `component` definitions
  cannot be nested inside another `component`.
- `end` closes the definition.

**Reference:** A composite is referenced from any page using the `element` keyword, with the component
name in place of a built-in type:

```
element NAME[#instanceId] X Y W H "" param1=value1 param2="value with spaces"
```

The label slot must be present (grammar parity with regular `element`) but is ignored — composites
typically pass the label down through `$param`. The optional `#instanceId` is the standard `TYPE#ID`
shorthand from §4.5; if omitted, the parser auto-generates an opaque id of the form `p<page>c<n>`.

**Parameter substitution.** Inside the component body, `$name` and `${name}` placeholders in any string
position (label, note, string-typed attribute value) are replaced with the caller's value. Unknown
parameters substitute to the empty string (forgiving — eases refactors). Numeric coordinates do **not**
support substitution in v0.1 (no expression syntax).

**Coordinate convention.** Body element coordinates are interpreted as **relative to the component's
origin**. At reference expansion, every body element is translated by `(instance.x, instance.y)`. The
caller's `W`/`H` are recorded but are not currently used to scale the component (children render at the
sizes baked into the body).

**Scope.** All component definitions in a document are visible from all pages, regardless of the order
of `boceto` blocks. A page may reference a component defined in a later block.

**Restrictions in v0.1:**

- `component` definitions cannot be nested.
- Composite references cannot appear inside a `row` or `col` block.
- Body coordinates are absolute (no `_w`/`_h` placeholders, no arithmetic). Components are fixed-size
  widgets — design them at the size you want them displayed.

**Round-trip.** Component definitions are emitted in a leading definitions-only `boceto` block. References
serialize as `element <componentName>[#id] X Y W H "" key=value ...` lines — *not* as their expanded
children. This preserves the abstraction across edit cycles.

**Example:**

````markdown
```boceto
component user-card(name, role)
  element card 0 0 240 80 ""
  element avatar 8 8 40 40 ""
  element heading 56 12 180 24 "$name"
  element label 56 38 180 18 "$role"
end
```

```boceto:Team
element user-card 100  50 240 80 "" name="Jane Doe" role="Admin"
element user-card 100 150 240 80 "" name="John"     role="User"
```
````

---

## 5. Element types

v0.1 defines the following set of element type identifiers (83 total):

**Layout** &nbsp; `box` · `card` · `modal` · `navbar` · `divider` · `sidebar`
**Typography** &nbsp; `heading` · `label` · `breadcrumb` · `quote`
**Form** &nbsp; `input` · `textarea` · `button` · `primary-button` · `select` · `checkbox` · `radio` · `switch` · `slider` · `range-slider` · `search` · `segmented-control` · `combobox` · `date-picker` · `color-picker` · `file-upload` · `rating` · `otp-input` · `tag-input` · `stepper-input`
**Media** &nbsp; `image` · `video` · `avatar`
**Content** &nbsp; `list` · `table` · `tabs` · `badge` · `progress` · `pagination` · `alert` · `chip` · `code-block` · `accordion` · `chat-bubble` · `calendar` · `tree` · `stepper` · `carousel` · `kbd` · `mention` · `ai-suggestion`
**Overlays** &nbsp; `dropdown-menu` · `tooltip` · `toast` · `popover`
**Feedback** &nbsp; `spinner` · `skeleton` · `status-dot` · `notification-bell` · `presence-cursor`
**Data viz** &nbsp; `chart-bar` · `chart-line` · `chart-donut` · `chart-area` · `chart-sparkline` · `gantt` · `heatmap` · `map` · `code-diff`
**Mobile chrome** &nbsp; `phone-frame` · `status-bar` · `home-indicator` · `fab` · `app-icon`
**System chrome** &nbsp; `window-frame` · `browser-frame` · `terminal`
**AR / spatial** &nbsp; `glass-window` · `gaze-cursor` · `pinch-indicator` · `volumetric-scene` · `passthrough-frame` · `voice-input`

The visual rendering of each type is implementation-defined but should follow the hand-drawn aesthetic
described in `@boceto/core`'s default `CanvasRenderer`. Implementations MAY provide alternate themes.

### 5.1 Element-specific attributes

In addition to the common `id` and `fontSize` attributes (§4.4), several element types accept
content-shaping attributes:

| Element              | Attribute                       | Meaning                                                                |
| -------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `navbar`             | `items="A\|B\|C"`               | Right-aligned menu items. Default: `Home\|About\|Contact`.             |
| `tabs`               | `tabNames="A\|B\|C"`            | Tab labels. Default: `Tab 1\|Tab 2\|Tab 3`.                            |
| `tabs`               | `active=N`                      | 0-based index of the highlighted tab. Default: `0`. Clamped to range.  |
| `list`               | `items="A\|B\|C"`               | Bullet list items. Default: `Item one\|Item two\|...`.                 |
| `table`              | `headers="A\|B\|C"`             | Column titles. Default: `Col 1\|Col 2\|...`.                           |
| `table`              | `data="r1c1\|r1c2;..."`         | Cell content; `;` separates rows, `\|` separates cells.                |
| `table`              | `rows=N`, `cols=N`              | Force grid size. Default: derived from `data` (or `4 × 3` if no data). |
| `pagination`         | `current=N`, `total=N`          | Active page and total page count. Defaults: `current=2`, `total=10`.   |
| `progress`           | `progress=N`                    | Percentage 0–100. Default: `60`.                                       |
| `badge`              | `badgeColor=#hex`               | Background color. Default: `#e94560`.                                  |
| `alert`              | `alertColor=#hex`               | Border + tinted background color. Default: `#4a90d9`.                  |
| `switch`             | `on=true\|false`                | Toggle state. Default: `false`.                                        |
| `slider`             | `value=N`, `min=N`, `max=N`     | Thumb position. Defaults: `min=0`, `max=100`, `value=midpoint`.        |
| `search`             | `value="..."`                   | Current search text. Default: empty (shows placeholder).               |
| `chip`               | `closable=true\|false`, `chipColor=#hex` | Show close `×`; background color.                          |
| `segmented-control`  | `items="A\|B\|C"`, `active=N`   | Segments and 0-based active index. Default items: `Day\|Week\|Month`.  |
| `sidebar`            | `items=`, `active=N`, `collapsed=true\|false` | Nav rows; active highlight; icon-only mode.              |
| `dropdown-menu`      | `items="A\|B\|---\|D"`          | Menu rows; `---` is a separator. Items containing `delete` render red. |
| `tooltip`            | `arrow=top\|bottom\|left\|right` | Direction the tail points. Default: `top`.                            |
| `toast`              | `variant=info\|success\|warn\|error` | Accent-color variant. Default: `info`.                            |
| `skeleton`           | `lines=N`                       | Number of placeholder lines. Default: `3`.                             |
| `code-block`         | `lang="..."`                    | Optional language label in the corner.                                 |
| `accordion`          | `expanded=true\|false`          | Show body content; chevron rotates accordingly.                        |
| `chat-bubble`        | `side=left\|right`, `bubbleColor=#hex`, `textColor=#hex` | Bubble alignment + colors.                       |
| `chart-bar`/`chart-line` | `data="3,5,2,7,4"`          | Comma-separated series; values normalized to chart height.             |
| `chart-donut`        | `data="40,30,20,10"`            | Comma-separated segments; normalized to a full circle.                 |
| `calendar`           | `month=N`, `year=N`, `selected=N` | Month (1–12), year, highlighted day-of-month.                        |
| `phone-frame`        | `model=iphone\|android\|generic` | Notch/island styling. Default: `iphone`.                              |
| `app-icon`           | `bg=#hex`, `glyph="A"`, `badge=N` | Background, center glyph, optional red badge with count.             |

Pipe-list and semicolon-list values containing whitespace use the quoted-attribute form (§4.4):
`items="Item one|Item two"`.

---

## 6. Document model

The parser produces a `BocetoDoc`:

```ts
type BocetoDoc = {
  pages: Page[]
  components: Component[]   // composite definitions (§4.7); empty if none
}

type Page = {
  id: string                // stable, derived from name + position
  name: string
  elements: PageItem[]      // discriminated union — see below
  arrows: Arrow[]
}

type PageItem = Element | ComponentInstance

type Element = {
  id: string
  type: ElementType
  x: number; y: number; w: number; h: number
  label: string
  note?: string
  attrs: Record<string, string | number>
}

type Arrow = {
  id: string
  from: string              // element id
  to: string                // element id
  label?: string
}

type Component = {
  name: string              // identifier, must not collide with built-in types
  params: string[]          // parameter names
  body: (Element | Arrow)[] // template — coords are component-relative,
                            // labels/attrs may contain $name placeholders
}

type ComponentInstance = {
  kind: 'component-instance'
  id: string                // call-site id
  componentName: string
  x: number; y: number; w: number; h: number
  params: Record<string, string>
  expanded: Element[]       // pre-substituted, absolute-coord children;
                            // renderers iterate this directly
}
```

`Element` and `ComponentInstance` are discriminated by the presence of `kind: 'component-instance'`.
`Element` has no `kind` field. The `expanded` array on `ComponentInstance` lets renderers walk a flat
list of `Element`s without needing to look up the component definition.

The serializer is the inverse: `serialize(parse(s)) === s` (modulo insignificant whitespace) for any
syntactically valid document **that uses only constructs that round-trip**. Layout primitives (§4.6) are
the only intentional exception: they expand at parse time and the serializer emits the resulting flat
elements — the original `row`/`col`/`end` framing is lost.

`Page.elements` is always a flat array. Layout primitives do not introduce a tree structure into the
document model.

---

## 7. Full example

````markdown
```boceto:Login
element navbar       60  40 340 44 "MyApp"
element heading     130 110 200 28 "Welcome back"
element label       130 150 200 24 "Sign in to continue"
element input       100 190 260 36 "Email address"
element input       100 236 260 36 "Password"
element primary-button 100 284 260 36 "Sign In"
element button      100 334 126 30 "Forgot password?"
element button      236 334 124 30 "Register"
```

```boceto:Dashboard
element navbar     0   0 460 44 "MyApp Dashboard"
element card      20  60 200 100 "Users"
element card     240  60 200 100 "Revenue"
element box       20 180 420 180 "Recent Activity"
element progress  20 280 420  16 "" progress=72
```
````

---

## 8. Versioning

This is **Boceto v0.1**. Future versions will be additive where possible; any breaking change will bump
the minor version (the `0.x`) and be documented in `spec/CHANGELOG.md`.

Reserved (not yet specified, do not use):

- `theme`, `style` — appearance directives
- `import`, `include` — composition
- Any keyword starting with `@` — directives

---

## 9. MIME type and file extension

- File extension: `.boceto`
- Suggested MIME type: `text/boceto`
- Markdown info string: `boceto` (optionally `boceto:Page Name`)
