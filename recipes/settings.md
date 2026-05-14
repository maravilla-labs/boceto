---
slug: "settings"
kind: "mockup"
title: "Settings screen, grouped sections"
size: "800 × 700"
summary: "Sidebar nav + Profile section (name/email/avatar) + Preferences switches + Save/Cancel row."
---

```boceto:Settings
element navbar 0 0 800 44 "Settings"
element sidebar 0 44 200 656 "" items="Profile|Account|Notifications|Privacy|Billing" active=0

element heading 232 70 540 32 "Profile"
element divider 232 110 540 1

element label 232 130 100 22 "Display name"
element input 232 156 540 36 "Jane Doe"

element label 232 210 100 22 "Email"
element input 232 236 540 36 "jane@example.com"

element label 232 290 100 22 "Avatar"
element avatar 232 316 48 48
element button 296 322 120 36 "Upload"
element button 424 322 120 36 "Remove"

element heading 232 392 540 28 "Preferences"
element divider 232 432 540 1

element label 232 450 200 22 "Email notifications"
element switch 720 450 56 24 on=true

element label 232 490 200 22 "Public profile"
element switch 720 490 56 24 on=false

element label 232 530 200 22 "Two-factor auth"
element switch 720 530 56 24 on=true

element divider 232 580 540 1
element button 600 596 80 36 "Cancel"
element primary-button 692 596 80 36 "Save"
```
