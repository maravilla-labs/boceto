# `boceto` — unified install + configure CLI

One command to wire up the Boceto authoring skill + the MCP server for your AI tools, modelled after Svelte's `sv add` pattern.

```sh
npx boceto add mcp               # auto-detects your AI client; installs MCP + matching skill
npx boceto add mcp claude-code   # explicit — claude-code | cursor | claude-desktop
npx boceto add skill cursor      # skill only — for assistants without MCP support
npx boceto check                 # what's installed where?
```

## What it does

**`boceto add mcp` is the headline command.** It writes the `mcpServers.boceto` entry into your AI client's config file AND co-installs the matching skill at the location your client auto-loads from. The skill is what triggers the agent to reach for the MCP tools (`boceto_lint`, `boceto_list_recipes`, `boceto_render_svg`, …) and what teaches the non-negotiables (six-slot rule, canonical types, components-first authoring, the literate output pattern). Without the skill, MCP alone gives the agent tools it doesn't know to call.

Auto-detection: if exactly one MCP client config exists in `~/`, `add mcp` picks it without prompting.

| MCP client (`add mcp <client>`) | Config file | Skill co-installed at |
|---|---|---|
| `claude-code` | `~/.claude.json` | `.claude/skills/boceto/` |
| `cursor` | `~/.cursor/mcp.json` | `.cursor/rules/boceto.mdc` |
| `claude-desktop` | platform-aware | `~/.claude/skills/boceto/` (user-global) |

`boceto add skill <target>` is the standalone path for assistants that don't speak MCP yet — Aider (`BOCETO.md`), GitHub Copilot (`.github/copilot-instructions.md`), OpenAI Codex / AGENTS.md, Gemini CLI, Cline, Windsurf, plus claude-user (user-global) and a raw file dump.

## Safety

The MCP config writer handles user data carefully:

- **Atomic writes** — staged to a `.boceto.tmp` then renamed. Half-written `~/.claude.json` files would brick Claude Code; renames are all-or-nothing.
- **Sibling-key preserving merge** — your API keys, project history, and other `mcpServers` entries are untouched.
- **Never overwrite malformed JSON** — bails with a clear error rather than risking data loss.
- **Existing-entry handling** — `--force` / `--skip-if-exists` / default-prompt.

## Flags

- `--force` / `-f` — overwrite instead of prompting / appending.
- `--skip-skill` (mcp) — install the MCP server only; skip the co-installed skill.
- `--skill <target>` (mcp) — override the default client→skill pairing.
- `--from-git` — fetch the latest skill markdown from `github.com/maravilla-labs/boceto`'s `main` branch.
- `--local` (mcp) — write `node + abs path to packages/mcp/dist/server.js` instead of `npx -y @boceto/mcp` (dev convenience).
- `--name <key>` (mcp) — server key in `mcpServers` (default `boceto`).
- `--skip-if-exists` (mcp) — leave an existing entry untouched.
- `--json` (check) — emit machine-parseable JSON.

## Test overrides

`BOCETO_CLAUDE_CODE_CONFIG`, `BOCETO_CURSOR_CONFIG`, and `BOCETO_CLAUDE_DESKTOP_CONFIG` redirect config paths — used by tests and by the dry-run smoke script.
