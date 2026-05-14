---
slug: "appshell-with-actions"
kind: "shell"
title: "appshell-with-actions — navbar + actions slot"
summary: "Desktop shell variant — adds a named `actions` slot for navbar right-side controls (search, avatar, bell)."
---

Adds a named slot to the desktop shell for navbar action items (like a search bar and avatar) the call site can supply:

```boceto
component appshell-with-actions(title, navItems)
  element navbar  0  0 1000 44 "$title" items="$navItems"
  slot actions                                  # navbar right side, overlayed
  element sidebar 0 44 220 556 "" items="$navItems"
  slot                                          # main content
end
```

```boceto
element appshell-with-actions 0 0 1000 600 "" title="Acme" navItems="Users|Settings|Billing" :
  slot actions
    element search       620 6 240 32 "Search…"
    element avatar       870 6  32 32 "JD"
    element notification-bell 920 6 32 32 ""
  end
  element heading 252 70 720 32 "Dashboard"
  element chart-bar 252 110 720 400 "" data="3,5,2,7,4,6,5"
end
```
