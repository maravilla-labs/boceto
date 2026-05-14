# Boceto layout — `row`, `col`, and element-as-container

Load this when the user asks for layouts that should adapt to their content size, when items need to be aligned or distributed, or when they're using `row` / `col` blocks in their existing DSL.

## Two ways to lay out children

There are two body styles, both of which open with a trailing `:`:

**Flex layout** — set `direction=row` or `direction=col` (or use the `row` / `col` keywords). Children's `(x, y)` slots become preferred main-axis sizes; the layout pass computes the final position based on container size, gap, padding, justify, and align.

**Absolute body** — no `direction` set. Children's `(x, y)` are relative to the container's content rect (top-left = 0,0). Use this when you want pixel-precise placement inside a card/modal/phone-frame.

The two forms are statement-level interchangeable: `row 0 0 600 60 gap=8 [items]` and `element box 0 0 600 60 "" direction=row gap=8 [items]` parse to equivalent docs, modulo the box's chrome.

## `row` and `col`

```
row[#id] X Y W|auto H|auto [attrs] :
  <child statements>
end
```

`row` flows children **left → right** (main-axis = X). `col` flows them **top → bottom** (main-axis = Y). Both accept the same attrs.

| Attr | Values | Default | Meaning |
|---|---|---|---|
| `gap` | integer | `0` | Pixels between adjacent children. |
| `padding` | integer | `0` | Inner padding on all four edges. |
| `justify` | `start` \| `middle` \| `end` \| `between` \| `around` \| `evenly` | `start` | Main-axis distribution of children. |
| `align` | `start` \| `middle` \| `end` \| `stretch` | row: `middle`, col: `start` | Cross-axis alignment of children. |
| `wrap` | `nowrap` \| `wrap` \| `wrap-reverse` | `nowrap` | Whether children wrap to a new line when overflowing the container. |

`W` and `H` can be `auto` — the container sizes itself from its children plus padding/gap.

## Per-child flex attrs

Set these on **child** elements inside a `row` / `col`. They drive how each child consumes available space.

| Attr | Values | Default | Meaning |
|---|---|---|---|
| `grow` | number | `0` | Share of remaining main-axis space the child claims (CSS `flex-grow`). |
| `shrink` | number | `1` | How much the child shrinks below its preferred size when space is tight. |
| `basis` | integer \| `auto` | `auto` | Preferred main-axis size before grow/shrink applies. |
| `align-self` | `auto` \| `start` \| `middle` \| `end` \| `stretch` | `auto` (inherits container's `align`) | Override the container's `align` for this one child. |
| `min-w`, `min-h` | integer | unset | Lower bounds on the child's final box. |
| `max-w`, `max-h` | integer | unset | Upper bounds on the child's final box. |

Inside a flex container, the child's positional `X` slot becomes its preferred main-axis size for `row`, and the cross-axis size for `col`. `Y` is the inverse. `0` means "no preferred size — defer to basis / grow / stretch".

## Examples

### Centred toolbar

```boceto
row 20 20 860 60 gap=12 align=middle justify=middle
  element button 0 0 100 36 "Back"
  element heading 0 0 200 28 "Settings"
  element primary-button 0 0 100 36 "Save"
end
```

### Form field with a stretching input

```boceto
row 20 80 860 36 gap=8 align=middle
  element label  0 0  80 22 "Email"
  element input  0 0   0 36 "" grow=1
  element button 0 0  80 36 "Send"
end
```

The middle child has `X=0` (no preferred size) and `grow=1`, so it absorbs the remaining width.

### Sidebar + content split

```boceto
row 0 0 auto auto padding=0 gap=0
  element sidebar 0 0 220 0 "Menu" grow=0
  col 0 0 0 0 grow=1
    element navbar  0 0 0 44 "Dash" grow=0
    element box     0 0 0 0  ""     grow=1
  end
end
```

`grow=1` on the content `col` plus `grow=0` on the sidebar makes the content area fill remaining width when the outer container is sized.

### Responsive button row that wraps

```boceto
row 20 20 400 auto gap=8 wrap=wrap
  element button 0 0 120 36 "Save"
  element button 0 0 120 36 "Save & New"
  element button 0 0 120 36 "Cancel"
  element button 0 0 120 36 "Delete"
end
```

With `wrap=wrap` and `W=400`, the buttons flow onto a second row when they exceed 400px total width.

## Element-as-container

Any element can host children if you append `:` to its line and provide an `end`. The element's chrome (border, header, etc.) still renders normally; children live inside the content rect.

```boceto
element card 100 100 400 280 "Sign in" :
  element input 0 50 400 36 "Email"
  element input 0 96 400 36 "Password"
  element primary-button 0 150 400 36 "Continue"
end
```

Without `direction`, children's coords are absolute inside the card's content rect (after the header). Add `direction=col gap=8 padding=12` to make the card a vertical flex container:

```boceto
element card 100 100 400 280 "Sign in" direction=col gap=8 padding=16 :
  element input 0 0 0 36 "Email"
  element input 0 0 0 36 "Password"
  element primary-button 0 0 0 36 "Continue"
end
```

This is the same model as `row` / `col` but lets you keep the card's chrome (rounded border, header divider).

## When to choose which

- **Absolute coordinates** — fastest to read, good for small mockups with 5–15 items.
- **`row` / `col`** — pulls its weight when you have 3+ items in a line that should be evenly spaced, or when the parent might resize.
- **Element-as-container** — natural for "stuff inside a card / modal / phone-frame" without nesting two statements (the card + a flex container that mimics its inner rect).
- **`auto` sizing** — almost always desired for `row` / `col` whose size should follow its content (e.g. a button group). Pin a fixed size only when the content overflows visually.

## Common mistakes

- **`align=center` vs `textAlign=center`**: `align` on a flex container controls cross-axis alignment of its children (and only accepts `start | middle | end | stretch`). `textAlign` on any element controls its label's horizontal alignment. Mixing them up is a parser error.
- **Negative coordinates from flex math**: don't pre-compute child positions to fit a flex container. Set their `X` to `0` (no preference) and let the container size them.
- **Forgetting `end`**: every `row` / `col` (or `:` element-as-container) needs a matching `end`. The parser errors as "Unclosed".
