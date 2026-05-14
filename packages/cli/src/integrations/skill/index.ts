import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fetchSkillFromGit, readSkillVersion, resolveSkillRoot } from './source'
import {
  findSkillTarget,
  SKILL_TARGET_IDS,
  SKILL_TARGETS,
  type InstallOpts,
  type InstallResult,
  type SkillTarget,
  type SkillTargetId,
} from './targets'

export {
  SKILL_TARGETS,
  SKILL_TARGET_IDS,
  findSkillTarget,
  type SkillTarget,
  type SkillTargetId,
  type InstallResult,
  type InstallOpts,
}
export { resolveSkillRoot, fetchSkillFromGit, readSkillVersion, fetchNpmLatestVersion } from './source'

/**
 * High-level install entry. Resolves the skill source, looks up the
 * target, runs the installer, returns the structured result. Throws on
 * unknown target — callers should validate first.
 */
export interface InstallSkillOptions {
  target: SkillTargetId
  cwd: string
  force?: boolean
  /** Provide a pre-resolved skill root (e.g. `--from-git` temp dir). */
  skillRoot?: string
}

export async function installSkill(opts: InstallSkillOptions): Promise<InstallResult> {
  const target = findSkillTarget(opts.target)
  if (!target) throw new Error(`unknown skill target: ${opts.target}`)
  const skillRoot = opts.skillRoot ?? resolveSkillRoot()
  const version = readSkillVersion(skillRoot)
  return target.installer({
    skillRoot,
    cwd: opts.cwd,
    force: opts.force ?? false,
    version,
  })
}

/**
 * Walk every known marker file and report which targets are currently
 * installed in this directory. Used by `boceto check` and by the
 * interactive `init` flow to pick sensible defaults.
 */
export interface DetectedSkill {
  target: SkillTarget
  destPath: string
  installedVersion: string | null
}

export function detectInstalledSkills(cwd: string): DetectedSkill[] {
  const out: DetectedSkill[] = []
  for (const id of SKILL_TARGET_IDS) {
    if (id === 'agents') continue // duplicate of `codex`
    const target = SKILL_TARGETS[id]
    const marker = target.marker(cwd)
    if (!existsSync(marker)) continue
    out.push({
      target,
      destPath: dirname(marker),
      installedVersion: readSidecarVersion(marker),
    })
  }
  return out
}

/**
 * Best-effort lookup of the `.boceto-version` sidecar dropped at install
 * time. Returns null if absent — callers show `unknown` in that case.
 */
function readSidecarVersion(markerPath: string): string | null {
  const sidecar = join(dirname(markerPath), '.boceto-version')
  if (!existsSync(sidecar)) return null
  try {
    return readFileSync(sidecar, 'utf8').trim() || null
  } catch {
    return null
  }
}
