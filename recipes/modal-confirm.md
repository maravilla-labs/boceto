---
slug: "modal-confirm"
kind: "mockup"
title: "Modal dialog — confirm action"
size: "500 × 240"
summary: "Backdrop + centred modal with a destructive primary action and a Cancel beside it."
---

```boceto:ConfirmModal
element box 0 0 500 240 "" id=backdrop
element modal 60 30 380 180 "Delete project?"
element label 80 90 340 22 "This permanently deletes the project and all its files. This action cannot be undone."
element button 220 152 100 36 "Cancel"
element primary-button 330 152 100 36 "Delete"
```
