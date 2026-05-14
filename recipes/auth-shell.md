---
slug: "auth-shell"
kind: "shell"
title: "auth-shell — centred card"
summary: "Composite component: navbar + centred card + slot. The call site supplies the form fields only."
---

```boceto
component auth-shell(brand)
  element navbar 0 0 600 44 "$brand"
  element card 100 90 400 340 ""
  slot
end
```

Call site only worries about the form fields, not the page chrome:

```boceto
element auth-shell 0 0 600 480 "" brand="MyApp" :
  element heading 120 110 360 32 "Welcome back"
  element input 120 160 360 36 "Email"
  element input 120 206 360 36 "Password"
  element primary-button 120 254 360 36 "Sign In"
  element button 120 302 360 30 "Forgot password?"
end
```
