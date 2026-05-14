import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { detectInstalledSkills, SKILL_TARGETS } from '../src/integrations/skill'

function newCwd(): string {
  return mkdtempSync(join(tmpdir(), 'boceto-cli-check-'))
}

describe('detectInstalledSkills', () => {
  it('returns empty on a clean directory', () => {
    expect(detectInstalledSkills(newCwd())).toEqual([])
  })

  it('detects multiple installed targets', () => {
    const cwd = newCwd()
    // Drop two markers
    const cursor = SKILL_TARGETS.cursor.marker(cwd)
    const cline = SKILL_TARGETS.cline.marker(cwd)
    mkdirSync(dirname(cursor), { recursive: true })
    mkdirSync(dirname(cline), { recursive: true })
    writeFileSync(cursor, 'fixture')
    writeFileSync(cline, 'fixture')
    const detected = detectInstalledSkills(cwd)
    const ids = detected.map((d) => d.target.id).sort()
    expect(ids).toContain('cursor')
    expect(ids).toContain('cline')
  })

  it('reads the .boceto-version sidecar when present', () => {
    const cwd = newCwd()
    const marker = SKILL_TARGETS.cursor.marker(cwd)
    mkdirSync(dirname(marker), { recursive: true })
    writeFileSync(marker, 'fixture')
    writeFileSync(join(dirname(marker), '.boceto-version'), '0.4.2\n')
    const detected = detectInstalledSkills(cwd)
    const cursor = detected.find((d) => d.target.id === 'cursor')
    expect(cursor?.installedVersion).toBe('0.4.2')
  })

  it('falls back to null when no sidecar exists', () => {
    const cwd = newCwd()
    const marker = SKILL_TARGETS.cline.marker(cwd)
    mkdirSync(dirname(marker), { recursive: true })
    writeFileSync(marker, 'fixture')
    const detected = detectInstalledSkills(cwd)
    expect(detected.find((d) => d.target.id === 'cline')?.installedVersion).toBeNull()
  })
})
