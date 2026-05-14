---
slug: "dialog"
kind: "shell"
title: "dialog — header + body + actions slots"
summary: "Composite with two slots — default slot for body content, named slot `actions` for the bottom-right buttons."
---

Two slots: the default for the dialog message, named `actions` for the bottom-right buttons.

```boceto
component dialog(title)
  element box     0   0 400 220 ""
  element heading 20  16 360  28 "$title"
  element divider 20  50 360   1 ""
  slot
  element divider 20 168 360   1 ""
  slot actions
end
```

Call site fills both — body via bare children, actions inside a `slot actions … end`:

```boceto
element dialog 100 80 400 220 "" title="Confirm delete" :
  element label 20 64 360 90 "This will permanently delete the project. Are you sure?"
  slot actions
    element button         200 180  80 28 "Cancel"
    element primary-button 290 180  80 28 "Delete"
  end
end
```

The same `dialog` works for an info dialog (different label, different actions), a multi-step confirmation (a `stepper` in the body slot), a form modal (inputs in the body, "Save" / "Cancel" in actions). One component, many shapes.
