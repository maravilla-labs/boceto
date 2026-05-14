import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Names of the bundled reference files the skill ships with. Listed in the
 * order they should appear when concatenated into a single rules file.
 */
const REFERENCE_FILES = ['grammar.md', 'layout.md', 'component-doc-pattern.md']

/** Recursively copy the entire skill tree (SKILL.md + references/) into `dest`. */
export function copySkillTree(skillRoot: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  cpSync(skillRoot, dest, { recursive: true })
}

/**
 * Copy SKILL.md + each reference file into a single destination directory.
 * When `flatten=true` the references are renamed `boceto-<name>.md` so all
 * files live side-by-side (used by Cline whose `.clinerules/` is flat).
 */
export function copySkillFiles(
  skillRoot: string,
  destDir: string,
  options: { flatten?: boolean } = {},
): void {
  const flatten = options.flatten ?? false
  cpSync(join(skillRoot, 'SKILL.md'), join(destDir, 'boceto-SKILL.md'))
  const refsDir = join(skillRoot, 'references')
  if (!existsSync(refsDir)) return
  for (const file of REFERENCE_FILES) {
    const src = join(refsDir, file)
    if (!existsSync(src)) continue
    const tgt = flatten
      ? join(destDir, `boceto-${file}`)
      : join(destDir, 'references', file)
    if (!flatten) mkdirSync(dirname(tgt), { recursive: true })
    cpSync(src, tgt)
  }
}

/**
 * Concatenate SKILL.md + every reference file into one big markdown string.
 * For AI tools that only accept a single rules file (.cursorrules,
 * .windsurfrules, copilot-instructions.md, AGENTS.md, GEMINI.md).
 *
 * The SKILL.md frontmatter is stripped — that's a Claude Code convention
 * other tools don't understand. Optional `intro` and `frontmatter` strings
 * prepend their own context (e.g. Cursor's `.mdc` requires its own
 * frontmatter header).
 */
export function flattenSkillToString(
  skillRoot: string,
  options: { intro?: string; frontmatter?: string } = {},
): string {
  const intro = options.intro ?? ''
  const frontmatter = options.frontmatter ?? ''
  const skillMd = stripFrontmatter(readFileSync(join(skillRoot, 'SKILL.md'), 'utf8'))
  const refs = REFERENCE_FILES.map((f) => {
    const p = join(skillRoot, 'references', f)
    return existsSync(p)
      ? `\n\n---\n\n# Reference: ${f}\n\n${readFileSync(p, 'utf8')}`
      : ''
  }).join('')
  return frontmatter + intro + skillMd + refs + '\n'
}

/** Strip a leading `---\n…\n---\n` YAML block, if present. */
export function stripFrontmatter(s: string): string {
  if (!s.startsWith('---\n')) return s
  const end = s.indexOf('\n---\n', 4)
  if (end < 0) return s
  return s.slice(end + 5)
}

/**
 * Write the `.boceto-version` sidecar so `boceto check` can compare the
 * installed copy against npm latest later. Tolerates missing destinations
 * silently (some installers append rather than create a directory).
 */
export function writeVersionSidecar(destDir: string, version: string): void {
  if (!existsSync(destDir)) return
  try {
    writeFileSync(join(destDir, '.boceto-version'), version + '\n', 'utf8')
  } catch {
    // Non-fatal — the sidecar is a nice-to-have.
  }
}

export { REFERENCE_FILES }
