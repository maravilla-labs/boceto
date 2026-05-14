/**
 * 12 skill installers, one per supported AI assistant. Each takes the
 * resolved skill root + the project cwd + a `force` flag and returns a
 * structured result describing where the files landed.
 *
 * Ported from the previous `packages/skill/bin/install.js` (the 510-line
 * monolith), with three changes:
 *
 *   1. Typed returns — `{ status, destPath }` — so `check` can reuse the
 *      same modules without duplicating the path knowledge.
 *   2. `cwd` is injected, not `process.cwd()`. Makes tests trivial.
 *   3. A `.boceto-version` sidecar drops next to each install so `check`
 *      can diff installed vs npm-latest.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  copySkillFiles,
  copySkillTree,
  flattenSkillToString,
  writeVersionSidecar,
} from './flatten'

export interface InstallOpts {
  /** Resolved on-disk path to the skill source (bundled or workspace). */
  skillRoot: string
  /** The directory the install is happening in. Defaults are NOT applied here. */
  cwd: string
  /** Force overwrite / replace instead of erroring or appending. */
  force?: boolean
  /** Version string to drop in the `.boceto-version` sidecar (best-effort). */
  version?: string
}

export type InstallStatus = 'created' | 'updated' | 'appended' | 'skipped'

export interface InstallResult {
  /** Outcome label for logging + `check`. */
  status: InstallStatus
  /** Absolute path written to (or, for `skipped`, would have been). */
  destPath: string
  /** Hint shown after install — `info(...)` lines from the old CLI. */
  hint?: string
}

/**
 * The 12 supported targets. `id → { label, description, installer }` so
 * `list`, the interactive picker, and `check` all read from one place.
 */
export interface SkillTarget {
  id: SkillTargetId
  label: string
  /** Human-readable hint about WHERE the files end up. Used in the picker. */
  location: string
  installer: (opts: InstallOpts) => InstallResult
  /** Marker file used by `check` / `update` to detect prior installs. */
  marker: (cwd: string) => string
}

export type SkillTargetId =
  | 'claude'
  | 'claude-user'
  | 'cursor'
  | 'cursorrules'
  | 'cline'
  | 'windsurf'
  | 'aider'
  | 'copilot'
  | 'codex'
  | 'agents'
  | 'gemini'
  | 'raw'

// ── individual installers ────────────────────────────────────────────────

function installClaude({ skillRoot, cwd, version }: InstallOpts): InstallResult {
  const dest = join(cwd, '.claude', 'skills', 'boceto')
  copySkillTree(skillRoot, dest)
  if (version) writeVersionSidecar(dest, version)
  return {
    status: 'created',
    destPath: dest,
    hint: "open Claude Code in this project and it'll pick up the skill automatically.",
  }
}

function installClaudeUser({ skillRoot, version }: InstallOpts): InstallResult {
  // Note: deliberately ignores `cwd` — this target is user-global.
  const dest = join(homedir(), '.claude', 'skills', 'boceto')
  copySkillTree(skillRoot, dest)
  if (version) writeVersionSidecar(dest, version)
  return {
    status: 'created',
    destPath: dest,
    hint: 'Claude Code will pick up the skill in every project for this user.',
  }
}

function installCursor({ skillRoot, cwd, version }: InstallOpts): InstallResult {
  // Modern Cursor: .cursor/rules/<name>.mdc with frontmatter. Cursor reads
  // exactly one rule per file, so we flatten the whole skill into one .mdc.
  const destDir = join(cwd, '.cursor', 'rules')
  mkdirSync(destDir, { recursive: true })
  const bundled = flattenSkillToString(skillRoot, {
    intro: '# Boceto wireframe authoring',
    frontmatter:
      '---\n' +
      'description: Use whenever the user asks for a wireframe, mockup, sketch, or UI layout — especially when the project uses @boceto/* or .boceto files.\n' +
      'globs: ["*.boceto", "*.md"]\n' +
      'alwaysApply: false\n' +
      '---\n\n',
  })
  const dest = join(destDir, 'boceto.mdc')
  writeFileSync(dest, bundled, 'utf8')
  if (version) writeVersionSidecar(destDir, version)
  return {
    status: 'created',
    destPath: dest,
    hint: 'Cursor will surface this rule when you open .boceto or .md files.',
  }
}

function installCursorrulesLegacy({
  skillRoot,
  cwd,
  force,
}: InstallOpts): InstallResult {
  const dest = join(cwd, '.cursorrules')
  if (existsSync(dest) && !force) {
    return {
      status: 'skipped',
      destPath: dest,
      hint: '.cursorrules already exists. Re-run with --force to overwrite.',
    }
  }
  writeFileSync(dest, flattenSkillToString(skillRoot), 'utf8')
  return { status: 'created', destPath: dest }
}

function installCline({ skillRoot, cwd, version }: InstallOpts): InstallResult {
  // Cline: .clinerules/ is a flat directory. Drop skill files prefixed.
  const destDir = join(cwd, '.clinerules')
  mkdirSync(destDir, { recursive: true })
  copySkillFiles(skillRoot, destDir, { flatten: true })
  if (version) writeVersionSidecar(destDir, version)
  return { status: 'created', destPath: destDir }
}

function installWindsurf({ skillRoot, cwd, force }: InstallOpts): InstallResult {
  const dest = join(cwd, '.windsurfrules')
  if (existsSync(dest) && !force) {
    return {
      status: 'skipped',
      destPath: dest,
      hint: '.windsurfrules already exists. Re-run with --force to overwrite.',
    }
  }
  writeFileSync(dest, flattenSkillToString(skillRoot), 'utf8')
  return { status: 'created', destPath: dest }
}

function installAider({ skillRoot, cwd }: InstallOpts): InstallResult {
  // Aider doesn't auto-discover; write BOCETO.md and surface the
  // .aider.conf.yml snippet so the user knows how to wire it in.
  const dest = join(cwd, 'BOCETO.md')
  writeFileSync(dest, flattenSkillToString(skillRoot), 'utf8')
  return {
    status: 'created',
    destPath: dest,
    hint:
      'add `read: [BOCETO.md]` to .aider.conf.yml so Aider reads it every session, or use `aider --read BOCETO.md` ad-hoc.',
  }
}

function installCopilot({ skillRoot, cwd, force }: InstallOpts): InstallResult {
  // .github/copilot-instructions.md. Pre-existing files get APPENDED unless
  // --force, because users often have other Copilot rules they don't want
  // to lose.
  const destDir = join(cwd, '.github')
  mkdirSync(destDir, { recursive: true })
  const dest = join(destDir, 'copilot-instructions.md')
  return appendOrWrite(skillRoot, dest, force ?? false)
}

function installCodexAgents({
  skillRoot,
  cwd,
  force,
}: InstallOpts): InstallResult {
  // AGENTS.md — cross-agent standard from agentsmd.dev. OpenAI Codex,
  // Sourcegraph Cody, and others read it. Append rather than overwrite.
  const dest = join(cwd, 'AGENTS.md')
  return {
    ...appendOrWrite(skillRoot, dest, force ?? false),
    hint:
      'any agent that reads AGENTS.md (OpenAI Codex, Cody, …) will pick this up.',
  }
}

function installGemini({ skillRoot, cwd, force }: InstallOpts): InstallResult {
  const dest = join(cwd, 'GEMINI.md')
  return {
    ...appendOrWrite(skillRoot, dest, force ?? false),
    hint: 'Gemini CLI / Code Assist will read this from the project root.',
  }
}

function installRaw({ skillRoot, cwd, version }: InstallOpts): InstallResult {
  const dest = join(cwd, 'boceto-skill')
  copySkillTree(skillRoot, dest)
  if (version) writeVersionSidecar(dest, version)
  return {
    status: 'created',
    destPath: dest,
    hint: 'raw file tree dumped. Point your AI tool at it however it expects.',
  }
}

/**
 * Shared helper for the three append-on-existing targets (copilot, codex,
 * gemini). Writes the flattened skill, separated from any existing
 * content by `---`. With `--force`, replaces the file entirely.
 */
function appendOrWrite(
  skillRoot: string,
  dest: string,
  force: boolean,
): InstallResult {
  const skillContent = flattenSkillToString(skillRoot)
  if (existsSync(dest) && !force) {
    const existing = readFileSync(dest, 'utf8')
    const sep = '\n\n---\n\n'
    writeFileSync(dest, existing + sep + skillContent, 'utf8')
    return {
      status: 'appended',
      destPath: dest,
      hint: 'appended to existing file — re-run with --force to replace entirely.',
    }
  }
  writeFileSync(dest, skillContent, 'utf8')
  return { status: existsSync(dest) ? 'updated' : 'created', destPath: dest }
}

// ── target registry ─────────────────────────────────────────────────────

export const SKILL_TARGETS: Record<SkillTargetId, SkillTarget> = {
  claude: {
    id: 'claude',
    label: 'Claude Code (per-project)',
    location: '.claude/skills/boceto/',
    installer: installClaude,
    marker: (cwd) => join(cwd, '.claude', 'skills', 'boceto', 'SKILL.md'),
  },
  'claude-user': {
    id: 'claude-user',
    label: 'Claude Code (user-global)',
    location: '~/.claude/skills/boceto/',
    installer: installClaudeUser,
    marker: () => join(homedir(), '.claude', 'skills', 'boceto', 'SKILL.md'),
  },
  cursor: {
    id: 'cursor',
    label: 'Cursor (modern .mdc rules)',
    location: '.cursor/rules/boceto.mdc',
    installer: installCursor,
    marker: (cwd) => join(cwd, '.cursor', 'rules', 'boceto.mdc'),
  },
  cursorrules: {
    id: 'cursorrules',
    label: 'Cursor (legacy .cursorrules)',
    location: '.cursorrules',
    installer: installCursorrulesLegacy,
    marker: (cwd) => join(cwd, '.cursorrules'),
  },
  cline: {
    id: 'cline',
    label: 'Cline / Roo Code',
    location: '.clinerules/',
    installer: installCline,
    marker: (cwd) => join(cwd, '.clinerules', 'boceto-SKILL.md'),
  },
  windsurf: {
    id: 'windsurf',
    label: 'Windsurf',
    location: '.windsurfrules',
    installer: installWindsurf,
    marker: (cwd) => join(cwd, '.windsurfrules'),
  },
  aider: {
    id: 'aider',
    label: 'Aider',
    location: 'BOCETO.md',
    installer: installAider,
    marker: (cwd) => join(cwd, 'BOCETO.md'),
  },
  copilot: {
    id: 'copilot',
    label: 'GitHub Copilot',
    location: '.github/copilot-instructions.md',
    installer: installCopilot,
    marker: (cwd) => join(cwd, '.github', 'copilot-instructions.md'),
  },
  codex: {
    id: 'codex',
    label: 'OpenAI Codex / AGENTS.md',
    location: 'AGENTS.md',
    installer: installCodexAgents,
    marker: (cwd) => join(cwd, 'AGENTS.md'),
  },
  agents: {
    id: 'agents',
    label: 'AGENTS.md (alias of codex)',
    location: 'AGENTS.md',
    installer: installCodexAgents,
    marker: (cwd) => join(cwd, 'AGENTS.md'),
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini CLI / Code Assist',
    location: 'GEMINI.md',
    installer: installGemini,
    marker: (cwd) => join(cwd, 'GEMINI.md'),
  },
  raw: {
    id: 'raw',
    label: 'Raw file dump',
    location: './boceto-skill/',
    installer: installRaw,
    marker: (cwd) => join(cwd, 'boceto-skill', 'SKILL.md'),
  },
}

export const SKILL_TARGET_IDS = Object.keys(SKILL_TARGETS) as SkillTargetId[]

/** Look up a target by id. Returns null for unknown ids (caller decides how to error). */
export function findSkillTarget(id: string): SkillTarget | null {
  return (SKILL_TARGETS as Record<string, SkillTarget>)[id] ?? null
}
