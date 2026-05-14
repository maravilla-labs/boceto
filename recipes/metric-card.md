---
slug: "metric-card"
kind: "shell"
title: "metric-card — label + big number"
summary: "Composite component: card + small label + big numeric heading. KPI tile for dashboards."
---

```boceto
component metric-card(label, value)
  element card 0 0 220 90 ""
  element label    16 14 188 18 "$label"
  element heading  16 36 188 36 "$value" fontSize=26
end
```

Now three metric tiles on a dashboard become three short lines:

```boceto
element metric-card 232 110 220 90 "" label="Revenue"        value="$48.2k"
element metric-card 470 110 220 90 "" label="Active users"   value="12,408"
element metric-card 708 110 220 90 "" label="Conversion"    value="3.2%"
```
