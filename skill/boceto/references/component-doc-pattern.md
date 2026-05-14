---
title: Component documentation pattern
summary: How to present a Boceto component to the user — definition, example, and cross-references in literate markdown.
---

# Component documentation pattern

When you produce a Boceto **composite component** for the user (a `component foo(...)` definition), don't just dump the definition into a fenced block and move on. Wrap each component in a small markdown section that lets the user read it like documentation:

1. A `##` heading with the component name.
2. One or two sentences describing what the component is and when to use it.
3. A fenced `​```boceto` block containing the **definition** alone.
4. A short **Example usage** sentence followed by another fenced `​```boceto` block that shows the component being called with realistic data.
5. A **Used in:** line cross-referencing any places the component appears (other files, sections, or "(unused yet)").

This style turns a wireframe component into something the user can scan, copy, and revise without re-reading your full chat reply.

## Why this matters

A Boceto component is reusable by design — naming the shape is what makes the next edit a one-liner. But a definition alone is hard to read: the user has to translate `(title, navItems)` and a body of absolute coords into a mental picture. Pairing every definition with a worked example is what makes the user immediately understand the shape *and* learn how to call it.

Inline cross-references ("Used in: pricing-page.md § Pricing") matter when you're producing multiple components or laying them out across multiple sections — they prevent the "is this still used?" question that kills the reusability promise.

## One critical rule — definitions appear once

A `component foo(…) … end` definition **appears in exactly one fenced block per page** — the definition block. The example-usage block and any downstream mockup blocks **call the component by name** (`element foo 0 0 W H "" …`) but do **not** re-paste its definition. The parser collects component definitions across every fence in the page, so repeating the definition fails with `Duplicate component definition: "foo"`.

If your output has 3 fenced blocks — definition, example, and "here's a full page using it" — only the first one should contain `component foo(…) … end`. The other two reference it.

This is the single most common defect when applying the literate pattern. Guard against it: before you produce the example block, ask yourself *"have I already defined this component above?"* — if yes, the example block contains only call sites.

## The template

```markdown
## component-name

A short description of what this component is and when to reach for it. One or two sentences — keep it tight.

​```boceto
component component-name(arg1, arg2)
  …definition body…
end
​```

**Example usage:**

​```boceto
element component-name 0 0 W H "" arg1="…" arg2="…" :
  …slot fills, if any…
end
​```

**Used in:** `file.md` § Section · `other-file.md` § Other section
```

## Worked example

## pricing-card

A tiered-pricing card with a title, price, feature list slot, and a CTA button. Use for marketing landing pages with 2–4 plans side by side.

```boceto
component pricing-card(title, price, cta)
  col padding=16 gap=12
    element heading 0 0 200 28 "$title"
    element heading 0 0 200 36 "$price"
    slot
    element primary-button 0 0 200 36 "$cta"
  end
end
```

**Example usage:**

```boceto
element pricing-card 0 0 240 320 "" title="Pro" price="$29/mo" cta="Sign up" :
  element list 0 0 200 80 "" items="Feature A|Feature B|Feature C"
end
```

**Used in:** `pricing-page.md` § Plans · `marketing-shell.md` § Feature comparison · *(also viable for billing-management.md if a 4th plan is added later)*

---

## When you're producing multiple components

Group them under a single `# Components` header, one `##` block each. Keep the rest of the mockup (page-level DSL that calls these components) in a separate `# Mockup` section below — that way the user can re-read the components without scrolling through the page body, and re-read the page without scrolling through the components.

If a component is only used once and is unlikely to be reused, you don't need to componentize it — inline DSL is fine, and the literate doc pattern is wasted on it. Reach for the pattern when:

- The component will be called 3+ times on this page, or
- The user explicitly asked for a reusable composite, or
- The component is a "category of screen" shell (appshell, phoneshell, dialog, panel, …) that the user will fill differently in different places.

## When **not** to use this pattern

A one-off mockup ("draw me a login screen") doesn't need component documentation — it's not reusable, it doesn't need a name, and the literate pattern would be ceremony. Use the pattern only when there's a `component` declaration in the output, not for every Boceto block.

## Inline help

If you have the `boceto` MCP server connected and the user asks you to extend an existing component, call `boceto_describe_element(type)` on any built-in elements you reference, and `boceto_read_recipe(slug)` if the component is patterned after one of the shipped recipes (`appshell`, `dialog`, `kanban-column`, …) — that gives you the canonical structure to extend without copy-pasting from memory.
