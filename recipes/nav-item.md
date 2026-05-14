---
slug: "nav-item"
kind: "shell"
title: "nav-item — sidebar row with status dot"
summary: "Composite component for custom sidebar rows (the built-in sidebar uses items=; nav-item lets you add badges/sub-rows)."
---

If you need a sidebar with custom rows (the built-in `sidebar` uses `items=` but doesn't let you add badges or sub-rows), build it:

```boceto
component nav-item(label)
  element status-dot 12 8 8 8 ""
  element label      28 4 160 18 "$label"
end
```
