import { c } from '../ui/colors'
import type { ParsedArgs } from '../util/argv'
import { SKILL_TARGETS, SKILL_TARGET_IDS } from '../integrations/skill'
import { MCP_CLIENTS, MCP_CLIENT_IDS } from '../integrations/mcp'

/**
 * `boceto list [skill|mcp]` — emit one id per line when stdout is not a TTY
 * (so shells can pipe into `xargs`), pretty-print a small table when it is.
 */
export function runList(args: ParsedArgs): number {
  const group = args.positional[0]
  const tty = process.stdout.isTTY === true
  const showSkill = !group || group === 'skill'
  const showMcp = !group || group === 'mcp'

  if (!tty) {
    if (showSkill) {
      for (const id of SKILL_TARGET_IDS) console.log(id)
    }
    if (showMcp) {
      for (const id of MCP_CLIENT_IDS) console.log(id)
    }
    return 0
  }

  if (showSkill) {
    console.log(c.bold('Skill targets'))
    for (const id of SKILL_TARGET_IDS) {
      if (id === 'agents') continue
      const t = SKILL_TARGETS[id]
      console.log(`  ${id.padEnd(14)} ${c.dim(t.location)}`)
    }
    console.log('')
  }
  if (showMcp) {
    console.log(c.bold('MCP clients'))
    for (const id of MCP_CLIENT_IDS) {
      const m = MCP_CLIENTS[id]
      console.log(`  ${id.padEnd(14)} ${c.dim(m.shortPath())}`)
    }
  }
  return 0
}
