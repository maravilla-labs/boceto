import { existsSync } from 'node:fs'
import { fail, info, ok } from '../ui/log'
import { c } from '../ui/colors'
import { getBool, getString, type ParsedArgs } from '../util/argv'
import {
  fetchSkillFromGit,
  findSkillTarget,
  installSkill,
  resolveSkillRoot,
  SKILL_TARGETS,
  type SkillTargetId,
} from '../integrations/skill'
import { pickSkillTarget } from '../integrations/skill/interactive'
import {
  findMcpClient,
  installMcp,
  MCP_CLIENTS,
  MCP_CLIENT_IDS,
  type McpClientId,
  type WriteMode,
} from '../integrations/mcp'
import {
  confirmReplaceServerEntry,
  pickMcpClient,
} from '../integrations/mcp/interactive'
import { printHelp } from './help'

/**
 * `boceto add <integration> [target] [flags]`
 *
 *   boceto add skill [target]      → install skill alone
 *   boceto add mcp   [client]      → install MCP config AND the paired skill
 *   boceto add claude              → smart-route to `add skill claude`
 *   boceto add claude-code         → smart-route to `add mcp claude-code`
 *   boceto add                     → print help
 *
 * Why `add mcp` installs the skill too: the MCP server gives the agent
 * runtime tools, but the skill markdown is what TRIGGERS the agent to use
 * them (Claude Code reads the skill's frontmatter to decide relevance)
 * and what teaches the non-negotiables (six-slot rule, canonical types,
 * components-first, literate output pattern). Without the skill installed
 * as project rules, MCP alone gives the agent tools it doesn't know to
 * call. Pass `--skip-skill` to opt out.
 */
export async function runAdd(args: ParsedArgs): Promise<number> {
  const [first, second] = args.positional
  if (!first) {
    printHelp('add')
    return 1
  }

  if (first === 'skill') {
    return runAddSkill(second, args)
  }
  if (first === 'mcp') {
    return runAddMcp(second, args)
  }

  // Smart-route bare target names.
  const isSkill = !!findSkillTarget(first)
  const isMcp = !!findMcpClient(first)
  if (isSkill && isMcp) {
    fail(
      `\`${first}\` is ambiguous — use \`boceto add skill ${first}\` or \`boceto add mcp ${first}\` explicitly.`,
    )
    return 1
  }
  if (isSkill) return runAddSkill(first, args)
  if (isMcp) return runAddMcp(first, args)

  fail(`unknown integration or target: ${first}`)
  info(`run \`boceto list\` to see available skill targets and MCP clients.`)
  return 1
}

// ── skill ────────────────────────────────────────────────────────────────

async function runAddSkill(
  targetArg: string | undefined,
  args: ParsedArgs,
): Promise<number> {
  let target = targetArg as SkillTargetId | undefined
  if (target == null) {
    const picked = await pickSkillTarget()
    if (picked == null) {
      fail('aborted, no changes made')
      return 1
    }
    target = picked
  }
  const t = findSkillTarget(target)
  if (!t) {
    fail(
      `unknown skill target: ${target}\n  valid: ${Object.keys(SKILL_TARGETS).join(', ')}`,
    )
    return 1
  }

  const force = getBool(args.flags, 'force', 'f')
  const fromGit = getBool(args.flags, 'from-git', 'bleeding')

  let skillRoot: string | undefined
  if (fromGit) {
    info(`fetching skill source from github.com/maravilla-labs/boceto…`)
    skillRoot = await fetchSkillFromGit()
    info(`fetched into ${skillRoot}`)
  } else {
    try {
      skillRoot = resolveSkillRoot()
    } catch (err) {
      fail((err as Error).message)
      return 1
    }
  }

  try {
    const result = await installSkill({
      target: t.id,
      cwd: process.cwd(),
      force,
      skillRoot,
    })
    if (result.status === 'skipped') {
      info(result.hint ?? `${result.destPath} already exists`)
    } else {
      ok(`skill ${result.status} → ${result.destPath}`)
      if (result.hint) info(result.hint)
    }
    return 0
  } catch (err) {
    fail(`skill install failed: ${(err as Error).message}`)
    return 1
  }
}

// ── mcp (with co-installed skill) ────────────────────────────────────────

/**
 * Default skill target for each MCP client. Picked so the skill lands
 * somewhere the AI client will auto-load it:
 *
 *   - claude-code   → claude       (project-local `.claude/skills/boceto/`)
 *   - cursor        → cursor       (`.cursor/rules/boceto.mdc`)
 *   - claude-desktop → claude-user (Desktop has no project-rules concept;
 *                                   ~/.claude/skills/ is the closest
 *                                   user-global equivalent, and it
 *                                   benefits any later Claude Code use too)
 */
const SKILL_FOR_CLIENT: Record<McpClientId, SkillTargetId> = {
  'claude-code': 'claude',
  cursor: 'cursor',
  'claude-desktop': 'claude-user',
}

/**
 * Look at each known MCP client config file. Return the list of clients
 * whose config already exists — used to auto-select when there's exactly
 * one obvious target so the user doesn't have to click through a picker.
 */
function detectExistingClients(): McpClientId[] {
  return MCP_CLIENT_IDS.filter((id) => existsSync(MCP_CLIENTS[id].configPath()))
}

async function runAddMcp(
  clientArg: string | undefined,
  args: ParsedArgs,
): Promise<number> {
  let client = clientArg as McpClientId | undefined

  // Auto-detect when no client is provided. Exactly one existing config →
  // use it without prompting (with a one-line log so the user knows what
  // happened). Zero or many → fall through to the interactive picker.
  if (client == null) {
    const found = detectExistingClients()
    if (found.length === 1) {
      client = found[0]!
      info(c.dim(`auto-detected: ${client} (${MCP_CLIENTS[client].shortPath()})`))
    } else {
      const picked = await pickMcpClient(found[0] ?? null)
      if (picked == null) {
        fail('aborted, no changes made')
        return 1
      }
      client = picked
    }
  }
  const matched = findMcpClient(client)
  if (!matched) {
    fail(
      `unknown MCP client: ${client}\n  valid: ${Object.keys(MCP_CLIENTS).join(', ')}`,
    )
    return 1
  }

  const force = getBool(args.flags, 'force', 'f')
  const skip = getBool(args.flags, 'skip-if-exists')
  const local = getBool(args.flags, 'local')
  const skipSkill = getBool(args.flags, 'skip-skill')
  const name = getString(args.flags, 'name') ?? 'boceto'
  const skillOverride = getString(args.flags, 'skill') as SkillTargetId | undefined
  const fromGit = getBool(args.flags, 'from-git', 'bleeding')
  const mode: WriteMode = force ? 'force' : skip ? 'skip' : 'prompt'

  // 1. Install the MCP server config.
  try {
    const result = await installMcp({
      client: matched.id,
      name,
      local,
      mode,
      confirmReplace: confirmReplaceServerEntry,
    })
    if (result.outcome === 'skipped') {
      info(`kept existing entry in ${result.configPath}`)
    } else {
      ok(`mcp ${result.outcome} → ${result.configPath}`)
    }
  } catch (err) {
    fail((err as Error).message)
    return 1
  }

  // 2. Co-install the matching skill (unless --skip-skill). The skill is
  //    what TRIGGERS the agent to reach for the MCP tools and what teaches
  //    the non-negotiables; MCP alone leaves the agent with tools it
  //    doesn't know to call.
  if (!skipSkill) {
    const skillTarget = skillOverride ?? SKILL_FOR_CLIENT[matched.id]
    let skillRoot: string | undefined
    if (fromGit) {
      info(`fetching skill source from github.com/maravilla-labs/boceto…`)
      try {
        skillRoot = await fetchSkillFromGit()
      } catch (err) {
        info(c.yellow(`skipped skill install: ${(err as Error).message}`))
        return 0
      }
    } else {
      try {
        skillRoot = resolveSkillRoot()
      } catch (err) {
        info(c.yellow(`skipped skill install: ${(err as Error).message}`))
        return 0
      }
    }
    try {
      const r = await installSkill({
        target: skillTarget,
        cwd: process.cwd(),
        force,
        skillRoot,
      })
      if (r.status === 'skipped') {
        info(`skill: ${r.hint ?? `${r.destPath} already exists`}`)
      } else {
        ok(`skill ${r.status} → ${r.destPath}`)
      }
    } catch (err) {
      info(c.yellow(`skipped skill install: ${(err as Error).message}`))
    }
  }

  info(`restart ${matched.label} to pick up the change.`)
  return 0
}
