---
slug: "chat"
kind: "mockup"
title: "Chat UI"
size: "600 × 700"
summary: "Threads sidebar + active thread header + left/right chat bubbles + AI suggestion + composer."
---

```boceto:Chat
element navbar 0 0 600 44 "Conversations"
element sidebar 0 44 200 656 "Threads" items="Sarah Doe|Project X|Eng team|Mom" active=1

element heading 220 60 360 24 "Project X"
element label   220 84 360 18 "Sarah · Bob · Carol · You"

element chat-bubble 220 116 280 56 "Did you push the dashboard branch?" side=left
element chat-bubble 320 184 280 56 "Yes — running CI now. Look at #214." side=right
element chat-bubble 220 252 280 60 "Got it. One question on the donut spacing — saw a 2px gap on the right." side=left
element chat-bubble 320 328 280 60 "Looks like a clipPath issue. I'll patch in v0.3." side=right

element ai-suggestion 220 414 360 60 "Try: summarize this thread"

element divider 220 484 360 1
element input 220 504 280 36 "Type a message…"
element primary-button 504 504 76 36 "Send"
```
