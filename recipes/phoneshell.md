---
slug: "phoneshell"
kind: "shell"
title: "phoneshell — mobile chrome"
summary: "Composite component: phone-frame + status bar + navbar + content slot + home indicator. Mobile shell."
---

```boceto
component phoneshell(title)
  element phone-frame 0 0 360 720 "" model=iphone
  element status-bar 20 12 320 24 ""
  element navbar 20 44 320 44 "$title"
  slot
  element home-indicator 20 700 320 8 ""
end
```

Call site:

```boceto
element phoneshell 0 0 360 720 "" title="Inbox" :
  element search 20 100 320 36 "Search"
  element card   20 148 320 80 "Sarah"
  element card   20 240 320 80 "Slack"
  element card   20 332 320 80 "GitHub"
  element fab   288 632  56  56 "+"
end
```
