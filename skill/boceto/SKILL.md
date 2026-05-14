---
name: boceto
description: Author hand-drawn wireframe mockups in the Boceto DSL — a compact, fenced-code-block-friendly grammar that renders to sketchy SVG / canvas. Use this skill whenever the user asks to "sketch a wireframe", "mock up a screen", "show a UI for X", "wireframe Y", design a login / dashboard / mobile / settings / marketing layout, or any mention of @boceto, boceto-view, boceto-edit, .boceto files, or fenced ```boceto blocks. Also use it when the user asks Claude to add to or edit an existing Boceto mockup, even when they only describe the change ("add a search bar at the top"). Prefer this skill over free-form ASCII art when the user's project uses Boceto.
---

# Boceto — wireframe mockup DSL

Boceto is a tiny grammar for hand-drawn wireframes. One line per element, integer coordinates, sketchy SVG / canvas output. Designed to live inside fenced markdown code blocks so PRs, docs, and design reviews can carry wireframes as plain text.

## When you reach for this skill

- The user wants a wireframe, sketch, mockup, or UI layout for any kind of screen.
- The user references `@boceto/*`, `<boceto-view>`, `<boceto-edit>`, `.boceto` files, or `​```boceto` fenced blocks.
- The user is iterating on an existing Boceto block (adding / moving / removing elements) — you should produce the *full updated block*, not a diff.

If the project doesn't use Boceto at all, this skill probably isn't the right answer — produce plain ASCII or describe the layout in words instead.

## Output contract

When asked for a mockup, produce a single fenced `​```boceto:PageName` block by default. Use `​```boceto` (no page name) if the request is for a snippet, not a full page. Coordinates are non-negative integers in pixels. Pages can be 600–1100 wide for typical desktop; 320–420 wide for mobile.

```boceto:Login
element navbar       0  0 600 44 "MyApp"
element heading    100 90 400 32 "Welcome back"
element label      100 130 400 22 "Sign in to continue"
element input      100 170 400 36 "Email address"
element input      100 216 400 36 "Password"
element primary-button 100 264 400 36 "Sign In"
element button     100 312 196 30 "Forgot password?"
element button     304 312 196 30 "Register"
```

This snippet renders to a hand-drawn login screen via `<boceto-view>` or any of the Boceto renderers. Do not wrap the block in extra prose unless the user asked for narration.

## Authoring philosophy — components first, ad-hoc boxes second

Boceto is a tiny DSL but it's expressive enough to reward a **modular** authoring style. Before you start placing individual boxes, ask three questions:

1. **Is what they're asking for already an element type?** If yes (`navbar`, `chart-donut`, `phone-frame`, `chat-bubble`, …), use it directly. Check `references/elements.md`.
2. **Is what they're asking for an obvious composition?** A "feature card" is a `card` plus a `heading` plus a `label`. A "metric tile" is a `card` plus a small `label` plus a large `heading`. Define these as **`component`s** — see `references/components.md` — so the page-level DSL stays short and readable, and tweaks happen in one place. **Never invent an element type**; if there's no built-in match, the answer is a `component`, not a made-up name.
3. **Is what they're asking for a page shell or layout template?** A dashboard is almost always `navbar` + `sidebar` + content; a mobile screen is `phone-frame` + `status-bar` + content + `home-indicator`; an auth screen is a centered `card` on a blank canvas. **Define a shell `component` once**, then place concrete widgets inside it via a slot or by listing them at the call site. See "Templates and shells" in `references/recipes.md`.

The rule of thumb: **if the same shape appears 3+ times, or if the user is sketching a category of screen rather than a one-off page, reach for a `component`**. The result is dramatically cleaner DSL, easier diffs when the user iterates, and a mental model the user can extend ("add another metric card" instead of "add another set of 6 attributes").

When you're unsure, default to composing. A 60-line page made of 4 component calls is easier to read and edit than a 60-line page of raw `element` lines.

### What to do when the user asks for an element that doesn't exist

Two valid paths — pick the one that fits the user's intent:

- **Most of the time: build it as a composite component.** If they ask for a "stat tile", define `component stat-tile(label, value) … end` with the 2–3 primitives it actually needs (a `card` + a small `label` + a big `heading`). Then call it. Composable, named, reusable.
- **For one-off chrome they'll never re-use, fall back to the closest primitive.** A "page header" is just a `box` at the top with a `heading` inside. Don't define a component for something you'll never call twice.

The exception is **chrome** — `navbar`, `sidebar`, `phone-frame`, `status-bar`, `home-indicator`, `browser-frame`, `window-frame`, `terminal`. Those are real element types; don't componentize them. But you can put one *inside* a shell component (e.g. an `appshell` component that includes a `navbar` + a `sidebar` slot).

### Params vs slots — pick the right tool

Composite components have two ways to vary content per call site, and the difference matters for readability and reuse:

- **Params** (`component foo(title, value)` + `$title` / `${value}`) — for **scalar inputs**: titles, values, colors, item counts, item lists (via pipe-separated strings). Short, attribute-like. Each call site sets them as `key=value` attrs: `element foo 0 0 200 60 "" title="X" value="42"`.
- **Slots** (`slot` or `slot NAME` in the body) — for **DSL-shaped inputs**: a header, a body, a row of actions, anything that's multiple `element` lines. Each call site supplies the fill via a children block at its trailing `:`. The default `slot` (unnamed) receives bare children; `slot NAME` receives the children inside a matching `slot NAME … end` sub-block at the call site.

A reusable shell typically uses **both**: params for chrome strings (page title, brand name, nav items) and slots for the body content the user fills in. The two combine well:

```boceto
component dialog(title)
  element box     0   0 400 220 ""
  element heading 20  16 360  28 "$title"
  element divider 20  50 360   1 ""
  slot                                    # default slot — dialog body
  element divider 20 168 360   1 ""
  slot actions                            # named slot — footer button row
end

# Call site fills BOTH slots
element dialog 100 80 400 220 "" title="Confirm delete" :
  element label 20 64 360 90 "This will permanently delete the project. Are you sure?"
  slot actions
    element button         200 180 80 28 "Cancel"
    element primary-button 290 180 80 28 "Delete"
  end
end
```

Without named slots you'd have to expose the actions via params (a brittle pipe-list of button labels) or hardcode them. With slots the call site supplies real DSL — different elements, different counts, different styling per call.

**When a shell has more than one "fill region"** — body + footer, header actions + content, sidebar items + main — use **named slots**. The user is asking for a template, and templates that only support a single fill point feel cramped fast.

See `references/components.md` for the full slot grammar, including how to define a default slot alongside named ones, and which call-site shape goes with which body slot.

## The one rule the parser is strictest about

**Every `element` line has six positional slots before any `key=value` attrs:**

```
element TYPE[#id]   X   Y   W   H   "Label"   [key=value …]
```

The label slot is **always required**, even for chrome elements that show no visible text. Use `""` (an empty quoted string) for them:

```
element chart-bar       232 110 600 260 ""
element status-bar       20  12 320  24 ""
element home-indicator   20 700 320   8 ""
element divider           0  40 600   1 ""
element fab             288 632  56  56 "+"
element spinner           0   0  32  32 ""
element table            10  10 320 180 ""        headers="A|B|C"
```

If you drop the label slot, the parser rejects the line with `'element' requires: TYPE X Y W H "label" (got 5 args)`. This is the #1 reason AI-generated Boceto fails to render — guard against it explicitly.

The same applies to composite call sites: `element my-card 0 0 200 60 "" title="X"`. The label is always there; params live in attrs.

## The DSL in 60 seconds

Every statement starts with a keyword:

```
element <type>[#id] X Y W H "Label" [key=value ...]   # most lines
text                X Y    "Some prose"               # bare text
arrow      <fromId> <toId> "optional label"           # connector
row[#id]   X Y W|auto H|auto [flex attrs] :           # flex container
  <child statements>
end
col[#id]   X Y W|auto H|auto [flex attrs] :           # same, vertical
  <child statements>
end
component <Name>(<param1>, <param2>) [shell] [defaults]
  <body using $param substitutions>
end
```

Key rules:

- **Coordinates are non-negative integers.** Decimals are rejected. `0` is a valid coordinate (used for "no preference").
- **Labels are double-quoted strings.** Inside, `\"` `\\` `\n` `\t` are the only escapes; `\n` is a real newline (used for `textarea`, `alert`, `chat-bubble`).
- **`auto`** in `W` or `H` slots is allowed on `row` / `col` / component instances — the layout pass sizes the box from its children.
- **Comments** start with `#` at column 0 (lines that begin with `#`). Inline `#` after a token is part of the token.
- **Attributes** are `key=value` pairs after the positional slots. Unquoted values containing spaces must use `key="value"`. Pipe-lists use `items="One|Two|Three"`.

The parser is strict. Fractional coordinates, negative coordinates, unquoted labels, and unknown statement keywords are all parse errors.

## How to embed

Three valid forms, all backed by the same parser:

1. **Markdown fenced block** (most common). Lives inside `.md` files; rendered by remark/markdown-it plugins or `<boceto-view>` consuming the `code` attribute.
   ```
   ​```boceto:Login
   element ...
   ​```
   ```
2. **Standalone `.boceto` file**. Multi-page docs use `--- PageName` separators:
   ```
   --- Login
   element navbar ...
   --- Dashboard
   element navbar ...
   ```
3. **Raw single-block** (no fence, no `---`). Used by `<boceto-view code="...">` when there's no markdown surround. The parser detects this automatically.

## Choose the right reference

The deep details live in bundled reference files. Load only the ones you need for the task — don't dump everything into context.

| File | When to load |
|---|---|
| `references/grammar.md` | Edge cases on parsing — what's legal in a string literal, IDs, comments, errors. |
| `references/elements.md` | **The most common load.** All 83 element types with default sizes, type-specific attrs, and ASCII sketches of how they render. Open this whenever you need to pick the right element. |
| `references/layout.md` | When the layout needs `row` / `col` containers, flex behavior, `auto` sizing, `grow` / `shrink`, alignment, wrapping, or element-as-container body blocks. |
| `references/components.md` | When the user wants to define reusable `component` blocks with parameters, slots, or responsive shells. |
| `references/recipes.md` | Pattern-match starting points: login, dashboard, mobile app, modal, marketing site, settings, chat — full mockups you can clone and edit. |

## Generic attributes every element accepts

These work on any element, regardless of type. They override per-element defaults.

| Attribute | Values | Effect |
|---|---|---|
| `id` | `[A-Za-z][A-Za-z0-9_-]*` | Named id. Equivalent to `type#id`. |
| `fontSize` | integer (px) | Text size for labels. |
| `overflow` | `ellipsis` \| `wrap` \| `clip` \| `shrink` | What happens when a label is wider than the element. `wrap` for `heading`/`label`/`textarea`; `ellipsis` for most chrome (button/badge/chip). `shrink` does a font-size binary search. |
| `textAlign` | `left` \| `center` \| `right` | Horizontal alignment of the label inside its box. (Named `textAlign` not `align` to avoid a parser collision with the flex container's cross-axis `align`.) |
| `minFontSize` | integer | Lower bound when `overflow=shrink`. Default 9. |
| `border` | `true` \| `N` \| `"#hex"` | Extra stroke around the element. |
| `shadow` | `true` \| `N` | Drop shadow. |

Flex-child attributes (`grow`, `shrink`, `basis`, `align-self`, `min-w`, `min-h`, `max-w`, `max-h`) only matter when the element is a child of a `row` / `col` — see `references/layout.md`.

## Rendering aesthetics — what the user sees

Boceto's defaults emit a **hand-drawn wireframe** look:

- **Paper background** `#fafaf8` with a faint dotted grid (`#e8e8e4`, 20px spacing).
- **Sketchy strokes** — every corner has small random jitter (1–2px), every line wobbles slightly, and box top edges get a faint double-line "double-check this corner" detail.
- **Default ink** `#444` on box strokes, `#222` on text labels, `#3b82c4` on primary buttons / progress bars, `#e94560` on badges.
- **Font** — `'Patrick Hand', 'Comic Sans MS', cursive` by default. Headings 22px bold, labels 15px, buttons 13px bold, body 13px.
- **Selection chrome** (only when something is selected in `<boceto-edit>`) — 8 blue squares around the bbox.

Tell the user what they'll see if it helps frame their feedback. ("It'll render as a hand-drawn login screen with a navbar at the top and two stacked input fields.")

## Common pitfalls

- **Fractional coords from "centered around X"**: do the math first, round before emitting. `element button 100 (264 - 18) 200 36 "Hi"` is invalid — write `246`, not the expression.
- **Negative coords from off-screen positioning**: the parser rejects them. If you want an element to start above the canvas, the canvas starts higher instead. Coords are doc-space, not viewport-space.
- **Unquoted multi-word labels**: `element heading 0 0 200 32 Welcome back` fails. Always quote: `"Welcome back"`.
- **Trying to use HTML in labels**: labels are plain text. `<b>bold</b>` renders literally. Use `fontSize` and `bold` (which isn't a per-attribute — bold is set by the element type, e.g. `heading` is always bold).
- **`align=center` on a heading**: that's the flex container attr, not text alignment. Use `textAlign=center` instead.
- **`align-self` outside a flex container**: harmless but ignored. Flex-child attrs only apply inside a `row` / `col`.
- **Forgetting to close a `row` / `col` / `component`** with `end`: the parser surfaces an "Unclosed" error.

## Picking page dimensions

Default to:

- **Desktop screens**: 900 × 540 to 1100 × 700
- **Mobile screens**: 360 × 720 (often wrapped in `phone-frame` for visual chrome)
- **Cards / dialogs**: 400 × 280
- **Embedded snippets** (inline in docs): 600 × 200 to 900 × 300

These match the demos in `site/index.html` and `site/docs.html` — they're known-good sizes that look right in PRs and READMEs.

## Iterating on an existing mockup

When the user asks to *edit* a mockup (rather than create one from scratch), your job is to return the full updated `​```boceto...​```` block — not a diff, not a partial — so the user can copy-paste over their existing block. Preserve their IDs, attributes, and layout patterns. Only change what's needed.

If the user pastes a block and asks "add a search bar at the top", the reply is the same block plus the new search element, with everything else's coordinates shifted only if absolutely needed to make room.

## Quick checklist before you commit your output

Mentally run through these — they're the high-frequency failure modes.

1. **Six positional slots on every `element` line** — `element TYPE X Y W H "Label"`. Empty `""` for chrome (chart-bar, divider, status-bar, home-indicator, spinner, table, fab, image when no caption). Drop one and the parser dies.
2. Every line starts with `element`, `text`, `arrow`, `row`, `col`, `end`, `component`, or `slot`.
3. Coordinates are integers ≥ 0.
4. Labels are quoted; multi-line labels use `\n` inside the quotes.
5. Element types come from the 83 in `references/elements.md` — **not invented**. Below is the canonical map of common AI hallucinations to real types. If a name you want to use is NOT in `references/elements.md`, find its closest real type here first; do not emit unknown types — the parser will reject them.

   | If you'd write… | Use this Boceto type instead |
   |---|---|
   | `Frame`, `frame`, `Container`, `Section` | `box` (generic) or `card` (with header divider) |
   | `Stack`, `VStack`, `HStack`, `Group` | `row` or `col` (flex container) |
   | `Link`, `link`, `TextLink` | `button` with a small size, or `label` with a colored fontSize |
   | `Heading2`, `Heading3`, `H1`, `H2`, `Subheading` | `heading` (use `fontSize=22` for h1, `fontSize=18` for h2, `fontSize=16` for h3) |
   | `header`, `Header`, `PageHeader` | `box` (or `card`) at the top of the page; or `navbar` if it's the global nav |
   | `footer`, `Footer` | `box` at the bottom |
   | `menu-bar`, `MenuBar`, `nav` | `navbar` |
   | `NavBar`, `TopBar`, `AppBar` | `navbar` |
   | `Tab`, `tab-bar`, `TabBar` | `tabs` |
   | `Icon`, `icon`, `IconButton`, `icon-button` | `button` (just smaller, e.g. 32×32), or `avatar` for round-ish icons |
   | `Pill`, `Tag` | `chip` or `badge` |
   | `Card`, `Panel` (capitalised) | `card` (lower-case is the real one) |
   | `StatusBar` (capitalised) | `status-bar` (kebab-case is the real one) |
   | `PhoneFrame`, `HomeIndicator` | `phone-frame`, `home-indicator` (kebab-case) |
   | `Fab`, `FAB`, `FloatingButton` | `fab` |
   | `Spacer`, `Divider` (capitalised) | `divider` |
   | `Avatar` (capitalised) | `avatar` |

   Element types are **always lowercase, kebab-cased** (`primary-button` not `primaryButton`). Component-instance call sites use the component name verbatim (case-sensitive).
6. Open `row` / `col` / `component` blocks are closed with `end`.
7. The block opens with `​```boceto` or `​```boceto:PageName`.

If you took an existing Boceto block from the user and it had any of these defects, **fix them in the output** — don't propagate the bug. The user wants a valid block back.

If any of these fail, fix the output before returning it.
