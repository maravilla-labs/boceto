import { describe, expect, it, beforeEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SKILL_TARGETS, type SkillTargetId } from '../src/integrations/skill'

const SKILL_FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'skill')

function newCwd(): string {
  return mkdtempSync(join(tmpdir(), 'boceto-cli-skill-'))
}

function runInstall(
  id: SkillTargetId,
  opts: { cwd?: string; force?: boolean; version?: string } = {},
) {
  const t = SKILL_TARGETS[id]
  return t.installer({
    skillRoot: SKILL_FIXTURE,
    cwd: opts.cwd ?? newCwd(),
    force: opts.force ?? false,
    version: opts.version ?? 'fixture',
  })
}

describe('claude', () => {
  it('writes the full skill tree to .claude/skills/boceto/', () => {
    const cwd = newCwd()
    const r = runInstall('claude', { cwd })
    expect(r.status).toBe('created')
    expect(existsSync(join(cwd, '.claude', 'skills', 'boceto', 'SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, '.claude', 'skills', 'boceto', 'references', 'grammar.md'))).toBe(
      true,
    )
    // .boceto-version sidecar should be there
    expect(existsSync(join(cwd, '.claude', 'skills', 'boceto', '.boceto-version'))).toBe(true)
  })
})

describe('cursor', () => {
  it('writes a flattened .cursor/rules/boceto.mdc with frontmatter', () => {
    const cwd = newCwd()
    const r = runInstall('cursor', { cwd })
    expect(r.status).toBe('created')
    const path = join(cwd, '.cursor', 'rules', 'boceto.mdc')
    expect(existsSync(path)).toBe(true)
    const out = readFileSync(path, 'utf8')
    expect(out.startsWith('---\n')).toBe(true)
    expect(out).toContain('# Boceto wireframe authoring')
    // Reference fixtures should be concatenated in.
    expect(out).toContain('# Reference: grammar.md')
    expect(out).toContain('# Reference: layout.md')
    expect(out).toContain('# Reference: component-doc-pattern.md')
  })
})

describe('cursorrules (legacy)', () => {
  it('writes a flat .cursorrules', () => {
    const cwd = newCwd()
    const r = runInstall('cursorrules', { cwd })
    expect(r.status).toBe('created')
    expect(existsSync(join(cwd, '.cursorrules'))).toBe(true)
  })

  it('skips an existing .cursorrules without --force', () => {
    const cwd = newCwd()
    writeFileSync(join(cwd, '.cursorrules'), 'pre-existing')
    const r = runInstall('cursorrules', { cwd, force: false })
    expect(r.status).toBe('skipped')
    expect(readFileSync(join(cwd, '.cursorrules'), 'utf8')).toBe('pre-existing')
  })

  it('overwrites with --force', () => {
    const cwd = newCwd()
    writeFileSync(join(cwd, '.cursorrules'), 'pre-existing')
    const r = runInstall('cursorrules', { cwd, force: true })
    expect(r.status).toBe('created')
    expect(readFileSync(join(cwd, '.cursorrules'), 'utf8')).not.toBe('pre-existing')
  })
})

describe('cline', () => {
  it('writes flat boceto-prefixed files into .clinerules/', () => {
    const cwd = newCwd()
    const r = runInstall('cline', { cwd })
    expect(r.status).toBe('created')
    expect(existsSync(join(cwd, '.clinerules', 'boceto-SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, '.clinerules', 'boceto-grammar.md'))).toBe(true)
    expect(existsSync(join(cwd, '.clinerules', 'boceto-layout.md'))).toBe(true)
  })
})

describe('windsurf', () => {
  it('writes a flat .windsurfrules', () => {
    const cwd = newCwd()
    const r = runInstall('windsurf', { cwd })
    expect(r.status).toBe('created')
    expect(existsSync(join(cwd, '.windsurfrules'))).toBe(true)
  })

  it('skips when .windsurfrules exists without --force', () => {
    const cwd = newCwd()
    writeFileSync(join(cwd, '.windsurfrules'), 'old')
    const r = runInstall('windsurf', { cwd, force: false })
    expect(r.status).toBe('skipped')
    expect(readFileSync(join(cwd, '.windsurfrules'), 'utf8')).toBe('old')
  })
})

describe('aider', () => {
  it('writes BOCETO.md', () => {
    const cwd = newCwd()
    const r = runInstall('aider', { cwd })
    expect(r.status).toBe('created')
    expect(existsSync(join(cwd, 'BOCETO.md'))).toBe(true)
    expect(r.hint).toMatch(/aider/i)
  })
})

describe('copilot', () => {
  it('writes a new copilot-instructions.md', () => {
    const cwd = newCwd()
    const r = runInstall('copilot', { cwd })
    expect(r.status === 'created' || r.status === 'updated').toBe(true)
    expect(existsSync(join(cwd, '.github', 'copilot-instructions.md'))).toBe(true)
  })

  it('appends to an existing copilot-instructions.md', () => {
    const cwd = newCwd()
    const path = join(cwd, '.github', 'copilot-instructions.md')
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, 'pre-existing\n')
    const r = runInstall('copilot', { cwd, force: false })
    expect(r.status).toBe('appended')
    const after = readFileSync(path, 'utf8')
    expect(after.startsWith('pre-existing\n')).toBe(true)
    expect(after).toContain('---')
  })

  it('replaces existing with --force', () => {
    const cwd = newCwd()
    const path = join(cwd, '.github', 'copilot-instructions.md')
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, 'pre-existing\n')
    const r = runInstall('copilot', { cwd, force: true })
    expect(r.status === 'updated' || r.status === 'created').toBe(true)
    expect(readFileSync(path, 'utf8')).not.toMatch(/pre-existing/)
  })
})

describe('codex / agents (AGENTS.md)', () => {
  it('writes a new AGENTS.md', () => {
    const cwd = newCwd()
    const r = runInstall('codex', { cwd })
    expect(existsSync(join(cwd, 'AGENTS.md'))).toBe(true)
    expect(r.hint).toMatch(/AGENTS\.md/)
  })

  it('appends to an existing AGENTS.md without --force', () => {
    const cwd = newCwd()
    writeFileSync(join(cwd, 'AGENTS.md'), 'pre-existing rules\n')
    const r = runInstall('codex', { cwd, force: false })
    expect(r.status).toBe('appended')
    const after = readFileSync(join(cwd, 'AGENTS.md'), 'utf8')
    expect(after.startsWith('pre-existing rules\n')).toBe(true)
    expect(after).toContain('---')
  })

  it('aliases via the `agents` id', () => {
    const cwd = newCwd()
    const r = runInstall('agents', { cwd })
    expect(existsSync(join(cwd, 'AGENTS.md'))).toBe(true)
    expect(r.status === 'created' || r.status === 'updated').toBe(true)
  })
})

describe('gemini', () => {
  it('writes a new GEMINI.md', () => {
    const cwd = newCwd()
    runInstall('gemini', { cwd })
    expect(existsSync(join(cwd, 'GEMINI.md'))).toBe(true)
  })

  it('appends to an existing GEMINI.md', () => {
    const cwd = newCwd()
    writeFileSync(join(cwd, 'GEMINI.md'), 'pre-existing\n')
    const r = runInstall('gemini', { cwd, force: false })
    expect(r.status).toBe('appended')
  })
})

describe('raw', () => {
  it('dumps the skill tree into ./boceto-skill/', () => {
    const cwd = newCwd()
    const r = runInstall('raw', { cwd })
    expect(r.status).toBe('created')
    expect(existsSync(join(cwd, 'boceto-skill', 'SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, 'boceto-skill', 'references', 'grammar.md'))).toBe(true)
  })
})

describe('claude-user', () => {
  it('writes to ~/.claude/skills/boceto/ ignoring cwd (smoke only)', () => {
    // Don't actually touch the user's home dir during tests — just smoke
    // the marker getter shape. Marker should resolve under homedir().
    const m = SKILL_TARGETS['claude-user'].marker('/ignored-cwd')
    expect(m.includes('.claude/skills/boceto/SKILL.md')).toBe(true)
  })
})

// noop beforeEach so the linter doesn't warn about unused import
beforeEach(() => {})
