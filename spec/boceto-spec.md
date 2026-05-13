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
- Implement the statement keywords defined in §4: `element`, `text`, `arrow`, `row`, `col`, `end`,
  `component`, `slot`.
- Implement all element types listed in §5.
- Accept the `TYPE#ID` shorthand defined in §4.5.
- Resolve composite component references defined in §4.7.
- Resolve `FlexContainer` layout via a flexbox-compatible engine (Yoga); see §4.6.
- Round-trip parse → serialize → parse without semantic loss for any document built only from constructs in
  this spec.

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
- Inside a quoted token, the following escape sequences are recognised:
  - `\"` — literal double quote.
  - `\\` — literal backslash.
  - `\n` — newline (used for multi-line labels in elements like `textarea`, `alert`, `chat-bubble`).
  - `\t` — horizontal tab.

  Any other backslash sequence inside a quoted token is preserved verbatim.
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
| `W H`        | Width and height, in canvas pixels. `0` or the literal `auto` mean "no preferred size" (the layout pass decides). |
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

**Block form: an element as a container.** A trailing `:` on the line opens a children block,
closed by `end`. Any element type may use this form — the element's chrome (border, header, etc.)
renders normally, and the children render inside the **content rect**.

```
element  TYPE  X Y  W|auto H|auto  "label"  [container attrs]  [child flex attrs]  [KEY=VALUE …] :
  <children>
end
```

The element accepts the same flex-container attributes as `row` / `col`:

| Attr        | Values                                                            | Default              |
|-------------|-------------------------------------------------------------------|----------------------|
| `direction` | `row` \| `col` — presence enables **flex mode**                   | (absent ⇒ absolute body) |
| `gap`       | non-negative integer (px)                                         | `0`                  |
| `padding`   | non-negative integer (px), all four edges                         | `0`                  |
| `justify`   | `start` \| `middle` \| `end` \| `between` \| `around` \| `evenly` | `start`              |
| `align`     | `start` \| `middle` \| `end` \| `stretch`                          | `middle` (row) / `start` (col) |
| `wrap`      | `nowrap` \| `wrap` \| `wrap-reverse`                              | `nowrap`             |

- **Flex mode** (`direction=` set): children flow according to the flex attrs above.
- **Absolute body** (no `direction=`): children render at their declared local `(x, y)` inside the
  content rect — useful for overlay-style layouts.

**Chrome insets.** Element types that draw header chrome get an intrinsic content inset added to
the author's `padding` so children land below the chrome by default:

| Type            | Intrinsic content inset      |
|-----------------|------------------------------|
| `card`          | top: 36                      |
| `modal`         | top: 40                      |
| `window-frame`  | top: 32                      |
| `browser-frame` | top: 70                      |
| `phone-frame`   | 12px on all sides            |

Other element types contribute zero intrinsic inset; the content rect equals the bounding box
minus the author's `padding`.

**Generic decoration attrs** (orthogonal to block-form children; valid on any element):

| Attr     | Values                                                  | Effect                                       |
|----------|---------------------------------------------------------|----------------------------------------------|
| `border` | `true` \| `N` (px width) \| `#color` (CSS color) \| `false` (default) | Outer stroke around the element's bounding box, drawn after the chrome. |
| `shadow` | `true` \| `N` (blur radius px) \| `false` (default)     | Drop shadow under the element's chrome.       |

**Examples**

```boceto
# Box as a flex container
element box 0 0 400 auto "" direction=col padding=12 gap=8 :
  element heading 0 0 0 24 "Heading"
  element label   0 0 0 18 "Body"
end

# Modal that owns its body — chrome inset pushes content below the title bar
element modal 100 60 400 auto "Confirm" direction=col padding=12 gap=12 align=stretch :
  element label 0 0 0 18 "Are you sure?"
  row 0 0 0 36 gap=8 justify=end
    element button         0 0 100 32 "Cancel"
    element primary-button 0 0 100 32 "Confirm"
  end
end

# Absolute body — children at declared local (x, y)
element box 100 100 400 200 "" border=true shadow=8 :
  element label 12 12 0 16 "At local (12, 12)"
  element button 12 40 100 32 "OK"
end
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

### 4.6 Layout containers (`row`, `col`, `end`)

`row` and `col` open a **`FlexContainer`** — a first-class layout container that wraps a sequence of
child statements and resolves their final positions via a flexbox-compatible engine (Yoga). Containers
round-trip through parse → serialize → parse and may be nested freely.

```
row[#ID]  X Y W|auto H|auto  [attrs…]
  <statements>
end

col[#ID]  X Y W|auto H|auto  [attrs…]
  <statements>
end
```

`row` lays its children out along the **main axis = X** (left → right). `col` lays them along the
**main axis = Y** (top → bottom). Both are otherwise identical: the same attributes apply, the same
children are accepted, and the same layout algorithm runs.

**Sizing.** `X` and `Y` are the container's top-left in page space (non-negative integers). `W` and `H`
may be a non-negative integer or the literal `auto` — `auto` lets the engine size the container to its
children along that axis.

**Container attributes** (all optional):

| Attribute  | Type / values                                                | Default                        |
|------------|--------------------------------------------------------------|--------------------------------|
| `gap`      | non-negative integer (px)                                    | `0`                            |
| `padding`  | non-negative integer (px), applied to all four edges          | `0`                            |
| `align`    | `start` \| `middle` \| `end` \| `stretch` (cross axis)        | `middle` for `row`, `start` for `col` |
| `justify`  | `start` \| `middle` \| `end` \| `between` \| `around` \| `evenly` (main axis) | `start`         |
| `wrap`     | `nowrap` \| `wrap` \| `wrap-reverse`                          | `nowrap`                       |
| `min-w` / `min-h` / `max-w` / `max-h` | non-negative integer (px)         | unset                          |

`align` and `justify` follow flexbox semantics. `stretch` (only meaningful as a cross-axis value, i.e.
`align=stretch`) stretches a child whose cross-axis size is unconstrained to fill the container; a child
with an explicit cross-axis size keeps that size.

**Per-child attributes.** Any child of a `FlexContainer` MAY carry these flex props, in addition to its
own `element`/`text` attributes:

| Attribute       | Type / values                                                | Default       |
|-----------------|--------------------------------------------------------------|---------------|
| `grow`          | non-negative number                                          | `0`           |
| `shrink`        | non-negative number                                          | `1`           |
| `basis`         | non-negative integer (px) or `auto`                          | `auto`        |
| `align-self`    | `auto` \| `start` \| `middle` \| `end` \| `stretch`           | `auto`        |
| `min-w` / `min-h` / `max-w` / `max-h` | non-negative integer (px)         | unset         |

A child whose `w` (cross axis for `col`, main axis for `row`) is `0` is treated as having no explicit
size on that axis — `grow`, `basis`, and `align=stretch` then determine the final value.

**Children.** A container's children MAY be any of: `element`, `text`, `arrow`, a composite reference, or
another `row` / `col`. Composites and nested containers are first-class — they survive serialization.

**Closure.** `end` closes the most recent open `row` or `col`. Missing `end` is a parse error pointing at
the unclosed block; an `end` with no matching open block is also a parse error.

**Round-trip.** Containers round-trip. After parse + serialize, the document contains the original
`row`/`col` blocks with their declared attributes preserved; child statements appear in source order
inside the block. Computed coordinates (the result of running the layout engine) are not serialized —
they are recomputed on demand by the host application's render path.

**Example:**

```boceto
row 100 50 600 60 gap=10 align=middle justify=between
  element button 0 0 100 36 "Save"
  element button 0 0 100 36 "Cancel"
  element button 0 0 100 36 "Reset"
end
```

Three buttons distributed across the row with equal space between them, vertically centered in the
60-pixel-tall row.

**Example with dynamic sizing:**

```boceto
row 0 0 auto auto gap=8 padding=12
  element button 0 0 0 36 "Primary" grow=1
  element button 0 0 100 36 "Cancel"
end
```

The row sizes itself to its contents. The "Primary" button grows to fill remaining horizontal space
after the fixed-width "Cancel" button and the gap/padding are accounted for.

### 4.7 Composite components (`component`, `end`)

Composites let authors define a reusable widget once and reference it many times — like a function whose
parameters fill in labels and attribute values.

**Definition:**
```
component NAME[(param1, param2, ...)] [shell-attrs] [size-defaults] [child-flex-defaults]
  <element / text / arrow / row / col / composite statements>
end
```

- `NAME` matches the identifier rule in §3.4 and **MUST NOT** collide with a built-in element type from §5.
- `(param1, param2, ...)` declares the parameter names accepted at the call site. The parens are optional
  if there are no parameters.
- Optional header attrs (see "Component attributes" below) declare the component's flex shell and instance
  defaults.
- The body contains the same statements as a page body: `element`, `text`, `arrow`, `row`, `col`, and
  references to other composites. The only restriction is that `component` definitions themselves cannot
  be nested inside another `component`.
- The body may include `slot` markers (see "Slots" below) that designate where call-site children render.
- `end` closes the definition.

**Component attributes** (all optional, all on the header line, in any order):

| Group | Attribute | Type / values | Default |
|-------|-----------|---------------|---------|
| Shell | `direction` | `row` \| `col` | — (when set, body lays out as flex children) |
| Shell | `gap` | non-negative integer (px) | `0` |
| Shell | `padding` | non-negative integer (px) | `0` |
| Shell | `align` | `start` \| `middle` \| `end` \| `stretch` | `middle` (row) / `start` (col) |
| Shell | `justify` | `start` \| `middle` \| `end` \| `between` \| `around` \| `evenly` | `start` |
| Shell | `wrap` | `nowrap` \| `wrap` \| `wrap-reverse` | `nowrap` |
| Size default | `w` / `h` | non-negative integer (px) or `auto` | unset |
| Size default | `min-w` / `min-h` / `max-w` / `max-h` | non-negative integer (px) | unset |
| Child-flex default | `grow` / `shrink` | non-negative number | unset |
| Child-flex default | `basis` | non-negative integer (px) or `auto` | unset |
| Child-flex default | `align-self` | `auto` \| `start` \| `middle` \| `end` \| `stretch` | unset |

**Shell mode** is opted into by declaring `direction`. When the component has a shell:

- The body is laid out as flex children of an **implicit root** sized to the instance's resolved box.
- Body items use coordinates relative to the component origin `(0, 0)`; their `x`/`y` is overwritten by
  flex layout. `w`/`h` (and child-flex props like `grow=1`) determine the resolved size.
- When the instance is grown / shrunk / wrapped by a parent `row`/`col`, the body re-flows against the new
  size automatically — a `Panel` component with `direction=col` adapts whether it's at a fixed call-site
  size, inside a row with `grow=1`, or in a wrapping grid.

**Without a shell**, body coordinates are absolute (origin = instance top-left) — useful for pixel-precise
widgets where flex resizing would be unhelpful.

**Size defaults and child-flex defaults** apply to every instance whose call site doesn't supply that
attribute. Per-instance attrs win over component defaults.

**Reference:** A composite is referenced from any page using the `element` keyword, with the component
name in place of a built-in type:

```
element NAME[#instanceId] X Y W|auto H|auto "" key=value ...
```

The label slot must be present (grammar parity with regular `element`) but is ignored — composites
typically pass the label down through `$param`. The optional `#instanceId` is the standard `TYPE#ID`
shorthand from §4.5; if omitted, the parser auto-generates an opaque id of the form `p<page>c<n>`.

`W` and `H` may be `auto` to defer to the component's `w`/`h` default; if neither is supplied, the
instance is unsized along that axis and a parent `row`/`col` (or the shell layout) determines the final
value.

`key=value` tokens at the call site fill three different buckets:
1. **Flex-child overrides** for layout (`grow`, `shrink`, `basis`, `align-self`, `min-w`/`min-h`/`max-w`/`max-h`).
2. **Parameters** declared in the component's `(params)` list — substituted into `$name` placeholders.
3. Any other key is treated as a parameter (forgiving — unknown params substitute to the empty string).

Flex-child overrides at the call site win over the component's defaults.

**Slots.** A component body may declare one or more `slot` markers, which designate where call-site
children render:

```
slot          # anonymous default slot
slot NAME     # named slot
```

At the call site, a trailing `:` on the `element NAME ...` line opens a children block (closed by `end`).
Bare children inside that block fill the **anonymous default slot**; `slot NAME ... end` sub-blocks fill
**named slots**:

```
element Card 0 0 300 auto "" title="Hi" :
  element label 0 0 0 16 "anonymous default body"
  slot header
    element label 0 0 0 16 "named: header"
  end
  slot body
    element label 0 0 0 16 "named: body"
  end
end
```

- The component must declare a `slot` (anonymous) for bare children to be accepted, and a `slot NAME`
  for each named slot the call site uses. Otherwise the parser raises an error.
- A given slot name may appear at most once per call site.
- The single-line call form (no `:`) is still valid for components with or without slots — slots default
  to empty when the call site doesn't supply them.
- Built-in element types (`element box`, `element button`, etc.) do **not** accept a children block;
  only composite references do.

**Parameter substitution.** Inside the component body, `$name` and `${name}` placeholders in any string
position (label, note, string-typed attribute value) are replaced with the caller's value. Unknown
parameters substitute to the empty string (forgiving — eases refactors). Numeric coordinates do **not**
support substitution in v0.1 (no expression syntax).

**Coordinate convention.** Body element coordinates are interpreted as **relative to the component's
origin**. For **absolute-body components** (no shell), expansion translates every body element by
`(instance.x, instance.y)` and the body renders at the baked sizes. For **flex-shell components**, body
coordinates are reset by flex layout — the body sizes itself to the instance's resolved box every time.

**Scope and nesting.** All component definitions in a document are visible from all pages, regardless of
source order — a page may reference a component defined in a later block, and a component body may
reference any other component (including ones defined later). Composites may appear anywhere a regular
`element` may: at page top level, inside a `row` / `col` container, or inside another component's body.

When component A's body references component B, B's body is recursively expanded at the call site of A;
the result is a tree of `Element` and `FlexContainer` nodes (no unresolved composite refs survive in the
final document). The parser detects reference cycles (A → B → A) at expansion time and reports the chain.

**Restrictions in v0.1:**

- `component` definitions cannot themselves be nested syntactically inside another `component` block.
  (References between components are unrestricted; only the textual nesting of `component … end` blocks
  is forbidden.)
- Body coordinates are absolute (no `_w`/`_h` placeholders, no arithmetic). Components are fixed-size
  widgets — design them at the size you want them displayed.

**Round-trip.** Component definitions are emitted in a leading definitions-only `boceto` block. References
serialize as `element <componentName>[#id] X Y W H "" key=value ...` lines — *not* as their expanded
children. This preserves the abstraction across edit cycles.

**Example — absolute-body widget:**

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

**Example — responsive flex-shell panel:**

````markdown
```boceto
component Panel(title) direction=col padding=12 gap=8 w=300 h=auto min-w=200 max-w=600
  element heading 0 0 0 24 "$title"
  element box 0 0 0 0 "" grow=1
end
```

```boceto:Dashboard
# Page top-level, explicit size
element Panel 100 100 400 200 "" title="Stats"

# In a row, grow=1 makes Panel fill the remaining slot
row 0 0 800 200 gap=8
  element box 0 0 200 200 ""
  element Panel 0 0 auto auto "" grow=1 title="Main"
end

# Grid via wrap — each Panel packs to its min-w when the row wraps
row 0 0 800 auto gap=12 wrap=wrap
  element Panel 0 0 auto auto "" title="One"
  element Panel 0 0 auto auto "" title="Two"
  element Panel 0 0 auto auto "" title="Three"
end
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

### 5.1 Generic text-rendering attributes

Every text-bearing element honors the following attributes for label layout. Element-specific
defaults are listed in the per-type table that follows.

| Attribute     | Values                                    | Meaning                                                                                  |
| ------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `overflow`    | `ellipsis` \| `wrap` \| `clip` \| `shrink` | What happens when the label is wider than the element. Default: per element type.        |
| `textAlign`   | `left` \| `center` \| `right`              | Horizontal alignment of the label inside its box. Default: per element type.             |
| `fontSize`    | integer (px)                              | Upper bound for the rendered font size.                                                  |
| `minFontSize` | integer (px)                              | Lower bound when `overflow=shrink`. Default: `9`. Ignored for other policies.            |

Notes:
- `overflow=wrap` is multi-line; line count is bounded by the element's height (`floor(h / lineH)`)
  with `…` appended when more text remains. Hard line breaks `\n` (§3.2) are respected before
  word-wrapping each segment.
- `overflow=shrink` keeps a single line and binary-searches a font size in
  `[minFontSize, fontSize]` until the text fits.
- `textAlign` applies to every line in `wrap` mode (each line uses the same anchor).
  It is named `textAlign` (not `align`) to avoid collision with the flex container's
  cross-axis `align` attribute (§4.6), which uses a different value set
  (`start | middle | end | stretch`).

### 5.2 Element-specific attributes

In addition to the common `id`, `fontSize`, `overflow`, `textAlign`, and `minFontSize` attributes
(§4.4 + §5.1), several element types accept content-shaping attributes:

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

type PageItem = Element | ComponentInstance | FlexContainer

type ComputedBox = { x: number; y: number; w: number; h: number }

type FlexChildProps = {
  grow?: number
  shrink?: number
  basis?: number | 'auto'
  alignSelf?: 'auto' | 'start' | 'middle' | 'end' | 'stretch'
  minW?: number; minH?: number; maxW?: number; maxH?: number
}

type Element = FlexChildProps & {
  id: string
  type: ElementType
  x: number; y: number; w: number; h: number
  label: string
  note?: string
  attrs: Record<string, string | number>
  computed?: ComputedBox    // filled by the layout pass when this element
                            // is a child of a FlexContainer
}

type Arrow = {
  id: string
  from: string              // element id
  to: string                // element id
  label?: string
}

type FlexContainer = FlexChildProps & {
  kind: 'flex-container'
  id: string
  direction: 'row' | 'col'   // main-axis direction
  x: number; y: number
  w: number | 'auto'
  h: number | 'auto'
  padding: number
  gap: number
  justify: 'start' | 'middle' | 'end' | 'between' | 'around' | 'evenly'
  align: 'start' | 'middle' | 'end' | 'stretch'
  wrap: 'nowrap' | 'wrap' | 'wrap-reverse'
  children: PageItem[]       // recursive — may hold Elements, composites,
                             // or nested containers
  computed?: ComputedBox     // filled by the layout pass
}

type Component = {
  name: string                                              // must not collide with built-in types
  params: string[]                                          // parameter names
  body: (Element | Arrow | FlexContainer | ComponentInstance)[]
  // template — coords are component-relative, labels/attrs may contain
  // $name placeholders, nested composites are unresolved references
  // (expanded recursively at each call site)
  shell?: {                                                 // present iff `direction` declared
    direction: 'row' | 'col'
    padding: number; gap: number
    justify: 'start' | 'middle' | 'end' | 'between' | 'around' | 'evenly'
    align: 'start' | 'middle' | 'end' | 'stretch'
    wrap: 'nowrap' | 'wrap' | 'wrap-reverse'
  }
  defaults?: {                                              // applied to instances lacking the attr
    w?: number | 'auto'; h?: number | 'auto'
    minW?: number; minH?: number; maxW?: number; maxH?: number
    grow?: number; shrink?: number; basis?: number | 'auto'
    alignSelf?: 'auto' | 'start' | 'middle' | 'end' | 'stretch'
  }
}

type ComponentInstance = FlexChildProps & {
  kind: 'component-instance'
  id: string                  // call-site id
  componentName: string
  x: number; y: number
  w: number | 'auto'          // 'auto' = use component default OR let layout decide
  h: number | 'auto'
  params: Record<string, string>
  expanded: PageItem[]        // recursively expanded children — no nested
                              // ComponentInstance survives; may include
                              // Elements and FlexContainers
  computed?: ComputedBox      // filled by layout pass
}
```

`PageItem` is a three-way discriminated union: `Element` (no `kind` field), `ComponentInstance`
(`kind: 'component-instance'`), and `FlexContainer` (`kind: 'flex-container'`). The layout pass writes a
`computed` box onto every `PageItem` that participates in flex layout; renderers prefer `computed` over
the declared `x/y/w/h` when present.

The serializer is the inverse: `serialize(parse(s)) === s` (modulo insignificant whitespace) for any
syntactically valid document. `row`/`col` blocks round-trip with their declared attributes and children;
composite definitions round-trip in a leading definitions-only block, and composite call sites round-trip
as single `element` lines (not their expanded children).

`Page.elements` is a tree: any item may be a leaf `Element`/`ComponentInstance` or a `FlexContainer`
whose `children` recursively contain more `PageItem`s.

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
