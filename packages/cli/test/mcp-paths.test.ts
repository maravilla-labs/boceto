import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { resolveClientConfigPath } from '../src/integrations/mcp/paths'

const FAKE_HOME = '/Users/fake'

describe('resolveClientConfigPath', () => {
  it('claude-code → <homedir>/.claude.json', () => {
    expect(resolveClientConfigPath('claude-code', { homedir: () => FAKE_HOME, env: {} })).toBe(
      join(FAKE_HOME, '.claude.json'),
    )
  })

  it('cursor → <homedir>/.cursor/mcp.json', () => {
    expect(resolveClientConfigPath('cursor', { homedir: () => FAKE_HOME, env: {} })).toBe(
      join(FAKE_HOME, '.cursor', 'mcp.json'),
    )
  })

  it('claude-desktop on darwin uses Application Support', () => {
    const p = resolveClientConfigPath('claude-desktop', {
      homedir: () => FAKE_HOME,
      platform: 'darwin',
      env: {},
    })
    expect(p).toBe(
      join(FAKE_HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    )
  })

  it('claude-desktop on win32 uses %APPDATA%', () => {
    const p = resolveClientConfigPath('claude-desktop', {
      homedir: () => FAKE_HOME,
      platform: 'win32',
      env: { APPDATA: 'C:\\Users\\fake\\AppData\\Roaming' },
    })
    expect(p).toBe(
      join('C:\\Users\\fake\\AppData\\Roaming', 'Claude', 'claude_desktop_config.json'),
    )
  })

  it('claude-desktop on linux follows XDG_CONFIG_HOME when set', () => {
    const p = resolveClientConfigPath('claude-desktop', {
      homedir: () => FAKE_HOME,
      platform: 'linux',
      env: { XDG_CONFIG_HOME: '/xdg' },
    })
    expect(p).toBe(join('/xdg', 'Claude', 'claude_desktop_config.json'))
  })

  it('claude-desktop on linux falls back to ~/.config when XDG is unset', () => {
    const p = resolveClientConfigPath('claude-desktop', {
      homedir: () => FAKE_HOME,
      platform: 'linux',
      env: {},
    })
    expect(p).toBe(join(FAKE_HOME, '.config', 'Claude', 'claude_desktop_config.json'))
  })

  it('BOCETO_CLAUDE_CODE_CONFIG env override wins over homedir', () => {
    expect(
      resolveClientConfigPath('claude-code', {
        homedir: () => FAKE_HOME,
        env: { BOCETO_CLAUDE_CODE_CONFIG: '/elsewhere/claude.json' },
      }),
    ).toBe('/elsewhere/claude.json')
  })

  it('BOCETO_CURSOR_CONFIG env override wins over homedir', () => {
    expect(
      resolveClientConfigPath('cursor', {
        homedir: () => FAKE_HOME,
        env: { BOCETO_CURSOR_CONFIG: '/cursor.json' },
      }),
    ).toBe('/cursor.json')
  })

  it('BOCETO_CLAUDE_DESKTOP_CONFIG override wins over platform default', () => {
    expect(
      resolveClientConfigPath('claude-desktop', {
        homedir: () => FAKE_HOME,
        platform: 'darwin',
        env: { BOCETO_CLAUDE_DESKTOP_CONFIG: '/cd.json' },
      }),
    ).toBe('/cd.json')
  })
})
