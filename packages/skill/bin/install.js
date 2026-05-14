#!/usr/bin/env node
/**
 * `npx @boceto/skill install [target]`
 *
 * Copies the Boceto authoring skill (SKILL.md + references/) into the
 * conventional location for popular AI coding assistants. All targets read
 * the same underlying markdown — the differences are file layout, frontmatter
 * format, and where each tool looks.
 *
 * Targets:
 *   claude   → .claude/skills/boceto/        (per-project, recommended)
 *   claude-user → ~/.claude/skills/boceto/   (Claude Code, all projects)
 *   cursor   → .cursor/rules/boceto.mdc      (Cursor, modern rules format)
 *   cursorrules → .cursorrules               (Cursor, legacy single file)
 *   cline    → .clinerules/                  (Cline / Roo Code)
 *   windsurf → .windsurfrules                (Windsurf)
 *   aider    → BOCETO.md + .aider.conf.yml hint
 *   copilot  → .github/copilot-instructions.md (GitHub Copilot)
 *   codex    → AGENTS.md                     (OpenAI Codex, cross-agent standard)
 *   agents   → alias for `codex`             (anything that follows agentsmd.dev)
 *   gemini   → GEMINI.md                     (Gemini CLI / Code Assist)
 *   raw      → ./boceto-skill/               (just dump the files, you handle it)
 *
 * The CLI works in both monorepo dev (reads /skill/boceto from the repo root)
 * and post-publish (reads the bundled ./skill/ inside the package directory).
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { createInterface } from 'node:readline'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')

// Resolve the skill source. After `prepack` the bundled copy lives at
// packages/skill/skill/. In raw monorepo dev (no prepack run yet), fall
// back to the repo's canonical /skill/boceto/.
const candidates = [
  resolve(pkgRoot, 'skill'),
  resolve(pkgRoot, '..', '..', 'skill', 'boceto'),
]
let skillRoot = candidates.find((p) => existsSync(join(p, 'SKILL.md')))
if (!skillRoot) {
  console.error(
    `[boceto-skill] could not find the skill source. Looked in:\n  ${candidates.join('\n  ')}`,
  )
  process.exit(1)
}

const TARGETS = {
  claude: installClaude,
  'claude-user': installClaudeUser,
  cursor: installCursor,
  cursorrules: installCursorrulesLegacy,
  cline: installCline,
  windsurf: installWindsurf,
  aider: installAider,
  copilot: installCopilot,
  codex: installCodexAgents,
  agents: installCodexAgents, // alias — same file, same audience
  gemini: installGemini,
  raw: installRaw,
}

const args = process.argv.slice(2)
const cmd = args[0] ?? 'help'

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  printHelp()
  process.exit(0)
}

if (cmd === 'path') {
  console.log(skillRoot)
  process.exit(0)
}

if (cmd === 'list') {
  for (const t of Object.keys(TARGETS)) console.log(t)
  process.exit(0)
}

if (cmd === 'update') {
  await runUpdate(args.slice(1))
  process.exit(0)
}

if (cmd !== 'install') {
  console.error(`[boceto-skill] unknown command: ${cmd}\n`)
  printHelp()
  process.exit(1)
}

let target = args[1]
const force = args.includes('--force') || args.includes('-f')
if (!target) {
  target = await pickTargetInteractive()
}
if (!target) {
  console.error('[boceto-skill] no target provided')
  process.exit(1)
}

const fn = TARGETS[target]
if (!fn) {
  console.error(
    `[boceto-skill] unknown target: ${target}\n  valid: ${Object.keys(TARGETS).join(', ')}`,
  )
  process.exit(1)
}

try {
  fn({ force })
} catch (err) {
  console.error(`[boceto-skill] install failed: ${err.message}`)
  process.exit(1)
}

// ── update ────────────────────────────────────────────────────────────

/**
 * Detect which install target(s) live in the current directory (or `~/`
 * for `claude-user`) and refresh them from the latest skill source.
 *
 * Modes:
 *   `update`               → use the skill files bundled with this npx
 *                            invocation (re-running npx fetches the latest
 *                            published @boceto/skill — that's the normal
 *                            way to get updates).
 *   `update --from-git`    → fetch the skill files straight from
 *                            github.com/maravilla-labs/boceto main branch.
 *                            Useful for unreleased changes or when npm
 *                            is unavailable.
 *   `update --check`       → just print "installed: vX, npm latest: vY"
 *                            and exit.
 */
async function runUpdate(opts) {
  const fromGit = opts.includes('--from-git') || opts.includes('--bleeding')
  const check = opts.includes('--check')

  if (check) {
    const installed = readPkgVersion(pkgRoot)
    let latest = '(could not reach npm)'
    try {
      const res = await fetch('https://registry.npmjs.org/@boceto/skill/latest')
      if (res.ok) latest = (await res.json()).version
    } catch {}
    console.log(`installed: ${installed}`)
    console.log(`npm latest: ${latest}`)
    if (installed !== latest) {
      info(`run \`npx @boceto/skill@latest update\` to refresh`)
    }
    return
  }

  if (fromGit) {
    info(`fetching skill source from github.com/maravilla-labs/boceto…`)
    skillRoot = await fetchSkillFromGit()
    ok(`fetched into ${skillRoot}`)
  }

  const installed = detectInstalledTargets()
  if (installed.length === 0) {
    fail(`no installed Boceto skill found in this directory`)
    info(`run \`npx @boceto/skill install\` to install for the first time`)
    process.exit(1)
  }

  console.log(`detected installed targets: ${installed.join(', ')}\n`)
  for (const target of installed) {
    const fn = TARGETS[target]
    if (!fn) continue
    // Force overwrite — `update` is explicit user intent.
    try {
      process.argv = [...process.argv, '--force']
      fn({ force: true })
    } catch (err) {
      fail(`failed to update ${target}: ${err.message}`)
    }
  }
  ok(`update complete`)
}

/**
 * Look for marker files / directories of each known target. Returns the
 * list of target names currently installed. Used by `update` to know what
 * to refresh.
 */
function detectInstalledTargets() {
  const cwd = process.cwd()
  const checks = [
    ['claude', join(cwd, '.claude', 'skills', 'boceto', 'SKILL.md')],
    ['claude-user', join(homedir(), '.claude', 'skills', 'boceto', 'SKILL.md')],
    ['cursor', join(cwd, '.cursor', 'rules', 'boceto.mdc')],
    ['cursorrules', join(cwd, '.cursorrules')],
    ['cline', join(cwd, '.clinerules', 'boceto-SKILL.md')],
    ['windsurf', join(cwd, '.windsurfrules')],
    ['aider', join(cwd, 'BOCETO.md')],
    ['copilot', join(cwd, '.github', 'copilot-instructions.md')],
    ['codex', join(cwd, 'AGENTS.md')],
    ['gemini', join(cwd, 'GEMINI.md')],
    ['raw', join(cwd, 'boceto-skill', 'SKILL.md')],
  ]
  return checks
    .filter(([, p]) => existsSync(p))
    .map(([t]) => t)
    .filter((t, i, arr) => arr.indexOf(t) === i)
}

/**
 * Download the skill source directly from the GitHub main branch into a
 * temp directory. Returns the path so the rest of the script treats it
 * exactly like the bundled source.
 */
async function fetchSkillFromGit() {
  const base =
    'https://raw.githubusercontent.com/maravilla-labs/boceto/main/skill/boceto'
  const files = [
    'SKILL.md',
    'references/grammar.md',
    'references/elements.md',
    'references/layout.md',
    'references/components.md',
    'references/recipes.md',
  ]
  const tmp = mkdtempSync(join(tmpdir(), 'boceto-skill-'))
  for (const f of files) {
    const url = `${base}/${f}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`fetch ${url}: HTTP ${res.status}`)
    }
    const content = await res.text()
    const dest = join(tmp, f)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content, 'utf8')
  }
  return tmp
}

function readPkgVersion(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version
  } catch {
    return 'unknown'
  }
}

// ── installers ────────────────────────────────────────────────────────

function installClaude() {
  const dest = join(process.cwd(), '.claude', 'skills', 'boceto')
  copySkill(dest)
  ok(`installed → ${dest}`)
  info(`open Claude Code in this project and it'll pick up the skill automatically.`)
}

function installClaudeUser() {
  const dest = join(homedir(), '.claude', 'skills', 'boceto')
  copySkill(dest)
  ok(`installed → ${dest}`)
  info(`Claude Code will pick up the skill in every project for this user.`)
}

function installCursor() {
  // Modern Cursor: .cursor/rules/<name>.mdc with frontmatter.
  // We flatten the skill into a single .mdc file (Cursor only reads a
  // single rule per file, but supports multiple files in the rules dir).
  const destDir = join(process.cwd(), '.cursor', 'rules')
  mkdirSync(destDir, { recursive: true })
  const bundled = flattenSkillToString({
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
  ok(`installed → ${dest}`)
  info(`Cursor will surface this rule when you open .boceto or .md files.`)
}

function installCursorrulesLegacy() {
  // Legacy single-file Cursor format. Whole skill flattened into one file.
  const dest = join(process.cwd(), '.cursorrules')
  if (existsSync(dest) && !arg('force')) {
    fail(`.cursorrules already exists. Re-run with --force to overwrite (or append manually).`)
    return
  }
  writeFileSync(dest, flattenSkillToString(), 'utf8')
  ok(`installed → ${dest}`)
}

function installCline() {
  // Cline: .clinerules/<filename>.md (directory). Drop the skill files.
  const destDir = join(process.cwd(), '.clinerules')
  mkdirSync(destDir, { recursive: true })
  cpSkillFiles(destDir, /* flatten */ true)
  ok(`installed → ${destDir}`)
}

function installWindsurf() {
  const dest = join(process.cwd(), '.windsurfrules')
  if (existsSync(dest) && !arg('force')) {
    fail(`.windsurfrules already exists. Re-run with --force to overwrite.`)
    return
  }
  writeFileSync(dest, flattenSkillToString(), 'utf8')
  ok(`installed → ${dest}`)
}

function installAider() {
  // Aider doesn't auto-discover; write a BOCETO.md and tell the user how to
  // include it via `aider --read` or .aider.conf.yml.
  const dest = join(process.cwd(), 'BOCETO.md')
  writeFileSync(dest, flattenSkillToString(), 'utf8')
  ok(`installed → ${dest}`)
  info(`Add this to .aider.conf.yml so Aider reads it every session:`)
  console.log(`\n  read: [BOCETO.md]\n`)
  info(`Or use one-off: aider --read BOCETO.md`)
}

function installCopilot() {
  // GitHub Copilot Chat picks up .github/copilot-instructions.md.
  const destDir = join(process.cwd(), '.github')
  mkdirSync(destDir, { recursive: true })
  const dest = join(destDir, 'copilot-instructions.md')
  if (existsSync(dest) && !arg('force')) {
    // Append, don't overwrite — Copilot instructions files often pre-exist.
    const existing = readFileSync(dest, 'utf8')
    const sep = '\n\n---\n\n'
    writeFileSync(dest, existing + sep + flattenSkillToString(), 'utf8')
    ok(`appended → ${dest}`)
    return
  }
  writeFileSync(dest, flattenSkillToString(), 'utf8')
  ok(`installed → ${dest}`)
}

function installCodexAgents() {
  // AGENTS.md — the cross-agent standard from agentsmd.dev. Picked up by
  // OpenAI Codex, Sourcegraph Cody, and any tool that follows the
  // convention. Append to an existing AGENTS.md so we don't clobber other
  // project rules.
  const dest = join(process.cwd(), 'AGENTS.md')
  appendOrWrite(dest)
  ok(`installed → ${dest}`)
  info(`Any agent that reads AGENTS.md (OpenAI Codex, Cody, etc.) will pick this up.`)
}

function installGemini() {
  // GEMINI.md — Gemini CLI / Code Assist convention.
  const dest = join(process.cwd(), 'GEMINI.md')
  appendOrWrite(dest)
  ok(`installed → ${dest}`)
  info(`Gemini CLI / Code Assist will read this from the project root.`)
}

function appendOrWrite(dest) {
  const skillContent = flattenSkillToString()
  if (existsSync(dest) && !arg('force')) {
    const existing = readFileSync(dest, 'utf8')
    const sep = '\n\n---\n\n'
    writeFileSync(dest, existing + sep + skillContent, 'utf8')
    info(`(appended to existing file — re-run with --force to replace entirely)`)
    return
  }
  writeFileSync(dest, skillContent, 'utf8')
}

function installRaw() {
  const dest = join(process.cwd(), 'boceto-skill')
  copySkill(dest)
  ok(`installed → ${dest}`)
  info(`raw file tree dumped. Point your AI tool at it however it expects.`)
}

// ── helpers ───────────────────────────────────────────────────────────

function copySkill(dest) {
  mkdirSync(dest, { recursive: true })
  cpSync(skillRoot, dest, { recursive: true })
}

function cpSkillFiles(destDir, flatten = false) {
  // Copy SKILL.md + all references/*.md. If flatten=true, the references
  // get prefixed with `boceto-` and live next to SKILL.md so all files end
  // up in the same directory (used by Cline whose .clinerules is flat).
  cpSync(join(skillRoot, 'SKILL.md'), join(destDir, 'boceto-SKILL.md'))
  const refsDir = join(skillRoot, 'references')
  if (!existsSync(refsDir)) return
  for (const file of ['grammar.md', 'elements.md', 'layout.md', 'components.md', 'recipes.md']) {
    const src = join(refsDir, file)
    if (!existsSync(src)) continue
    const tgt = flatten ? join(destDir, `boceto-${file}`) : join(destDir, 'references', file)
    if (!flatten) mkdirSync(dirname(tgt), { recursive: true })
    cpSync(src, tgt)
  }
}

/**
 * Concatenate SKILL.md + every reference file into one big markdown string —
 * for AI tools that only accept a single rules file (.cursorrules, .windsurfrules).
 * Strips the SKILL.md frontmatter; that's a Claude convention other tools
 * don't understand.
 */
function flattenSkillToString({ intro = '', frontmatter = '' } = {}) {
  const skillMd = stripFrontmatter(readFileSync(join(skillRoot, 'SKILL.md'), 'utf8'))
  const refFiles = ['grammar.md', 'elements.md', 'layout.md', 'components.md', 'recipes.md']
  const refs = refFiles
    .map((f) => {
      const p = join(skillRoot, 'references', f)
      return existsSync(p)
        ? `\n\n---\n\n# Reference: ${f}\n\n${readFileSync(p, 'utf8')}`
        : ''
    })
    .join('')
  return frontmatter + intro + skillMd + refs + '\n'
}

function stripFrontmatter(s) {
  if (!s.startsWith('---\n')) return s
  const end = s.indexOf('\n---\n', 4)
  if (end < 0) return s
  return s.slice(end + 5)
}

async function pickTargetInteractive() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => {
    console.log('\nBoceto skill — pick your AI tool:\n')
    const opts = [
      ['1', 'claude', 'Claude Code (per-project, recommended)'],
      ['2', 'claude-user', 'Claude Code (user-global)'],
      ['3', 'cursor', 'Cursor (modern .mdc rules)'],
      ['4', 'cline', 'Cline / Roo Code'],
      ['5', 'windsurf', 'Windsurf'],
      ['6', 'aider', 'Aider'],
      ['7', 'copilot', 'GitHub Copilot'],
      ['8', 'codex', 'OpenAI Codex / AGENTS.md (cross-agent standard)'],
      ['9', 'gemini', 'Gemini CLI / Code Assist'],
      ['10', 'raw', 'Just give me the files'],
    ]
    for (const [n, , label] of opts) console.log(`  ${n}) ${label}`)
    rl.question('\nNumber: ', (line) => {
      rl.close()
      const idx = Number(line.trim())
      const hit = opts.find(([n]) => Number(n) === idx)
      res(hit ? hit[1] : null)
    })
  })
}

function arg(name) {
  return process.argv.includes(`--${name}`) || process.argv.includes(`-${name[0]}`)
}

function ok(msg) {
  console.log(`✓ ${msg}`)
}
function info(msg) {
  console.log(`  ${msg}`)
}
function fail(msg) {
  console.error(`✗ ${msg}`)
}

function printHelp() {
  console.log(`Boceto AI skill — install authoring instructions for popular agents.

Usage:
  npx @boceto/skill install [target]   # install into the current project
  npx @boceto/skill install              # interactive picker
  npx @boceto/skill update             # refresh whatever's already installed
  npx @boceto/skill update --from-git  # fetch latest from github.com/main
  npx @boceto/skill update --check     # show installed vs npm latest version
  npx @boceto/skill list                # list known targets
  npx @boceto/skill path                # print path to the skill source

Targets:
  claude        .claude/skills/boceto/                 (recommended)
  claude-user   ~/.claude/skills/boceto/
  cursor        .cursor/rules/boceto.mdc
  cursorrules   .cursorrules                           (legacy)
  cline         .clinerules/
  windsurf      .windsurfrules
  aider         BOCETO.md (+ how-to for .aider.conf.yml)
  copilot       .github/copilot-instructions.md
  codex|agents  AGENTS.md                              (OpenAI Codex, agentsmd.dev)
  gemini        GEMINI.md                              (Gemini CLI / Code Assist)
  raw           ./boceto-skill/                        (dump and self-route)

Flags:
  --force, -f   Overwrite existing files instead of erroring out.

Examples:
  npx @boceto/skill install claude
  npx @boceto/skill install cursor
  npx @boceto/skill install aider
`)
}
