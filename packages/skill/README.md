# @boceto/skill

AI-assistant authoring instructions for the [Boceto wireframe DSL](https://github.com/maravilla-labs/boceto). Teaches Claude (and other coding assistants) the full grammar, all 83 element types with ASCII renders, layout primitives, composite components, and battle-tested recipes — so the AI can sketch wireframes that render correctly first try.

The skill bundles the spec + element catalog as markdown, so any AI agent that reads "rules files" can use it.

## Install

```sh
# Interactive — picks the right format for your AI tool
npx @boceto/skill install

# Or be explicit:
npx @boceto/skill install claude        # .claude/skills/boceto/
npx @boceto/skill install cursor        # .cursor/rules/boceto.mdc
npx @boceto/skill install cline         # .clinerules/
npx @boceto/skill install windsurf      # .windsurfrules
npx @boceto/skill install aider         # BOCETO.md + .aider.conf.yml hint
npx @boceto/skill install copilot       # .github/copilot-instructions.md
npx @boceto/skill install codex         # AGENTS.md  (also: `agents` — picked up by OpenAI Codex, Sourcegraph Cody, agentsmd.dev tools)
npx @boceto/skill install gemini        # GEMINI.md  (Gemini CLI / Code Assist)
npx @boceto/skill install raw           # ./boceto-skill/ (point your tool at it)
```

The skill content is identical across targets — only file layout and frontmatter differ.

## Updating

```sh
# Refresh whatever's already installed in this project (auto-detected)
npx @boceto/skill update

# Fetch the very latest from github.com/maravilla-labs/boceto main branch,
# bypassing npm — useful for unreleased changes
npx @boceto/skill update --from-git

# Just check whether you're behind
npx @boceto/skill update --check
```

The vanilla `update` uses the version of `@boceto/skill` that `npx` fetched on this invocation — `npx` defaults to the latest version on each run, so you stay current without doing anything special. Use `--from-git` only when you want unreleased changes from `main`.

## What's in the skill

- **`SKILL.md`** — entry point. DSL summary, output contract, generic attributes, common pitfalls. Stays under 500 lines so the AI can keep it in context.
- **`references/grammar.md`** — file embedding forms, tokens, escape sequences, IDs, attributes, comments, element-as-container, multi-page docs.
- **`references/elements.md`** — all 83 element types grouped by category (Layout / Typography / Form / Media / Content / Navigation / Feedback / Data viz / Mobile / System / AR). Each with default size, type-specific attrs, and an ASCII sketch of how it renders.
- **`references/layout.md`** — `row` / `col` flex semantics, per-child flex attrs, `auto` sizing, element-as-container.
- **`references/components.md`** — composite definitions, parameter substitution, named slots, responsive shells, defaults.
- **`references/recipes.md`** — 10 self-contained mockup recipes (login, signup, dashboard, mobile, modal, settings, marketing site, chat, onboarding, pricing).

## Try it

Once installed, ask your AI:

> "Sketch a wireframe for a settings page with three sections."

> "Add a search bar at the top of this `​```boceto` block."

> "Mock up a Spotify-like mobile player."

The AI should respond with a fenced `​```boceto` block that parses cleanly via `@boceto/core` and renders via `<boceto-view>` or `@boceto/remark`.

## Want to know more about Boceto?

- Website: https://maravilla-labs.github.io/boceto/
- DSL spec: [spec/boceto-spec.md](https://github.com/maravilla-labs/boceto/blob/main/spec/boceto-spec.md)
- Web components: `<boceto-view>` (read-only renderer), `<boceto-edit>` (interactive editor)
- npm: `@boceto/core` · `@boceto/view` · `@boceto/edit` · `@boceto/remark` · `@boceto/markdown-it` · `@boceto/react`

## License

MIT © Maravilla Labs
