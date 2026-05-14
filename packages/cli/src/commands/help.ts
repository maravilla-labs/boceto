const TOP = `boceto — unified install + configure CLI for the Boceto wireframe DSL

Usage
  boceto <command> [options]

Commands
  add <integration>  Install a skill target or wire an MCP client.
                     - boceto add mcp [client]        installs MCP server + matching skill
                     - boceto add skill [target]      installs just the skill (12 targets)
                     - boceto add <name>              smart-routes when the name is unambiguous
  check [--json]     Show what's installed where.
  list [skill|mcp]   List supported skill targets / MCP clients.
  help [command]     Show this help, or per-command help.

What \`boceto add mcp\` does
  - Writes the \`mcpServers.boceto\` entry into your AI client's config.
  - Auto-detects the client when exactly one config file already exists
    (otherwise prompts).
  - Co-installs the matching skill so the agent has both the always-loaded
    teaching and the runtime tool surface:
        claude-code    → skill in  .claude/skills/boceto/
        cursor         → skill in  .cursor/rules/boceto.mdc
        claude-desktop → skill in ~/.claude/skills/boceto/  (user-global)
  - Pass --skip-skill to install MCP only.

Flags
  --force, -f          Overwrite or replace instead of appending / prompting.
  --skip-if-exists     For \`add mcp\`: leave an existing entry untouched.
  --skip-skill         For \`add mcp\`: don't co-install the skill.
  --skill <target>     For \`add mcp\`: override the default skill pairing.
  --local              For \`add mcp\`: point at packages/mcp/dist/server.js (dev).
  --name <name>        For \`add mcp\`: server key in mcpServers (default \`boceto\`).
  --from-git           For \`add skill\`/\`add mcp\`: fetch latest from github.com/main.
  --json               For \`check\`: emit machine-parseable JSON.

Examples
  npx boceto add mcp                           # auto-detect or prompt; installs MCP + skill
  npx boceto add mcp claude-code               # explicit client
  npx boceto add mcp claude-code --skip-skill  # MCP only
  npx boceto add skill cursor                  # skill only — for assistants without MCP
  npx boceto check                             # what's installed where
`

export function printHelp(command?: string): void {
  // Per-command help can grow here later. For now the top-level layout is
  // detailed enough to answer most questions.
  void command
  console.log(TOP)
}
