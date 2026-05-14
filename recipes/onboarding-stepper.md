---
slug: "onboarding-stepper"
kind: "mockup"
title: "Onboarding stepper"
size: "800 × 400"
summary: "Stepper across the top + workspace-name + slug inputs + Back / Continue actions."
---

```boceto:Onboarding
element navbar 0 0 800 44 "Set up MyApp"
element stepper 80 80 640 48 steps="Welcome|Team|Workspace|Integrations|Done" active=2

element heading 80 156 640 32 "Create your workspace"
element label 80 196 640 22 "We'll use this name in URLs and emails."

element label 80 240 100 22 "Workspace name"
element input 80 266 640 36 "Acme Inc"

element label 80 314 100 22 "Slug"
element input 80 340 640 36 "acme-inc"

element button 540 358 100 36 "Back"
element primary-button 650 358 100 36 "Continue"
```
