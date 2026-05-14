# Boceto recipes — known-good starting mockups

Pattern-match against these when the user asks for a common screen. Each recipe is a self-contained fenced block that parses cleanly and renders well. Adapt them — change labels, swap elements, shift coordinates — rather than starting from scratch.

When you adapt a recipe, preserve its overall structure (navbar / heading / grid / actions) — that's what makes a screen "read" as the intended type.

---

## 1. Login screen — 600 × 360

```boceto:Login
element navbar       0   0 600 44 "MyApp"
element heading    100  90 400 32 "Welcome back"
element label      100 130 400 22 "Sign in to continue"
element input      100 170 400 36 "Email address"
element input      100 216 400 36 "Password"
element primary-button 100 264 400 36 "Sign In"
element button     100 312 196 30 "Forgot password?"
element button     304 312 196 30 "Register"
```

---

## 2. Signup form with terms — 600 × 500

```boceto:Signup
element navbar       0   0 600 44 "MyApp"
element heading    100  90 400 32 "Create account"
element input      100 140 400 36 "Full name"
element input      100 186 400 36 "Email"
element input      100 232 400 36 "Password"
element input      100 278 400 36 "Confirm password"
element checkbox   100 320 400 24 "I agree to the Terms of Service"
element checkbox   100 350 400 24 "Send me product updates"
element primary-button 100 390 400 36 "Sign up"
element label      100 436 400 22 "Already have an account?"
element button     100 460 400 30 "Log in"
```

---

## 3. Analytics dashboard — 1000 × 600

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

---

## 4. Mobile screen wrapped in a phone frame — 360 × 720

```boceto:Mobile
element phone-frame 0 0 360 720 "" model=iphone
element status-bar 20 12 320 24
element navbar 20 44 320 44 "Inbox"

element search 20 100 320 36 "Search"

element card 20 148 320 80 "Mom"
element label 32 180 296 22 "See you on Sunday at 2?"
element label 32 200 296 18 "9:14"

element card 20 240 320 80 "Slack"
element label 32 272 296 22 "@you in #design"
element label 32 292 296 18 "9:08"

element card 20 332 320 80 "GitHub"
element label 32 364 296 22 "PR #214 merged"
element label 32 384 296 18 "8:51"

element fab 288 632 56 56 "+"
element home-indicator 20 700 320 8
```

---

## 5. Modal dialog — confirm action — 500 × 240

```boceto:ConfirmModal
element box 0 0 500 240 "" id=backdrop
element modal 60 30 380 180 "Delete project?"
element label 80 90 340 22 "This permanently deletes the project and all its files. This action cannot be undone."
element button 220 152 100 36 "Cancel"
element primary-button 330 152 100 36 "Delete"
```

---

## 6. Settings screen with grouped sections — 800 × 700

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

---

## 7. Marketing landing page — 1100 × 800

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

---

## 8. Chat UI — 600 × 700

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

---

## 9. Onboarding stepper — 800 × 400

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

---

## 10. Pricing comparison — 1000 × 600

```boceto:Pricing
element heading 200 60 600 36 "Simple, scalable pricing" textAlign=center fontSize=32
element label 200 110 600 22 "Pick a plan. Upgrade or cancel anytime." textAlign=center

element card 80 160 280 380 "Starter"
element heading 100 200 240 28 "$0" fontSize=28
element label 100 240 240 22 "Free forever"
element divider 100 280 240 1
element label 100 300 240 22 "✓ 1 user"
element label 100 326 240 22 "✓ 3 projects"
element label 100 352 240 22 "✓ Community support"
element button 100 480 240 36 "Get started"

element card 360 160 280 380 "Team"
element heading 380 200 240 28 "$29" fontSize=28
element label 380 240 240 22 "/seat/month"
element divider 380 280 240 1
element label 380 300 240 22 "✓ Up to 25 users"
element label 380 326 240 22 "✓ Unlimited projects"
element label 380 352 240 22 "✓ Priority email support"
element primary-button 380 480 240 36 "Start free trial"

element card 640 160 280 380 "Enterprise"
element heading 660 200 240 28 "Custom" fontSize=28
element label 660 240 240 22 "Talk to us"
element divider 660 280 240 1
element label 660 300 240 22 "✓ SAML SSO"
element label 660 326 240 22 "✓ Audit logs"
element label 660 352 240 22 "✓ Dedicated support"
element button 660 480 240 36 "Contact sales"
```

---

## Templates and shells (composite components)

These are the **modular building blocks** — define them at the top of your block and call them like primitives. They keep page-level DSL short, give the user a vocabulary to extend ("add another metric card"), and concentrate styling tweaks in one place.

Define what you need, call it, fill in the gaps. Don't define a component you'll only call once — see "Quick decision guide" at the bottom of this file.

### `appshell` — desktop chrome (navbar + sidebar + content)

```boceto
component appshell(title, navItems)
  element navbar  0  0 900 44 "$title"
  element sidebar 0 44 200 556 "" items="$navItems"
  slot
end
```

Call site fills the default slot with the page-specific content:

```boceto
element appshell 0 0 900 600 "" title="My App" navItems="Pricing|Docs|Logout" :
  element heading 232 70 600 32 "Overview"
  element card 232 110 600 400 ""
end
```

The content elements use coordinates that account for the 200px sidebar + 44px navbar (so content starts at x=232 and y≥70).

### `phoneshell` — mobile chrome (phone-frame + status bar + nav + home indicator)

```boceto
component phoneshell(title)
  element phone-frame 0 0 360 720 "" model=iphone
  element status-bar 20 12 320 24 ""
  element navbar 20 44 320 44 "$title"
  slot
  element home-indicator 20 700 320 8 ""
end
```

Call site:

```boceto
element phoneshell 0 0 360 720 "" title="Inbox" :
  element search 20 100 320 36 "Search"
  element card   20 148 320 80 "Sarah"
  element card   20 240 320 80 "Slack"
  element card   20 332 320 80 "GitHub"
  element fab   288 632  56  56 "+"
end
```

### `auth-shell` — centered card on a blank page

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

### `metric-card` — small label + big number

```boceto
component metric-card(label, value)
  element card 0 0 220 90 ""
  element label    16 14 188 18 "$label"
  element heading  16 36 188 36 "$value" fontSize=26
end
```

Now three metric tiles on a dashboard become three short lines:

```boceto
element metric-card 232 110 220 90 "" label="Revenue"        value="$48.2k"
element metric-card 470 110 220 90 "" label="Active users"   value="12,408"
element metric-card 708 110 220 90 "" label="Conversion"    value="3.2%"
```

### `dialog` — header + body slot + actions slot

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

### `panel` — header bar + body + footer slot

For sidebar-like panels that need header chrome, a content area, and a footer row:

```boceto
component panel(title)
  element box      0   0 300 400 ""
  element heading 16  14 268  24 "$title"
  element divider 16  46 268   1 ""
  slot
  element divider 16 360 268   1 ""
  slot footer
end
```

```boceto
element panel 0 0 300 400 "" title="Filters" :
  element label    16  56 268 20 "Status"
  element checkbox 16  84 268 24 "Active"
  element checkbox 16 112 268 24 "Archived"
  element label    16 156 268 20 "Owner"
  element input    16 184 268 32 "Search…"
  slot footer
    element button         16 372 100 28 "Reset"
    element primary-button 184 372 100 28 "Apply"
  end
end
```

### `appshell-with-actions` — navbar (with right-side actions) + sidebar + content

Adds a named slot to the desktop shell for navbar action items (like a search bar and avatar) the call site can supply:

```boceto
component appshell-with-actions(title, navItems)
  element navbar  0  0 1000 44 "$title" items="$navItems"
  slot actions                                  # navbar right side, overlayed
  element sidebar 0 44 220 556 "" items="$navItems"
  slot                                          # main content
end
```

```boceto
element appshell-with-actions 0 0 1000 600 "" title="Acme" navItems="Users|Settings|Billing" :
  slot actions
    element search       620 6 240 32 "Search…"
    element avatar       870 6  32 32 "JD"
    element notification-bell 920 6 32 32 ""
  end
  element heading 252 70 720 32 "Dashboard"
  element chart-bar 252 110 720 400 "" data="3,5,2,7,4,6,5"
end
```

### `kanban-column` — header with actions slot + cards-stack slot

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

### `feature-card` — title + body, for marketing pages

```boceto
component feature-card(title, body)
  element card 0 0 280 200 ""
  element heading 16 16 248 32 "$title"
  element label   16 60 248 124 "$body"
end
```

### `nav-item` — sidebar row with icon dot + label

If you need a sidebar with custom rows (the built-in `sidebar` uses `items=` but doesn't let you add badges or sub-rows), build it:

```boceto
component nav-item(label)
  element status-dot 12 8 8 8 ""
  element label      28 4 160 18 "$label"
end
```

### Composing shells: full dashboard from the building blocks

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

## Quick decision guide

Use this when you start a new mockup:

- **The user asked for a one-off screen with unique content** → flat DSL, no components.
- **The user asked for a category of screen** ("a settings page", "a chat app", "a dashboard") → define a `*shell` component for the chrome, place concrete content inside.
- **The same shape appears 3+ times on this page or any page** → componentize it (`metric-card`, `feature-card`, `nav-item`, `pricing-tier`, …).
- **The user asks for an element type that doesn't exist** in `references/elements.md` → define a composite component named after what they asked for. Don't invent the type. Don't use the closest primitive without naming it — naming it is what makes the next edit one line.

## Patterns for adapting these

- **Resize**: stretch the whole page by adjusting the navbar/sidebar widths and recalculating the content x-origin (usually navbar/sidebar width + 32px gutter).
- **Add a section**: keep the existing y-coordinates and start your new section at the next available y. Typical section spacing is 40–60px between groups.
- **Mobile variants**: take a desktop recipe, wrap it in `element phone-frame 0 0 360 720`, shrink widths to ≤320, and stack columns vertically.
- **Component-ify**: when the recipe repeats a shape 3+ times (e.g. the 3 metric cards in Dashboard, the 3 plans in Pricing), define a `component` and call it three times — see `components.md`.

When in doubt, start from a recipe and edit. The DSL is short enough that 80% of "make me a wireframe for X" requests can be answered with a tweaked recipe in under 30 lines.
