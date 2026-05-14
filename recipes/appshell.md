---
slug: "appshell"
kind: "shell"
title: "appshell — desktop chrome"
summary: "Composite component: navbar + sidebar + content slot. Lets the call site only worry about the page-specific content."
---

```boceto
component appshell(title, navItems)
  element navbar  0  0 900 44 "$title"
  element sidebar 0 44 200 556 "" items="$navItems"
  slot
end
```

Call site fills the default slot with the page-specific content:

```boceto
element appshell 0 0 900 600 "" title="My App" navItems="Pricing|Docs|Logout" :
  element heading 232 70 600 32 "Overview"
  element card 232 110 600 400 ""
end
```

The content elements use coordinates that account for the 200px sidebar + 44px navbar (so content starts at x=232 and y≥70).
