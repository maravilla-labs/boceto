# Boceto components — reusable definitions, slots, shells

Load this when the user wants to define a reusable wireframe component (e.g. a feature card that gets reused in several places), or when their existing DSL has `component … end` blocks.

## Defining a component

```
component <Name>(<param1>, <param2>) [shell-attrs] [defaults]
  <body using $param substitutions>
end
```

- **Name** must match `[A-Za-z][A-Za-z0-9_-]*` and cannot collide with any built-in element type (so `button` and `card` are reserved; use `my-card` or `feature-card`).
- **Params** are named slots for substitution inside the body. Inside the body, `$name` or `${name}` are replaced with the param value at the call site.
- **Shell attrs** make the component behave like a flex container (see "Responsive shells" below). When set, the body lays out as flex children of the instance's outer box.
- **Defaults** declare default `w` / `h` (or `auto`) and per-instance flex props (`grow`, `shrink`, etc.) that the call site can override.

### Minimal example

```boceto
component feature-card(title, body)
  element card 0 0 240 140 "" :
    element heading 12 12 216 28 "$title"
    element label   12 50 216 60 "$body"
  end
end

# Call sites
element feature-card 40  40 240 140 "" title="Fast" body="Renders in <16ms."
element feature-card 320 40 240 140 "" title="Tiny" body="Under 50kB gzipped."
```

The instance line uses the component name in the `type` slot, an empty label `""`, and the params as attributes.

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

## Tip: round-trip composition

`<boceto-edit>` treats composite instances as a single draggable / resizable unit, with their body re-laid-out automatically. If the user moves an instance, the surrounding components (and the contents of any flex containers) reflow. This is why `auto` sizing + flex shells are the most-future-proof way to author reusable components.
