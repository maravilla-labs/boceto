# Boceto grammar reference

Load this file when you hit a parse ambiguity — quoted strings, IDs, attribute syntax, multi-page docs, line comments. For element-specific attributes, see `elements.md`. For flex / `row` / `col`, see `layout.md`.

## File embedding

Boceto source lives in one of three forms — all parse to the same `BocetoDoc`.

**1. Markdown fenced blocks** (most common):

````
```boceto
element box 0 0 100 50 "Hi"
```

```boceto:Login
element navbar 0 0 600 44 "MyApp"
```
````

- Block info `​boceto` or `boceto:PageName` is recognised. The colon-suffixed form sets the page name.
- Multiple blocks in the same markdown file become multiple pages in one doc.
- Component definitions in one block are visible to every later block.

**Per-fence render hints (SVG output).** The remark / markdown-it plugins also recognise `key=value` tokens in the fence info — these set the viewport for that one block when it renders to SVG, *without* changing the parsed doc. Use them when a mockup intentionally targets a non-default canvas (e.g. a 1280×800 desktop dashboard or a 320×640 mobile screen):

````
```boceto:Mobile width=320 height=640
element phone-frame 0 0 320 640 ""
…
```

```boceto:Showcase fit=fixed width=1280 height=800
…
```
````

Recognised keys: `fit` (`content` | `fixed`), `width`, `height`, `padding` (non-negative numbers). Default is `fit=content` (auto-size with 16px padding; `width`/`height` if given act as a *minimum* floor). Unknown keys or invalid values silently fall through to the page name — safe to add hints next to existing names. See `spec/boceto-spec.md` §2 for full semantics.

**2. Standalone .boceto file**:

```
--- Login
element navbar 0 0 600 44 "MyApp"

--- Dashboard
element navbar 0 0 900 44 "Dash"
```

- Each `--- Name` starts a new page. The first page may omit the `---` line.

**3. Raw single-block** (no fence, no `---`):

```
element navbar 0 0 600 44 "MyApp"
element heading 100 90 400 32 "Welcome"
```

- Parsed when there's no `​```` and no `---`. Used by `<boceto-view>` / `<boceto-edit>` when the `code` attribute carries inline DSL.

## Statements

Each non-blank, non-comment line is one statement. Indentation does not matter outside `row` / `col` / `component` blocks (where it's conventional but not required).

| Statement | Shape |
|---|---|
| `element` | `element TYPE[#id] X Y W H "Label" [attr=value]…` |
| `text` | `text X Y "string"` — a floating text label, no chrome |
| `arrow` | `arrow FROM_ID TO_ID ["label"]` — connector between two named elements |
| `row` | `row[#id] X Y W\|auto H\|auto [flex attrs]` opens a horizontal flex container. Closed by `end`. |
| `col` | Same as `row` but vertical. |
| `component` | `component NAME(param1, param2) [shell attrs] [defaults]` opens a definition. Closed by `end`. |
| `slot` | Inside a component body: `slot` (default slot) or `slot NAME` (named). Inside a call site: `slot NAME` opens a named-slot fill. |
| `end` | Closes the nearest open `row` / `col` / `component` / `slot` / element-as-container block. |

A trailing `:` after `element`, `row`, `col`, or a composite call-site opens a children block — see "Element-as-container" below.

## Tokens

A line is split on whitespace, with these refinements:

- **Quoted strings** (`"..."`) preserve internal whitespace.
- **Escape sequences** inside `"..."`:
  - `\"` → literal `"`
  - `\\` → literal `\`
  - `\n` → newline (real LF — used for `textarea`, `alert`, `chat-bubble` bodies)
  - `\t` → tab
  - Any other `\x` is preserved verbatim — `C:\foo` inside a path attr is fine.
- **Mixed tokens** can absorb a quoted segment: `data-q="he said \"hi\""` becomes one attribute token whose value is `he said "hi"`.

The `quoted` flag is only set when a token is purely a quoted string — `key="value"` is a key/value pair, not a quoted token.

## Numbers

Positional slots (`X`, `Y`, `W`, `H`) require **non-negative integers**, in the range `0`–`1_000_000`. Negative numbers, fractions, `1e3`, hex (`0xFF`), and underscores are all rejected. `auto` is accepted in `W` / `H` slots on `row` / `col` and composite call-sites.

Attributes can hold either integers or strings. The serializer chooses the most compact form on output, but the parser accepts either as long as the element supports the attr.

## Identifiers

IDs match `[A-Za-z][A-Za-z0-9_-]*`. Used for:

- **Named elements** — written as `type#id` (shorthand) or `id=name` (attribute form). Both round-trip; the shorthand is preferred for diff readability.
- **Arrow endpoints** — both `from` and `to` must be IDs of existing elements (or named flex / composite items).
- **Auto-generated** — when no id is supplied, the parser mints `p<pageIdx>e<elemIdx>` for elements, `p<pageIdx>f<flexIdx>` for flex containers, `p<pageIdx>c<instIdx>` for component instances. Inside an expanded composite, child IDs are namespaced `<instanceId>.<bodyId>`.

Two equivalent forms — pick whichever reads better in context:

```
element button#save 0 0 100 30 "Save"
element button      0 0 100 30 "Save" id=save
```

## Attributes (`key=value`)

Trailing `key=value` pairs after the positional slots. Unknown attributes are preserved verbatim and passed to the renderer; many element types use them to drive rendering details (a `badge` looks at `badgeColor`, a `chip` looks at `closable`, etc. — see `elements.md`).

Common patterns:

```
items="One|Two|Three"          # pipe-list — sidebar/navbar/list/dropdown items
data="3,5,2,7,4"               # comma-list — chart data
shadow=true                    # boolean true
shadow=8                       # numeric override
border="#fa0"                  # hex color string
fontSize=22                    # numeric
overflow=wrap                  # enum
```

Attribute names are case-sensitive (`fontSize`, not `fontsize`). Hyphens are allowed (`min-w`, `align-self`).

## Comments and blank lines

Lines that begin with `#` (column 0) are comments and ignored. Inline `#` after a token is *not* a comment — it's part of the token (e.g. `button#save`). Blank lines are allowed anywhere and ignored.

```
# This is the login screen
element navbar 0 0 600 44 "MyApp"

# Form fields
element input 100 170 400 36 "Email"
```

## Element-as-container (children block)

Append `:` to any statement to open a children block. Children render inside the container's content rect.

```
element card#login 100 100 400 280 "" :
  element heading 0 0 400 32 "Sign in"
  element input   0 50 400 36 "Email"
  element input   0 96 400 36 "Password"
  element primary-button 0 150 400 36 "Continue"
end
```

Without `direction=...`, child coordinates are relative to the container's content rect (absolute body). Setting `direction=row` or `direction=col` on the parent turns it into a flex container — children's positional X/Y become preferred main-axis sizes; the layout pass computes the final position. See `layout.md`.

`element-as-container` works on any element type — `card`, `modal`, `sidebar`, `phone-frame`, etc. — and lets you compose without using `row` / `col` directly.

## Multi-page docs

A single markdown file or `.boceto` file can hold many pages:

````
```boceto:Login
element navbar 0 0 600 44 "MyApp"
…
```

```boceto:Dashboard
element navbar 0 0 900 44 "Dash"
…
```
````

Each block becomes one `Page` in the doc. Pages share the same component definitions (the parser walks every block looking for `component` statements before parsing any page bodies). `<boceto-view page="Login">` or `<boceto-view page="0">` picks which one to render.

## Common parse errors

The parser is strict so authors catch typos quickly. The errors you'll see most often:

| Error | Cause | Fix |
|---|---|---|
| `'element' label must be a quoted string` | Unquoted multi-word label. | `"Welcome back"` |
| `'X' must be a non-negative integer` | Fractional, negative, or non-numeric coord. | Round and clamp. |
| `Unknown element type 'header'` | Typo or invented type. | `navbar` or `heading`. |
| `Unclosed 'row' at line N` | Missing `end`. | Add `end`. |
| `Component name "card" collides with built-in element type` | A `component` definition reused a built-in name. | Use a different name (`my-card`). |
| `arrow 'foo' references unknown id` | Endpoint isn't a named element. | Add `#foo` to the target's type token. |

When you author DSL, mentally run through these — they're the high-frequency failure modes.

## Round-trip behavior

`parse → serialize → parse` is **lossless** for every legal input. The editor (`<boceto-edit>`) leans on this for undo / redo and for committing changes back to the `code` attribute on every drag release. If you mutate a doc programmatically (e.g. via `BocetoEditor.move`), the next `serialize` produces clean, deterministic output.

This matters for AI authoring too: if you generate a block and the user edits it in the playground, the round-tripped version will look subtly different (deterministic attribute order, integer coordinates, normalized quoting). That's not a bug — the playground is producing the canonical form.
