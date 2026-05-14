# `@boceto/mcp`

MCP server for Boceto. Gives any AI client (Claude Desktop, Cursor, Cline, …) a runtime
feedback loop for authoring Boceto wireframes: parse, lint, autofix, render-svg, and
catalog tools — plus the entire `@boceto/skill` content and the formal spec exposed as
MCP resources.

## Install (recommended)

```sh
npx boceto add mcp                    # interactive — picks the right config for your AI client
npx boceto add mcp claude-code        # ~/.claude.json
npx boceto add mcp cursor             # ~/.cursor/mcp.json
npx boceto add mcp claude-desktop     # platform-aware (macOS / Windows / Linux)
```

The CLI merges the `mcpServers.boceto` entry into your client's existing config without clobbering other servers or settings. See [`boceto`](https://www.npmjs.com/package/boceto) for full flags (`--force`, `--skip-if-exists`, `--local`, `--name`).

For setup that also installs the authoring skill in one go: `npx boceto init`.

<details>
<summary><strong>Install (manual)</strong> — edit JSON yourself</summary>

Add one entry to your MCP client config (`~/.claude.json` / `~/.cursor/mcp.json` /
`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "boceto": {
      "command": "npx",
      "args": ["-y", "@boceto/mcp"]
    }
  }
}
```

`npx` will pull the latest published version on first run.

</details>

## Tools

| Tool                      | Purpose                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| `boceto_parse`            | Parse DSL → structured doc, or surface a parse error with `line`.        |
| `boceto_lint`             | Full linter output: per-issue `line` + `column` + `endColumn` + autofix. |
| `boceto_fix`              | Convenience wrapper — returns the autofixed source directly.             |
| `boceto_render_svg`       | Render a page to a self-contained SVG string (Yoga flex applied).        |
| `boceto_list_elements`    | Every supported element type, grouped by category, with defaults.        |
| `boceto_describe_element` | One element's attribute schema + defaults.                               |

## Resources

| URI                                       | Content                                            |
| ----------------------------------------- | -------------------------------------------------- |
| `boceto://skill/SKILL.md`                 | Top-level skill instructions.                      |
| `boceto://skill/references/grammar.md`    | Formal token grammar.                              |
| `boceto://skill/references/elements.md`   | 83-element catalog with ASCII previews.            |
| `boceto://skill/references/layout.md`     | Flex containers, auto/grow, alignment.             |
| `boceto://skill/references/components.md` | Composite components (positional + named slots).   |
| `boceto://skill/references/recipes.md`    | Hand-picked authoring recipes.                     |
| `boceto://spec/boceto-spec.md`            | The formal DSL specification (authoritative).      |

## Local dev

```sh
pnpm --filter @boceto/mcp build
node packages/mcp/dist/server.js  # spawns on stdio
```

To use the local build in Claude Code, point the `mcpServers` config at it directly:

```json
{
  "mcpServers": {
    "boceto": {
      "command": "node",
      "args": ["packages/mcp/dist/server.js"],
      "cwd": "/absolute/path/to/boceto"
    }
  }
}
```
