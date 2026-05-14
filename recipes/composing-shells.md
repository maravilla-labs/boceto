---
slug: "composing-shells"
kind: "shell"
title: "Composing shells: full dashboard"
summary: "Worked example combining appshell + metric-card to assemble a full dashboard in half the lines of the flat recipe."
---

```boceto
component appshell(title, navItems)
  element navbar  0  0 900 44 "$title"
  element sidebar 0 44 200 556 "" items="$navItems"
  slot
end

component metric-card(label, value)
  element card 0 0 220 90 ""
  element label    16 14 188 18 "$label"
  element heading  16 36 188 36 "$value" fontSize=26
end

element appshell 0 0 900 600 "" title="Analytics" navItems="Overview|Sales|Users|Settings" :
  element heading 232 70 660 28 "Overview"
  element metric-card 232 110 220 90 "" label="Revenue"      value="$48.2k"
  element metric-card 470 110 220 90 "" label="Active users" value="12,408"
  element metric-card 708 110 220 90 "" label="Conversion"   value="3.2%"
  element chart-bar  232 220 660 280 "" data="34,45,28,52,41,38,49"
  element table      232 520 660 60  "" headers="When|User|Action"
end
```

Compare this to the flat dashboard recipe earlier — same screen, half the lines, and "add another metric" or "add a sales section" is a one-line edit.
