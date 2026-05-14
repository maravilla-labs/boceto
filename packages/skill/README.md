# @boceto/skill

AI-assistant authoring instructions for the [Boceto wireframe DSL](https://github.com/maravilla-labs/boceto). Teaches Claude (and other coding assistants) the DSL grammar, layout rules, components-first authoring, and the literate component-documentation pattern — so the AI can sketch wireframes that render correctly first try.

This package ships **content only** — `SKILL.md` plus a handful of reference files. The CLI that installs them into your AI tool of choice is the separate [`boceto`](https://www.npmjs.com/package/boceto) package.

## Install

Use the unified Boceto CLI:

```sh
npx boceto add skill                    # interactive picker
npx boceto add skill claude             # .claude/skills/boceto/
npx boceto add skill cursor             # .cursor/rules/boceto.mdc
npx boceto add skill cline              # .clinerules/
npx boceto add skill windsurf           # .windsurfrules
npx boceto add skill aider              # BOCETO.md
npx boceto add skill copilot            # .github/copilot-instructions.md
npx boceto add skill codex              # AGENTS.md (cross-agent — OpenAI Codex, Sourcegraph Cody, agentsmd.dev)
npx boceto add skill gemini             # GEMINI.md (Gemini CLI / Code Assist)
npx boceto add skill raw                # ./boceto-skill/ (you handle it)
```

Or — recommended for MCP-aware assistants — run **`npx boceto add mcp`** to install the MCP server *and* the matching skill for your AI client in one shot. The skill is what triggers the agent to use the MCP tools; installing MCP without the skill gives the agent tools it doesn't know to call.

### Migrating from `@boceto/skill@0.2.x`

The published bin (`npx @boceto/skill install …`) is gone as of 0.3.0. Use `npx boceto add skill …` instead — same 12 targets, same on-disk layouts, plus a few new features (smart-routing, `--from-git`, `--name`).

## What's bundled

- `skill/SKILL.md` — entry point. Always-loaded teaching: trigger phrases, the non-negotiables (six-slot rule, canonical types, integers + quoted labels, components-first), the hallucination map, MCP-aware authoring flow.
- `skill/references/grammar.md` — tokens, escapes, IDs, attributes, multi-page docs.
- `skill/references/layout.md` — full flex semantics for power users.
- `skill/references/component-doc-pattern.md` — the literate output pattern for composite components.

The element catalog and recipes live behind the [`@boceto/mcp`](https://www.npmjs.com/package/@boceto/mcp) server's `boceto_list_elements`, `boceto_describe_element`, `boceto_list_recipes`, and `boceto_read_recipe` tools — fetched on demand instead of carried in every chat.

## Try it

Once installed, ask your AI:

> "Sketch a wireframe for a settings page with three sections."

> "Add a search bar at the top of this `​```boceto` block."

> "Define a reusable pricing-card composite and place three tiers in a row."

The AI should respond with one or more fenced `​```boceto` blocks that parse cleanly via `@boceto/core` and render via `<boceto-view>` or `@boceto/remark`.

## Want to know more about Boceto?

- Website: https://maravilla-labs.github.io/boceto/
- DSL spec: [spec/boceto-spec.md](https://github.com/maravilla-labs/boceto/blob/main/spec/boceto-spec.md)
- Web components: `<boceto-view>` (read-only renderer), `<boceto-edit>` (interactive editor)
- npm: `boceto` (CLI) · `@boceto/mcp` (MCP server) · `@boceto/lint` (linter) · `@boceto/core` · `@boceto/view` · `@boceto/edit` · `@boceto/remark` · `@boceto/markdown-it` · `@boceto/react` · `@boceto/vue` · `@boceto/svelte`

## License

MIT © Maravilla Labs
