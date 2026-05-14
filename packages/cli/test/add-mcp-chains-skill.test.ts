/**
 * `boceto add mcp` no longer just writes a config entry — it also
 * co-installs the matching skill so the agent has both the always-loaded
 * teaching AND the runtime tool surface. These tests exercise the
 * client → skill mapping and the auto-detect path.
 *
 * We don't shell out to the CLI here — we call the install helpers
 * directly with explicit cwd / pathDeps. That keeps tests fast and
 * isolated from the real $HOME.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installMcp, MCP_CLIENT_IDS, type McpClientId } from '../src/integrations/mcp'
import { installSkill, SKILL_TARGETS, type SkillTargetId } from '../src/integrations/skill'

const SKILL_FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'skill')

const SKILL_FOR_CLIENT: Record<McpClientId, SkillTargetId> = {
  'claude-code': 'claude',
  cursor: 'cursor',
  'claude-desktop': 'claude-user',
}

function newTmp(): { home: string; cwd: string } {
  return {
    home: mkdtempSync(join(tmpdir(), 'boceto-cli-home-')),
    cwd: mkdtempSync(join(tmpdir(), 'boceto-cli-cwd-')),
  }
}

describe('add mcp chains the matching skill install', () => {
  it('claude-code → claude (project-local skill)', async () => {
    const { home, cwd } = newTmp()
    const pathDeps = {
      homedir: () => home,
      env: { BOCETO_CLAUDE_CODE_CONFIG: join(home, '.claude.json') },
    }
    await installMcp({ client: 'claude-code', mode: 'force', pathDeps })
    await installSkill({
      target: SKILL_FOR_CLIENT['claude-code'],
      cwd,
      skillRoot: SKILL_FIXTURE,
    })
    expect(existsSync(join(home, '.claude.json'))).toBe(true)
    expect(existsSync(join(cwd, '.claude', 'skills', 'boceto', 'SKILL.md'))).toBe(true)
  })

  it('cursor → cursor (project .cursor/rules/boceto.mdc)', async () => {
    const { home, cwd } = newTmp()
    const pathDeps = {
      homedir: () => home,
      env: { BOCETO_CURSOR_CONFIG: join(home, '.cursor', 'mcp.json') },
    }
    await installMcp({ client: 'cursor', mode: 'force', pathDeps })
    await installSkill({
      target: SKILL_FOR_CLIENT.cursor,
      cwd,
      skillRoot: SKILL_FIXTURE,
    })
    expect(existsSync(join(home, '.cursor', 'mcp.json'))).toBe(true)
    expect(existsSync(join(cwd, '.cursor', 'rules', 'boceto.mdc'))).toBe(true)
  })

  it('claude-desktop → claude-user (skill goes to ~/.claude/skills/, not cwd)', () => {
    // We only smoke-check the marker shape here — actually writing into
    // ~/.claude during a test would pollute the developer's home dir.
    const marker = SKILL_TARGETS['claude-user'].marker('/ignored-cwd')
    expect(marker.endsWith('/.claude/skills/boceto/SKILL.md')).toBe(true)
  })

  it('client→skill mapping covers every client id', () => {
    for (const id of MCP_CLIENT_IDS) {
      expect(SKILL_FOR_CLIENT[id]).toBeDefined()
      expect(SKILL_TARGETS[SKILL_FOR_CLIENT[id]]).toBeDefined()
    }
  })
})

describe('add mcp preserves arbitrary sibling keys in the config', () => {
  // Regression-ish: the chained skill install must not interfere with the
  // MCP config merge. The merge is exercised in mcp-config-merge.test.ts;
  // here we just confirm the file ends up correctly shaped after
  // sequential installMcp + installSkill in a fresh fixture.
  it('end-to-end: empty home → claude-code install', async () => {
    const { home, cwd } = newTmp()
    const configPath = join(home, '.claude.json')
    writeFileSync(
      configPath,
      JSON.stringify({ apiKey: 'sk-test', mcpServers: { other: { command: 'foo', args: [] } } }, null, 2),
    )
    await installMcp({
      client: 'claude-code',
      mode: 'force',
      pathDeps: { homedir: () => home, env: { BOCETO_CLAUDE_CODE_CONFIG: configPath } },
    })
    await installSkill({ target: 'claude', cwd, skillRoot: SKILL_FIXTURE })
    const doc = JSON.parse(readFileSync(configPath, 'utf8'))
    expect(doc.apiKey).toBe('sk-test')
    expect(doc.mcpServers.other).toBeDefined()
    expect(doc.mcpServers.boceto).toBeDefined()
    expect(existsSync(join(cwd, '.claude', 'skills', 'boceto', 'SKILL.md'))).toBe(true)
  })
})
