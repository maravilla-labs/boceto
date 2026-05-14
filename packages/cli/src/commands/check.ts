import { c } from '../ui/colors'
import { getBool, type ParsedArgs } from '../util/argv'
import {
  detectInstalledSkills,
  fetchNpmLatestVersion,
  readSkillVersion,
  resolveSkillRoot,
  SKILL_TARGET_IDS,
  SKILL_TARGETS,
  type SkillTargetId,
} from '../integrations/skill'
import {
  detectInstalledMcpClients,
  MCP_CLIENT_IDS,
  MCP_CLIENTS,
} from '../integrations/mcp'

/**
 * `boceto check [--json]` — show what's installed where. Pretty output by
 * default, JSON when `--json` (for scripting). Exit code 0 if both a skill
 * and an MCP client are installed; 1 otherwise.
 */
export async function runCheck(args: ParsedArgs): Promise<number> {
  const cwd = process.cwd()
  const asJson = getBool(args.flags, 'json')
  const installedSkills = detectInstalledSkills(cwd)
  const installedSkillIds = new Set(installedSkills.map((s) => s.target.id))
  const mcps = detectInstalledMcpClients()

  let skillRoot: string | null = null
  try {
    skillRoot = resolveSkillRoot()
  } catch {
    // Skill source missing is non-fatal; show "unknown" for version.
  }
  const installedVersion = skillRoot ? readSkillVersion(skillRoot) : 'unknown'
  const latestVersion = await fetchNpmLatestVersion()

  const oneSkill = installedSkills.length > 0
  const oneMcp = mcps.some((m) => m.entry != null)
  const exit = oneSkill && oneMcp ? 0 : 1

  if (asJson) {
    const out = {
      skill: {
        cwd,
        targets: SKILL_TARGET_IDS.filter((id) => id !== 'agents').map((id) => {
          const detected = installedSkills.find((s) => s.target.id === id)
          return {
            id,
            installed: !!detected,
            path: detected?.destPath ?? SKILL_TARGETS[id].marker(cwd),
            version: detected?.installedVersion ?? null,
          }
        }),
      },
      mcp: {
        clients: MCP_CLIENT_IDS.map((id) => {
          const c2 = mcps.find((m) => m.client.id === id)
          return {
            id,
            path: MCP_CLIENTS[id].configPath(),
            installed: !!c2?.entry,
            entry: c2?.entry ?? null,
          }
        }),
      },
      version: { installed: installedVersion, latest: latestVersion },
    }
    console.log(JSON.stringify(out, null, 2))
    return exit
  }

  // Pretty output.
  console.log(c.bold('Boceto installation report'))
  console.log(c.dim(`project: ${cwd}\n`))
  console.log(c.bold('Skill targets'))
  for (const id of SKILL_TARGET_IDS as SkillTargetId[]) {
    if (id === 'agents') continue
    const detected = installedSkills.find((s) => s.target.id === id)
    const target = SKILL_TARGETS[id]
    const installed = installedSkillIds.has(id)
    const mark = installed ? c.green('✓') : c.dim('·')
    const ver = detected?.installedVersion
      ? c.dim(`(${detected.installedVersion})`)
      : installed
        ? ''
        : c.dim('not installed')
    console.log(`  ${mark} ${id.padEnd(14)} ${target.location.padEnd(48)} ${ver}`)
  }

  console.log('')
  console.log(c.bold('MCP clients'))
  for (const m of mcps) {
    const mark = m.entry ? c.green('✓') : c.dim('·')
    const summary = m.entry
      ? c.dim(`${m.entry.command} ${m.entry.args.join(' ')}`)
      : c.dim('not installed')
    console.log(
      `  ${mark} ${m.client.id.padEnd(14)} ${m.client.shortPath().padEnd(48)} ${summary}`,
    )
  }

  console.log('')
  console.log(c.bold('Skill version'))
  console.log(`  installed: ${installedVersion}`)
  console.log(
    `  npm latest: ${latestVersion ?? c.dim('(could not reach npm)')}`,
  )
  if (latestVersion && installedVersion !== latestVersion) {
    console.log(c.yellow(`  ⚠ run \`boceto add skill <target> --force\` to refresh.`))
  }
  return exit
}
