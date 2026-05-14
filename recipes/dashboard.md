---
slug: "dashboard"
kind: "mockup"
title: "Analytics dashboard"
size: "1000 × 600"
summary: "Navbar + sidebar + three KPI cards with sparklines, then a bar chart, donut, and recent-activity table."
---

```boceto:Dashboard
element navbar 0 0 1000 44 "Analytics" items="Reports|Settings|Logout"
element sidebar 0 44 220 556 "Navigation" items="Overview|Sales|Users|Reports|Settings" active=0
element heading 252  72 700 32 "Overview"
element label   252 108 700 22 "Last 30 days"

element card 252 140 220 100 "Revenue"
element heading 264 168 200 28 "$48,210" fontSize=24
element chart-sparkline 264 200 200 30 data="2,4,3,5,6,5,7,8"

element card 488 140 220 100 "Active users"
element heading 500 168 200 28 "12,408" fontSize=24
element chart-sparkline 500 200 200 30 data="3,3,4,5,5,6,7,8"

element card 724 140 220 100 "Conversion"
element heading 736 168 200 28 "3.2%" fontSize=24
element chart-sparkline 736 200 200 30 data="2,4,3,3,4,5,4,5"

element heading 252 260 700 24 "Sales by region"
element chart-bar 252 290 460 220 data="34,45,28,52,41,38,49"
element chart-donut 740 290 220 220 data="42,28,18,12"

element heading 252 524 700 24 "Recent activity"
element table 252 548 700 0 headers="When|User|Action" data="9:14|Alice|Created report;9:08|Bob|Updated dash;8:51|Carol|Logged in"
```
