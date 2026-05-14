---
slug: "kanban-column"
kind: "shell"
title: "kanban-column — title + actions + cards"
summary: "Composite kanban column with a top-level actions slot and a default slot for the cards stack. Works around the slot-nesting parser limit."
---

The natural impulse is to wrap the column header in a `row` containing the title + an actions slot. **That doesn't parse** — `slot` markers must be direct top-level statements in the component body, never nested inside `row` / `col`. The pattern that works: place the title and the actions slot side-by-side using absolute coords at the top of the body, then list slots at the top level for the rest:

```boceto
component task-card(title, meta)
  element card    0  0 256 64 ""
  element heading 10  8 236 22 "$title" fontSize=16
  element label   10 34 236 22 "$meta"  fontSize=12
end

component kanban-column(title)
  element box     0   0 280 460 ""
  element heading 12 12 200 24 "$title" fontSize=18
  slot actions                              # actions slot at top-level
  element divider  0 44 280  1 ""
  slot                                      # default slot for the cards stack
end

# Three columns side by side
element kanban-column 20  20 280 460 "" title="Todo" :
  slot actions
    element button 236 12 32 24 "+"
  end
  element task-card 12  60 256 64 "" title="Draft spec"      meta="Owner: Ana"
  element task-card 12 132 256 64 "" title="Wireframe board" meta="Owner: Leo"
  element task-card 12 204 256 64 "" title="Pick palette"    meta="Owner: Mia"
end
```

(Two more `kanban-column` calls at x=310 and x=600 give you a 3-column board.) The actions slot lives at the top-level of the body. The call site positions its `+` button at `x=236` (the right edge of the column header). The default slot's task cards are positioned with absolute coords from the call site.
