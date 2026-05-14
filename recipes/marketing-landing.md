---
slug: "marketing-landing"
kind: "mockup"
title: "Marketing landing page"
size: "1100 × 800"
summary: "Hero (heading + tagline + buttons) + supporting illustration block + features row of three cards."
---

```boceto:Landing
element navbar 0 0 1100 56 "MyProduct" items="Pricing|Docs|Blog|Sign in"

element heading 200 120 700 48 "Wireframes that ship" fontSize=42 textAlign=center
element label   200 180 700 28 "Tiny DSL, hand-drawn output, code-friendly diffs." textAlign=center fontSize=16

element primary-button 420 230 130 44 "Get started"
element button 560 230 130 44 "Read docs"

element image 200 310 320 200 "Hero illustration"
element heading 560 320 340 32 "Built for collaboration" fontSize=22
element label   560 360 340 22 "Boceto lives in markdown. Every PR carries its wireframes inline. No more screenshots in Notion."
element label   560 410 340 22 "Diff-friendly. Search-friendly. Versionable like code."

element divider 200 550 700 1
element heading 200 580 700 32 "Features" textAlign=center

element card 200 620 220 140 "Tiny"
element label 220 660 200 22 "Single small bundle, no plugins, no theme system."
element label 220 690 200 22 "Drops into any markdown pipeline."

element card 440 620 220 140 "Sketchy"
element label 460 660 200 22 "Defaults to wobbly hand-drawn strokes."
element label 460 690 200 22 "Keeps reviews focused on layout, not pixels."

element card 680 620 220 140 "Code-first"
element label 700 660 200 22 "Authored as plain text. Renders with one tag."
element label 700 690 200 22 "Versionable, searchable, diff-able."
```
