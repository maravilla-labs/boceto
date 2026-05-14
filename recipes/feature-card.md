---
slug: "feature-card"
kind: "shell"
title: "feature-card — title + body"
summary: "Composite component for marketing pages: a card with a heading and a body paragraph."
---

```boceto
component feature-card(title, body)
  element card 0 0 280 200 ""
  element heading 16 16 248 32 "$title"
  element label   16 60 248 124 "$body"
end
```
