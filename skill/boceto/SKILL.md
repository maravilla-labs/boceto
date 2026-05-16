---
name: boceto
description: Author hand-drawn wireframe mockups in the Boceto DSL — a compact fenced-code-block-friendly grammar that renders to sketchy SVG / canvas. Use this skill whenever the user asks to "sketch a wireframe", "mock up a screen", "show a UI for X", "wireframe Y", design a login / dashboard / mobile / settings / marketing layout, or any mention of @boceto, boceto-view, boceto-edit, .boceto files, or fenced ```boceto blocks. Also use it when the user asks Claude to add to or edit an existing Boceto mockup, even when they only describe the change ("add a search bar at the top"). If the `boceto` MCP server is connected, prefer its tools (`boceto_lint`, `boceto_describe_element`, `boceto_list_recipes`, `boceto_read_recipe`, `boceto_render_svg`) over reading the local references — it's the fastest path to verified output.
---

# Boceto — wireframe mockup DSL

Boceto is a tiny grammar for hand-drawn wireframes. One line per element, integer coordinates, sketchy SVG / canvas output. Designed to live inside fenced markdown code blocks so PRs, docs, and design reviews can carry wireframes as plain text.

## What this skill teaches

This skill is the **authoring philosophy** layer — the rules, do's & don'ts, and the literate output pattern. The data (element catalog, per-element attrs, recipes you can pattern-match against) lives in the `boceto` MCP server when it's connected, or in the bundled references otherwise. Don't memorise the catalog; fetch it on demand.

## Output contract

When asked for a mockup, return a single fenced `​```boceto:PageName` block. Use `​```boceto` (no page name) if it's a snippet rather than a full page. Coords are non-negative integers (pixels). Typical sizes: 600–1100 wide for desktop, 320–420 wide for mobile.

```boceto:Login
element navbar       0   0 600 44 "MyApp"
element heading    100  90 400 32 "Welcome back"
element input      100 170 400 36 "Email address"
element input      100 216 400 36 "Password"
element primary-button 100 264 400 36 "Sign In"
```

Don't wrap the block in extra prose unless the user asked for narration.

**Per-fence viewport hints.** When the mockup targets a non-default canvas size, append `width=N height=N` (and optionally `fit=fixed`) to the fence info — e.g. ` ```boceto:Mobile width=320 height=640 ` for a phone screen or ` ```boceto:Showcase fit=fixed width=1280 height=800 ` for a pinned desktop showcase. These are SVG-only render hints consumed by the remark / markdown-it plugins; they don't change the parsed doc. Default is `fit=content` (auto-size), so most mockups need no hints at all. See `references/grammar.md` for the full list of recognised keys.

**When the output includes a `component` definition**, follow the literate component-doc pattern — heading, description, definition block, example usage block, "Used in" line. See `references/component-doc-pattern.md`. Skipping this is fine for one-off mockups; reach for it whenever you're producing reusable components.

## The non-negotiables

These are the failure modes the parser is strictest about — guard against them up front.

### 1. Six positional slots on every `element` line

```
element TYPE[#id]   X   Y   W   H   "Label"   [key=value …]
```

The label slot is **always required**, even when the element shows no visible text — use `""` for chrome:

```
element chart-bar       232 110 600 260 ""
element status-bar       20  12 320  24 ""
element home-indicator   20 700 320   8 ""
element divider           0  40 600   1 ""
element fab             288 632  56  56 "+"
element spinner           0   0  32  32 ""
element table            10  10 320 180 ""        headers="A|B|C"
```

Drop the label slot and the parser rejects the line with `'element' requires: TYPE X Y W H "label" (got 5 args)`. **This is the #1 reason AI-generated Boceto fails to render.** The same applies to composite call sites: `element my-card 0 0 200 60 "" title="X"`.

### 2. Use only canonical element types — never invent

Element types are **always lowercase, kebab-cased** (`primary-button`, `chart-bar`, `phone-frame`). The full list is the catalog. To look something up:

- **With MCP**: `boceto_list_elements()` returns every type by category; `boceto_describe_element(type)` returns one's defaults and attribute schema.
- **Without MCP**: read the local `references/elements.md` if it's bundled, otherwise reach for the closest type from the hallucination map below.

Common AI hallucinations map to canonical types:

| If you'd write… | Use this instead |
|---|---|
| `Frame`, `Container`, `Section` | `box` (generic) or `card` |
| `Stack`, `VStack`, `HStack`, `Group` | `row` or `col` |
| `Heading2`, `H1`, `H2`, `Subheading` | `heading` (vary via `fontSize=`) |
| `Header`, `PageHeader` | `box` at top, or `navbar` for global nav |
| `NavBar`, `TopBar`, `AppBar`, `MenuBar`, `nav` | `navbar` |
| `Tab`, `TabBar` | `tabs` |
| `Icon`, `IconButton`, `icon-button` | `button` (small, e.g. 32×32) |
| `Pill`, `Tag` | `chip` or `badge` |
| `Link`, `TextLink` | small `button`, or styled `label` |
| `Card`, `Panel` (capitalised) | `card`, `panel` (lower-case) |
| `PhoneFrame`, `StatusBar`, `HomeIndicator` | `phone-frame`, `status-bar`, `home-indicator` |
| `FAB`, `FloatingButton` | `fab` |
| `Spacer`, `Divider` | `divider` |

If a name isn't here and isn't in the catalog, **don't emit it.** Either pick the closest canonical primitive or — better — define a composite `component` named after what the user asked for.

### 3. Integers, quoted labels, balanced blocks

- **Coords are non-negative integers.** No decimals, no negatives. Round before emitting.
- **Labels are double-quoted.** Inside: `\"`, `\\`, `\n`, `\t` are the only escapes. `\n` is a real newline (used by `textarea`, `alert`, `chat-bubble`).
- **`row` / `col` / `component`** open with `:` and close with `end`. Don't leave a block dangling.
- **Use `textAlign=`, not `align=`,** for text alignment. `align=` is the flex container attr (`start|middle|end|stretch`) and gets misparsed on non-container elements.

### 4. `row` / `col` need four positional slots

Containers have the **same arity as elements minus the label**:

```
row[#id]   X Y W|auto H|auto   [attrs] :
col[#id]   X Y W|auto H|auto   [attrs] :
```

`row padding=20 gap=12` alone fails — `row` needs `X Y W H` *before* any attrs. Use `0` or `auto` when you don't care about a coordinate (`auto` for W/H means "size to children"; `0` for X/Y means "no preferred position, defer to parent layout").

### 5. Components — defined once per page

Inside a page, the same `component foo(…) … end` definition appears in **exactly one fenced block**. Every other block (example usage, downstream mockup) calls it by name. Re-pasting the definition across blocks fails with `Duplicate component definition`.

## Authoring philosophy — components-first

Boceto is small but expressive. Before placing raw boxes, ask:

1. **Is what they want already an element type?** Check the catalog (MCP `boceto_list_elements` or `references/elements.md` if bundled). If yes, use it directly.
2. **Is it an obvious composition of 2–4 primitives?** A "metric tile" is a `card` + small `label` + big `heading`. A "feature card" is a `card` + `heading` + `label`. Define these as `component`s and the page-level DSL stays short. **Never invent a type** — composing primitives under a new component name is always the right move.
3. **Is it a category of screen** ("a dashboard", "a settings page", "a mobile app") rather than a one-off layout? Define a shell `component` (`appshell`, `phoneshell`, `auth-shell`) and place concrete content inside it via slots.

Rule of thumb: if the same shape appears 3+ times, or the user is sketching a "category of screen" rather than a one-off page, **componentize**. The result is shorter DSL, easier diffs, and a vocabulary the user can extend ("add another metric card" not "add another 6-line block").

### Params vs slots

Composite components have two ways to vary content per call site:

- **Params** (`component foo(title, value)` + `$title`) — for scalar inputs: titles, values, item lists (pipe-separated). The call site sets them as `key=value` attrs.
- **Slots** (`slot` or `slot NAME` in the body) — for DSL-shaped inputs: a body, a row of actions, anything that's multiple `element` lines. The call site supplies the fill via a children block at its trailing `:`.

A reusable shell typically uses **both** — params for chrome strings, slots for body content. If a shell has more than one fill region (body + footer, header actions + content), use **named slots**; templates that only support one fill point feel cramped fast.

```boceto
component dialog(title)
  element box     0   0 400 220 ""
  element heading 20  16 360  28 "$title"
  element divider 20  50 360   1 ""
  slot                                  # default — dialog body
  element divider 20 168 360   1 ""
  slot actions                          # named — bottom-right button row
end

element dialog 100 80 400 220 "" title="Confirm delete" :
  element label 20 64 360 90 "This will permanently delete the project. Are you sure?"
  slot actions
    element button         200 180 80 28 "Cancel"
    element primary-button 290 180 80 28 "Delete"
  end
end
```

### Three parser limitations worth knowing

- **`slot` markers must be top-level in a component body** — never nested inside `row` / `col`. (Workaround: place the slot statement at the body's top level, position via absolute coords.)
- **Element-as-container (`element foo 0 0 W H "" :`) can't be used inside a component body** — only at the page level. Inside components, use `row` / `col` or absolute positioning.
- **Component param names follow JS identifier rules** — no hyphens. Use `navItems` not `nav-items`.

## Flex layout — the 80% rules inline

The agent shouldn't need to load `references/layout.md` for the common cases — here are the high-leverage flex rules:

**Containers** (`row` / `col`) — flow children left→right or top→bottom. Both accept these attrs after `X Y W H`:

| Attr | Values | Default | What it does |
|---|---|---|---|
| `gap` | integer | `0` | pixels between adjacent children |
| `padding` | integer | `0` | inner padding on all four edges |
| `justify` | `start` · `middle` · `end` · `between` · `around` · `evenly` | `start` | main-axis distribution |
| `align` | `start` · `middle` · `end` · `stretch` | row: `middle`, col: `start` | cross-axis alignment |
| `wrap` | `nowrap` · `wrap` · `wrap-reverse` | `nowrap` | line-wrapping behaviour |

**Children** inside a flex container — set these on the children, not the container:

| Attr | Values | Default | What it does |
|---|---|---|---|
| `grow` | number | `0` | share of remaining space the child claims |
| `shrink` | number | `1` | how much the child shrinks under tight space |
| `basis` | integer · `auto` | `auto` | preferred main-axis size before grow/shrink |
| `align-self` | `auto` · `start` · `middle` · `end` · `stretch` | `auto` | overrides container's `align` for this one child |
| `min-w` / `min-h` / `max-w` / `max-h` | integer | unset | bounds on the child's final box |

**Sizing semantics:**

- Use `auto` in W or H when the container should size to its children (`row 20 20 auto auto …`).
- A child's `X` slot is its preferred main-axis size when inside a flex container. `0` means "no preference — defer to basis / grow / stretch".
- Common pattern: a row with one input that fills the gap — set the input's W to `0` (no preference) and `grow=1`:

```boceto
row 20 80 600 36 gap=8 align=middle
  element label  0 0  80 22 "Email"
  element input  0 0   0 36 "" grow=1
  element button 0 0  80 36 "Send"
end
```

**Element-as-container**: any element can host children via a trailing `:` (e.g. `element card 0 0 400 280 "Sign in" :`). Without `direction=`, the children's `(x, y)` are absolute inside the card's content rect. With `direction=col gap=8 padding=12`, the element becomes a flex container while keeping its chrome.

Reach for `references/layout.md` only when you need wrap-as-grid behaviour, deep flex nesting, or the full alignment reference table — the above is enough for 80% of mockups.

## When the `boceto` MCP server is connected

These tools are the fastest path to verified output — call them instead of guessing or reading the local refs:

| Tool | When |
|---|---|
| `boceto_list_recipes` | Starting a new mockup. Returns every recipe + summary. Skim the list, pick the closest match. |
| `boceto_read_recipe(slug)` | Once you've picked a recipe — returns the full source block to adapt from. |
| `boceto_list_elements` | Picking an element type. Returns the catalog grouped by category. |
| `boceto_describe_element(type)` | Choosing per-element attrs (table headers, chart data, dropdown items). |
| `boceto_lint(source)` | Before returning your output. Reports line + column for every issue and an autofixed copy of the source. Run this on what you produced — if the linter found errors, ship the `fixed` source instead. |
| `boceto_render_svg(source)` | When the user wants to see the result inline — produces a self-contained SVG. |

Recipe slugs follow the catalog: full-page mockups (`login`, `signup`, `dashboard`, `chat`, `pricing-comparison`, …) and reusable shells (`appshell`, `dialog`, `kanban-column`, `metric-card`, `panel`, …). The `index` recipe contains the decision guide and adaptation patterns.

The lint-before-ship cycle is non-negotiable when MCP is available — it costs one tool call and catches the six-slot rule, invented types, fractional coords, and unclosed blocks before the user sees the output.

## When MCP is not connected

The skill ships with two reference files:

- **`references/grammar.md`** — formal tokens, escape sequences, IDs, attribute syntax, multi-page docs, component header attributes.
- **`references/layout.md`** — `row` / `col` flex semantics, `auto` sizing, `grow` / `shrink`, alignment, wrap-as-grid, element-as-container.

For the **element catalog** and **recipes**, you'll need to rely on your training knowledge of the spec — the canonical types listed in the hallucination map above cover the most common needs. When in doubt, fall back to primitives: `box`, `card`, `heading`, `label`, `input`, `button`, `primary-button`, `divider`, `navbar`, `sidebar`. These cover ~70% of mockups.

## Iterating on an existing mockup

When the user asks to *edit* a mockup rather than create one, return the full updated `​```boceto…​```` block — not a diff, not a partial. Preserve their IDs, attributes, and layout patterns. Only change what's needed. If the input block had any defects (missing labels, invented types, fractional coords), fix them in the output — don't propagate the bug.

If MCP is connected, run `boceto_lint` on the result before returning.

## Quick checklist before you commit your output

1. **Six positional slots on every `element` line** — `element TYPE X Y W H "Label"`. Empty `""` for chrome.
2. **Four positional slots on every `row` / `col` line** — `row X Y W H` (or `auto` for W/H). Attrs follow.
3. Every line starts with `element`, `text`, `arrow`, `row`, `col`, `end`, `component`, or `slot`.
4. Coords are integers ≥ 0.
5. Labels are quoted; multi-line labels use `\n` inside the quotes.
6. Element types are canonical (lowercase, kebab-case, from the catalog).
7. `row` / `col` / `component` blocks closed with `end`.
8. The block opens with `​```boceto` or `​```boceto:PageName`.
9. **If you defined a `component`, the definition appears in exactly one fenced block**. Subsequent blocks call it by name — they do NOT re-paste the definition.
10. If the output includes a `component` definition, the surrounding markdown uses the literate component-doc pattern (`references/component-doc-pattern.md`).
11. If MCP is connected, you ran `boceto_lint` and shipped the `fixed` source if it found anything.
