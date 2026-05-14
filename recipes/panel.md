---
slug: "panel"
kind: "shell"
title: "panel — header + body + footer slot"
summary: "Composite with default slot (body) and named `footer` slot. For filter panels, settings panes, etc."
---

For sidebar-like panels that need header chrome, a content area, and a footer row:

```boceto
component panel(title)
  element box      0   0 300 400 ""
  element heading 16  14 268  24 "$title"
  element divider 16  46 268   1 ""
  slot
  element divider 16 360 268   1 ""
  slot footer
end
```

```boceto
element panel 0 0 300 400 "" title="Filters" :
  element label    16  56 268 20 "Status"
  element checkbox 16  84 268 24 "Active"
  element checkbox 16 112 268 24 "Archived"
  element label    16 156 268 20 "Owner"
  element input    16 184 268 32 "Search…"
  slot footer
    element button         16 372 100 28 "Reset"
    element primary-button 184 372 100 28 "Apply"
  end
end
```
