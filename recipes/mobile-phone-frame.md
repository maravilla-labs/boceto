---
slug: "mobile-phone-frame"
kind: "mockup"
title: "Mobile screen in a phone frame"
size: "360 × 720"
summary: "Phone frame with status bar, navbar, search, three notification cards, FAB, and home indicator."
---

```boceto:Mobile
element phone-frame 0 0 360 720 "" model=iphone
element status-bar 20 12 320 24
element navbar 20 44 320 44 "Inbox"

element search 20 100 320 36 "Search"

element card 20 148 320 80 "Mom"
element label 32 180 296 22 "See you on Sunday at 2?"
element label 32 200 296 18 "9:14"

element card 20 240 320 80 "Slack"
element label 32 272 296 22 "@you in #design"
element label 32 292 296 18 "9:08"

element card 20 332 320 80 "GitHub"
element label 32 364 296 22 "PR #214 merged"
element label 32 384 296 18 "8:51"

element fab 288 632 56 56 "+"
element home-indicator 20 700 320 8
```
