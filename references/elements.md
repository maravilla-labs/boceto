# Boceto element catalog

All 83 element types in v0.1, grouped by purpose. For each: default size, an ASCII sketch of what gets rendered, type-specific attributes, and a known-good DSL line you can adapt.

When you don't know which element to pick, scan this file for the visual that matches what the user described. Don't invent types — anything not in this list is a parse error.

Every element also accepts the generic attrs from `SKILL.md` (`id`, `fontSize`, `overflow`, `textAlign`, `minFontSize`, `border`, `shadow`). They're omitted from each entry below to keep this scannable.

---

## Layout

Containers and structural elements. Use these as the "scaffolding" for screens.

### `box` — 200 × 120
Generic rectangle with a label inside (wraps to 2 lines). The default "I need a frame here" primitive.

```
┌────────────────────┐
│ Label text wraps   │
│ inside the box     │
└────────────────────┘
```
```
element box 0 0 200 120 "Container"
```

### `card` — 280 × 160
Like `box` but with a horizontal divider 32px below the top edge — implies a header / body split.

```
┌────────────────────┐
│ Card title         │
├────────────────────┤
│                    │
└────────────────────┘
```
```
element card 0 0 280 160 "Title"
```

### `modal` — 420 × 260
Drop-shadowed dialog with a `#f5f5f5` title bar at the top and a `×` close glyph in the top-right.

```
┌─ Title ──────────────────  ×┐
│                             │
│        body content         │
│                             │
└─────────────────────────────┘ (shadow)
```
```
element modal 0 0 420 260 "Confirm action"
```

### `navbar` — 600 × 44
Dark top bar. Brand label on the left, right-aligned menu items via `items="…|…|…"`.

```
█ Brand                       Home  About  Contact █
```
- `items` — pipe-list, default `Home|About|Contact`.

```
element navbar 0 0 600 44 "MyApp" items="Pricing|Docs|Login"
```

### `divider` — 300 × 1
A faint horizontal rule. Use the `H` slot as the line thickness.

```
─────────────────────────────────
```
```
element divider 0 0 300 1
```

### `sidebar` — 220 × 360
Left-rail navigation panel. Optional title label, pipe-list of items, an `active` highlight, and a `collapsed` icon-only mode.

```
┌───────────┐
│ Menu      │
│ ● Home    │
│ ○ Inbox   │
│ ○ Settings│
└───────────┘
```
- `items` — pipe-list. Default `Home|Inbox|Settings`.
- `active=N` — 0-based highlight index.
- `collapsed=true|false` — icon-only mode (drops the labels).

```
element sidebar 0 44 220 360 "Menu" items="Home|Inbox|Settings|Logout" active=0
```

---

## Typography

Bare text. Use `heading` for titles, `label` for body text, `breadcrumb` for path navigation.

### `heading` — 400 × 32
Bold large text (default `fontSize=22`). Wraps to fit when `overflow=wrap` (which is the default for `heading`).

```
**Welcome back to MyApp**
```
```
element heading 0 0 400 32 "Welcome back"
```

### `label` — 200 × 22
Body text (default `fontSize=15`). Default `overflow=wrap`, left-aligned.

```
Sign in to continue.
```
```
element label 0 0 400 22 "Sign in to continue"
```

### `breadcrumb` — 320 × 24
Slash-separated trail. Items via the label, e.g. `"Home / Settings / Account"`.

```
Home  /  Settings  /  Account
```
```
element breadcrumb 0 0 320 24 "Home / Settings / Account"
```

---

## Form

Inputs and buttons. These are the workhorses for any screen with user interaction.

### `input` — 240 × 36
Single-line text field. Italic grey placeholder shown when the label is short; a blinking-cursor mark on the left edge.

```
[│ Email address                     ]
```
```
element input 0 0 240 36 "Email address"
```

### `textarea` — 240 × 120
Multi-line text field. Use `\n` inside the label to author hard line breaks. Resize-grip hint in the bottom-right corner.

```
┌──────────────────┐
│ Hi team,         │
│                  │
│ Notes for v0.2.  │
│                ╲│
└──────────────────┘
```
```
element textarea 0 0 240 120 "Hi team,\n\nNotes for v0.2 attached.\n\n— S"
```

### `button` — 120 × 36
Neutral pill button. Light grey fill, dark stroke, bold centered label.

```
[ Button ]
```
```
element button 0 0 120 36 "Cancel"
```

### `primary-button` — 140 × 36
Filled accent button. Blue background (`#3b82c4`), white bold label. The "primary action" affordance.

```
[█ Submit █]
```
```
element primary-button 0 0 140 36 "Save"
```

### `select` — 200 × 36
Dropdown box with a chevron on the right edge.

```
[ Choose…              ▾]
```
```
element select 0 0 200 36 "Choose…"
```

### `checkbox` — 160 × 24
A 16×16 box with a check mark, plus a right-of-box label.

```
[✓] Option label
```
```
element checkbox 0 0 160 24 "Send me updates"
```

### `radio` — 160 × 24
A 16×16 circle with a centered dot, plus a right-of-circle label.

```
(●) Option label
```
```
element radio 0 0 160 24 "Standard plan"
```

### `switch` — 80 × 28
A pill toggle. `on=true` slides the knob to the right and tints the track.

```
( ●○ )    or    ( ○● )
```
- `on=true|false` — default `false`.

```
element switch 0 0 80 28 on=true
```

### `slider` — 200 × 24
Horizontal track with a circular thumb. Filled portion shows progress from `min` to `value`.

```
●═══════════○─────
```
- `min=N`, `max=N`, `value=N` — defaults `0`, `100`, midpoint.

```
element slider 0 0 200 24 value=70
```

### `range-slider` — 200 × 24
Two thumbs on the same track for a low / high range.

```
○──●═══════●──○
```
- `low=N`, `high=N`, `min=N`, `max=N`.

```
element range-slider 0 0 200 24 low=25 high=75
```

### `search` — 280 × 36
Input with a magnifier glyph on the left. Italic grey placeholder unless `value=` is set.

```
[🔍 Search…                  ]
```
- `value="…"` — current search text.

```
element search 0 0 280 36 "Search products…"
```

### `segmented-control` — 240 × 32
Pill row of mutually-exclusive options. Active segment has a white inset.

```
[ Day | Week | Month ]
```
- `items` — pipe-list. Default `Day|Week|Month`.
- `active=N` — 0-based active index.

```
element segmented-control 0 0 240 32 items="Day|Week|Month|Year" active=1
```

### `combobox` — 220 × 36
Like `select` but suggests it's typeable (chevron + cursor mark).

```
[│ Pick one…           ▾]
```
```
element combobox 0 0 220 36 "Pick a city"
```

### `date-picker` — 200 × 36
Input with a calendar glyph on the right.

```
[ 2026-05-14       📅]
```
```
element date-picker 0 0 200 36 "2026-05-14"
```

### `color-picker` — 180 × 36
Input with a colored swatch on the right.

```
[ #4a90d9    ◼ ]
```
```
element color-picker 0 0 180 36 "#4a90d9"
```

### `file-upload` — 280 × 80
Dashed-bordered drop zone with a centered label.

```
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
╎ Drop a file here │
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```
```
element file-upload 0 0 280 80 "Drop CSV here"
```

### `rating` — 140 × 24
Row of 5 stars; some filled, some outlined.

```
★ ★ ★ ☆ ☆
```
- `value=N` — 0–5. `max=N` — number of stars (default 5).

```
element rating 0 0 140 24 value=3
```

### `otp-input` — 220 × 40
Row of separate single-digit boxes.

```
[ 1 ][ 2 ][ 3 ][   ][   ][   ]
```
```
element otp-input 0 0 220 40
```

### `tag-input` — 260 × 40
Input field with multi-select chips inside.

```
[ (design×) (wireframe×) +tag…    ]
```
- `tags` — pipe-list.

```
element tag-input 0 0 260 40 tags="design|wireframe|ui"
```

### `stepper-input` — 120 × 32
Numeric input with `-` and `+` buttons.

```
[ - ][ 120 ][ + ]
```
```
element stepper-input 0 0 120 32 "120"
```

---

## Media

### `image` — 240 × 160
Grey rectangle with a centered camera glyph + caption.

```
┌──────────────────┐
│        📷        │
│   "Hero image"   │
└──────────────────┘
```
```
element image 0 0 240 160 "Hero image"
```

### `video` — 280 × 160
Black-ish rectangle with a centered play triangle + caption.

```
┌──────────────────┐
│       ▶          │
│    "Video"       │
└──────────────────┘
```
```
element video 0 0 280 160 "Demo"
```

### `avatar` — 48 × 48
Circle with a stylized head silhouette. Optional name label to the right.

```
( ○ ) Jane Doe
  ╲╱
```
```
element avatar 0 0 48 48 "Jane Doe"
```

---

## Content

### `list` — 240 × 160
Bulleted list, one item per row.

```
• Item one
• Item two
• Item three
```
- `items` — pipe-list. Default `Item one|Item two|Item three`.

```
element list 0 0 240 160 items="Apples|Pears|Oranges"
```

### `table` — 320 × 180
Header row + grid of cells. Header cells bold.

```
┌─Col 1─┬─Col 2─┬─Col 3─┐
│ a     │ b     │ c     │
│ d     │ e     │ f     │
│ g     │ h     │ i     │
└───────┴───────┴───────┘
```
- `headers` — pipe-list, default `Col 1|Col 2|Col 3`.
- `data="r1c1|r1c2;r2c1|r2c2"` — `;` separates rows, `|` separates cells.
- `rows=N`, `cols=N` — force grid size when no data.

```
element table 0 0 320 180 headers="Name|Email|Role" data="Jane|j@x|Admin;Bob|b@x|User"
```

### `tabs` — 320 × 200
Tab strip on top, content area below.

```
[ Tab 1 ] Tab 2  Tab 3
┌─────────────────────┐
│  Tab content here   │
└─────────────────────┘
```
- `tabNames` — pipe-list, default `Tab 1|Tab 2|Tab 3`.
- `active=N`.

```
element tabs 0 0 320 200 tabNames="Overview|Settings|Logs" active=0
```

### `badge` — 60 × 22
Small filled pill with bold white text. Default red (`#e94560`).

```
(New)
```
- `badgeColor="#hex"`.

```
element badge 0 0 60 22 "Hot"
```

### `progress` — 200 × 18
Horizontal bar with a filled portion + percentage label.

```
[████████        ] 50%
```
- `progress=N` — 0–100. Default 60.

```
element progress 0 0 200 18 progress=75
```

### `pagination` — 240 × 32
Numbered page links with the current one boxed.

```
‹ 1 [ 2 ] 3 4 … 10 ›
```
- `current=N`, `total=N`.

```
element pagination 0 0 240 32 current=3 total=12
```

### `alert` — 320 × 56
Tinted bar with an `ⓘ` icon and message text. Multi-line via `\n`.

```
┌─────────────────────────────┐
│ ⓘ  Alert message here       │
└─────────────────────────────┘
```
- `alertColor="#hex"` — border + tint. Default `#4a90d9`.

```
element alert 0 0 320 56 "Heads up: build needs a cache-bust" alertColor=#f59e0b
```

### `chip` — 90 × 26
Small rounded tag. Optional close `×`.

```
( Chip × )
```
- `closable=true|false`.
- `chipColor="#hex"`.

```
element chip 0 0 90 26 "design" closable=true
```

### `code-block` — 320 × 140
Dark monospace block. `\n` in label = line break. Optional language badge in the top-right.

```
┌─────────────── ┌js┐ ┐
│ function hi() {     │
│   return 1          │
│ }                   │
└─────────────────────┘
```
- `lang="…"` — language badge.

```
element code-block 0 0 320 140 "const x = 1\nconst y = 2\nreturn x + y" lang=js
```

### `accordion` — 320 × 80
Collapsible section. Header at top with chevron; body shown when `expanded=true`.

```
┌─ Section title       ▾ ┐
│ Section content…       │
└────────────────────────┘
```
- `expanded=true|false`.

```
element accordion 0 0 320 80 "FAQ" expanded=true
```

### `chat-bubble` — 240 × 60
Speech bubble with a tail. Left or right side.

```
╭ "Hello there"         ╮
╰╲─────────────────────╯
```
- `side=left|right`.
- `bubbleColor="#hex"`, `textColor="#hex"`.

```
element chat-bubble 0 0 240 60 "Got the file, looking now." side=right
```

### `calendar` — 240 × 220
Month grid with day numbers; one day highlighted.

```
   May 2026
 S  M  T  W  T  F  S
              1  2  3
 4  5  6 [7] 8  9 10
…
```
- `month=N` (1–12), `year=N`, `selected=N` (day-of-month).

```
element calendar 0 0 240 220 month=5 year=2026 selected=14
```

### `tree` — 220 × 180
Indented hierarchical list with expand chevrons.

```
▾ Folder
  ▸ Subfolder
  ▸ Subfolder
▸ Another
```
```
element tree 0 0 220 180
```

### `stepper` — 320 × 56
Horizontal progress through ordered steps. Active step highlighted.

```
( 1 ) ── ( 2 ) ── [ 3 ] ── ( 4 )
 Cart    Address  Payment  Done
```
- `steps` — pipe-list.
- `active=N`.

```
element stepper 0 0 320 56 steps="Cart|Address|Payment|Done" active=2
```

### `carousel` — 320 × 180
Wide media area with dots / arrows.

```
‹  ┌──────────────┐  ›
   │   Slide N    │
   └──────────────┘
       • ● • •
```
```
element carousel 0 0 320 180 slides=4 active=1
```

### `popover` — 220 × 120
Floating bubble with a small tail. Like `tooltip` but bigger and not always above.

```
┌────────────────┐
│ Popover content│
└────╲╱──────────┘
```
```
element popover 0 0 220 120 "Did you know…"
```

### `kbd` — 36 × 22
Keyboard key cap.

```
[ ⌘K ]
```
```
element kbd 0 0 36 22 "⌘K"
```

### `quote` — 320 × 100
Indented blockquote with a left bar and an opening quotation mark glyph.

```
"
│ A pull quote runs here,
│ wrapping multiple lines.
"
```
```
element quote 0 0 320 100 "Wireframes look like sketches, not high-fidelity comps."
```

### `status-dot` — 12 × 12
Single colored dot (live status indicator). Usually paired with a label nearby.

```
●
```
```
element status-dot 0 0 12 12
```

### `notification-bell` — 32 × 32
Bell glyph with an optional red number badge.

```
🔔(3)
```
```
element notification-bell 0 0 32 32 "3"
```

### `mention` — 90 × 22
Filled pill that reads like `@name`. Used inside chat bubbles or text bodies.

```
@name
```
```
element mention 0 0 90 22 "@jane"
```

### `ai-suggestion` — 320 × 60
Gradient-ish suggestion strip with a small AI glyph + the suggestion text.

```
✨ Try: summarize this thread
```
```
element ai-suggestion 0 0 320 60 "Try: summarize this thread"
```

### `presence-cursor` — 18 × 18
A pointer arrow with a small name label — the "someone else is here" marker.

```
↖ You
```
```
element presence-cursor 0 0 18 18 "Sara"
```

---

## Navigation / overlays

### `dropdown-menu` — 200 × 140
Drop-shadowed list of menu items. `---` is a separator. Items containing the word `delete` render red.

```
┌──────────────┐
│ Edit         │
│ Duplicate    │
├──────────────┤
│ Delete       │
└──────────────┘
```
- `items` — pipe-list, default `Edit|Duplicate|---|Delete`.

```
element dropdown-menu 0 0 200 140 items="Edit|Rename|---|Move to Archive"
```

### `tooltip` — 100 × 28
Dark pill with a small tail. Direction set by `arrow`.

```
[ Tooltip ]
     ▼
```
- `arrow=top|bottom|left|right`.

```
element tooltip 0 0 100 28 "Click to copy" arrow=bottom
```

### `toast` — 320 × 56
Dark filled pill with an accent dot + message. Slides in from the corner.

```
[ ● Toast notification        ]
```
- `variant=info|success|warn|error`.

```
element toast 0 0 320 56 "Saved." variant=success
```

---

## Feedback

### `spinner` — 32 × 32
Open-arc loading indicator.

```
  ⟳
```
```
element spinner 0 0 32 32
```

### `skeleton` — 240 × 80
Stacked grey rectangles mimicking a paragraph loading.

```
████████████████████████
████████████████████████
█████████████
```
- `lines=N` — default 3.

```
element skeleton 0 0 240 80 lines=4
```

---

## Data viz

### `chart-bar` — 240 × 160
Vertical bar chart. Comma-separated heights.

```
 █
 █ █
 █ █ █ █ █
```
- `data="3,5,2,7,4"`.

```
element chart-bar 0 0 240 160 data="3,5,2,7,4,6,3"
```

### `chart-line` — 240 × 160
Polyline over an x/y grid.

```
       ╱╲
   ╱╲ ╱  ╲
 ╱╲╱  ╲
```
- `data="3,5,2,7,4"`.

```
element chart-line 0 0 240 160 data="2,4,3,5,6,5,7"
```

### `chart-donut` — 180 × 180
Donut chart segments.

```
    ╭───╮
   ╱     ╲
  │   ◯   │
   ╲     ╱
    ╰───╯
```
- `data="40,30,20,10"`.

```
element chart-donut 0 0 180 180 data="40,30,20,10"
```

### `chart-area` — 240 × 160
Filled area chart. Same data format as `chart-line`.

```
   ▁▂▃▆▇█▆▅
```
```
element chart-area 0 0 240 160 data="2,4,3,5,6,5,7"
```

### `chart-sparkline` — 140 × 40
Compact inline line — for use in a table cell or metric tile.

```
 ╱╲╱╲╱╲
```
```
element chart-sparkline 0 0 140 40 data="1,3,2,4,3,5"
```

### `gantt` — 320 × 180
Horizontal bar timeline.

```
Task A  ▓▓▓▓▓
Task B      ▓▓▓▓▓▓▓
Task C            ▓▓▓
```
```
element gantt 0 0 320 180 tasks=5
```

### `heatmap` — 240 × 160
Grid of colored squares; intensity varies.

```
■ ▣ ▣ ■ ▣
▣ ■ ■ ▣ ▣
▣ ▣ ■ ■ ▣
```
```
element heatmap 0 0 240 160
```

### `map` — 280 × 180
Stylized geographic shape with a pin.

```
┌─────────────────┐
│   . . ▾  .      │
│ .         .  .  │
└─────────────────┘
```
```
element map 0 0 280 180
```

### `code-diff` — 320 × 200
Side-by-side or unified diff blocks. Red `-` lines and green `+` lines.

```
- const x = 1
+ const x = 2
  const y = 3
```
```
element code-diff 0 0 320 200
```

---

## Mobile chrome

### `phone-frame` — 320 × 600
Outline of a phone with a notch/island. Wrap your mobile screens inside one of these.

```
 ╭────╮
 │ ── │  ← notch
 │    │
 │    │
 ╰────╯
```
- `model=iphone|android|generic`.

```
element phone-frame 0 0 320 600 model=iphone
```

### `status-bar` — 320 × 24
Time on the left, battery / signal glyphs on the right.

```
9:41                       ●●●●● 🔋
```
```
element status-bar 0 0 320 24
```

### `home-indicator` — 320 × 8
Small dark bar at the bottom of a mobile screen.

```
       ─────
```
```
element home-indicator 0 0 320 8
```

### `fab` — 56 × 56
Floating action button (circular).

```
( + )
```
```
element fab 0 0 56 56 "+"
```

### `app-icon` — 72 × 96
Rounded square with a colored fill + glyph, label underneath. Optional notification badge.

```
┌──┐
│ A│
└──┘
 App
```
- `bg="#hex"`, `glyph="…"`, `badge=N`.

```
element app-icon 0 0 72 96 "Mail" bg=#3b82c4 glyph="✉" badge=12
```

---

## System chrome

### `window-frame` — 400 × 300
Desktop window outline with a title bar and traffic-light buttons on the left.

```
┌● ● ● Title ────────┐
│                    │
│                    │
└────────────────────┘
```
```
element window-frame 0 0 400 300 "Settings"
```

### `browser-frame` — 480 × 320
Like `window-frame` but with an address bar.

```
┌● ● ● ──────────────┐
│ [ example.com    ] │
│                    │
└────────────────────┘
```
- `url="…"`.

```
element browser-frame 0 0 480 320 url="example.com"
```

### `terminal` — 400 × 240
Dark monospace background with a prompt glyph.

```
┌────────────────────┐
│ $ ls               │
│ file.txt           │
│ $ _                │
└────────────────────┘
```
- `prompt="…"`.

```
element terminal 0 0 400 240 "$ ls\nfile.txt\nfolder/\n$ "
```

---

## AR / spatial

These are aspirational — the parser accepts them and the renderer paints a stylized placeholder. Use when sketching XR / Vision Pro / Quest layouts.

### `glass-window` — 300 × 200
Frosted-glass rectangle (light translucent fill, soft edges).

```
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
╎  glass panel ╎
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```
```
element glass-window 0 0 300 200 "Quick controls"
```

### `gaze-cursor` — 32 × 32
A ring with a center dot — "you're looking here".

```
  ◎
```
```
element gaze-cursor 0 0 32 32
```

### `pinch-indicator` — 60 × 60
Two facing arcs implying a pinch gesture.

```
 ▷ ◁
```
```
element pinch-indicator 0 0 60 60
```

### `volumetric-scene` — 300 × 200
A 3D-looking cube outline with axis lines.

```
   ┌──────────┐
  ╱│         ╱│
 ┌──────────┐ │
 │ │        │ │
 │ └────────│─┘
 │╱         │╱
 └──────────┘
```
```
element volumetric-scene 0 0 300 200
```

### `passthrough-frame` — 320 × 200
Outline that implies "real world visible inside" — used to indicate AR passthrough zones.

```
┃ ┌──────────────┐ ┃
┃ │   (world)    │ ┃
┃ └──────────────┘ ┃
```
```
element passthrough-frame 0 0 320 200
```

### `voice-input` — 280 × 56
Microphone glyph + waveform line + label.

```
🎙  ╱╲╱╲╱╲╱╲   "Listening…"
```
```
element voice-input 0 0 280 56 "Listening…"
```
