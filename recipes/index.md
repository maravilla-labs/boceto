---
slug: "index"
kind: "index"
title: "Boceto recipes — index + decision guide"
summary: "How to pick a recipe to start from. Listed by category with adaptation patterns at the end."
---

Pattern-match against these when the user asks for a common screen. Each recipe is a self-contained fenced block that parses cleanly and renders well. Adapt them — change labels, swap elements, shift coordinates — rather than starting from scratch.

When you adapt a recipe, preserve its overall structure (navbar / heading / grid / actions) — that's what makes a screen "read" as the intended type.

## Mockups (full pages)

- [Login screen](./login.md) — Email + password form with a primary Sign In, secondary Forgot/Register links, under a navbar.
- [Signup form with terms](./signup.md) — Name/email/password/confirm + ToS + product-updates checkboxes, primary Sign up, then a link to log in.
- [Analytics dashboard](./dashboard.md) — Navbar + sidebar + three KPI cards with sparklines, then a bar chart, donut, and recent-activity table.
- [Mobile screen in a phone frame](./mobile-phone-frame.md) — Phone frame with status bar, navbar, search, three notification cards, FAB, and home indicator.
- [Modal dialog — confirm action](./modal-confirm.md) — Backdrop + centred modal with a destructive primary action and a Cancel beside it.
- [Settings screen, grouped sections](./settings.md) — Sidebar nav + Profile section (name/email/avatar) + Preferences switches + Save/Cancel row.
- [Marketing landing page](./marketing-landing.md) — Hero (heading + tagline + buttons) + supporting illustration block + features row of three cards.
- [Chat UI](./chat.md) — Threads sidebar + active thread header + left/right chat bubbles + AI suggestion + composer.
- [Onboarding stepper](./onboarding-stepper.md) — Stepper across the top + workspace-name + slug inputs + Back / Continue actions.
- [Pricing comparison](./pricing-comparison.md) — Three plan cards (Starter / Team / Enterprise) with feature lists and a CTA each.

## Shells (reusable composite components)

- [appshell — desktop chrome](./appshell.md) — Composite component: navbar + sidebar + content slot. Lets the call site only worry about the page-specific content.
- [phoneshell — mobile chrome](./phoneshell.md) — Composite component: phone-frame + status bar + navbar + content slot + home indicator. Mobile shell.
- [auth-shell — centred card](./auth-shell.md) — Composite component: navbar + centred card + slot. The call site supplies the form fields only.
- [metric-card — label + big number](./metric-card.md) — Composite component: card + small label + big numeric heading. KPI tile for dashboards.
- [dialog — header + body + actions slots](./dialog.md) — Composite with two slots — default slot for body content, named slot `actions` for the bottom-right buttons.
- [panel — header + body + footer slot](./panel.md) — Composite with default slot (body) and named `footer` slot. For filter panels, settings panes, etc.
- [appshell-with-actions — navbar + actions slot](./appshell-with-actions.md) — Desktop shell variant — adds a named `actions` slot for navbar right-side controls (search, avatar, bell).
- [kanban-column — title + actions + cards](./kanban-column.md) — Composite kanban column with a top-level actions slot and a default slot for the cards stack. Works around the slot-nesting parser limit.
- [feature-card — title + body](./feature-card.md) — Composite component for marketing pages: a card with a heading and a body paragraph.
- [nav-item — sidebar row with status dot](./nav-item.md) — Composite component for custom sidebar rows (the built-in sidebar uses items=; nav-item lets you add badges/sub-rows).
- [Composing shells: full dashboard](./composing-shells.md) — Worked example combining appshell + metric-card to assemble a full dashboard in half the lines of the flat recipe.

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
