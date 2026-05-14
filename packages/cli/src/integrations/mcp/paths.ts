import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Resolve the JSON config path each MCP client reads. Env-var overrides
 * (`BOCETO_*_CONFIG`) win — tests and the dry-run smoke script depend on
 * them to redirect away from the real home dir.
 *
 * Claude Desktop is the only client with platform-specific paths.
 */
export type McpClientId = 'claude-code' | 'cursor' | 'claude-desktop'

export interface McpPathDeps {
  /** Override `os.homedir()` for testing. */
  homedir?: () => string
  /** Override `process.platform` for testing (`'darwin' | 'win32' | 'linux' | …`). */
  platform?: NodeJS.Platform
  /** Override `process.env` for testing. */
  env?: NodeJS.ProcessEnv
}

export function resolveClientConfigPath(
  client: McpClientId,
  deps: McpPathDeps = {},
): string {
  const home = deps.homedir ?? homedir
  const env = deps.env ?? process.env
  const platform = deps.platform ?? process.platform

  if (client === 'claude-code') {
    return env.BOCETO_CLAUDE_CODE_CONFIG ?? join(home(), '.claude.json')
  }
  if (client === 'cursor') {
    return env.BOCETO_CURSOR_CONFIG ?? join(home(), '.cursor', 'mcp.json')
  }
  // claude-desktop
  if (env.BOCETO_CLAUDE_DESKTOP_CONFIG) return env.BOCETO_CLAUDE_DESKTOP_CONFIG
  if (platform === 'darwin') {
    return join(
      home(),
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json',
    )
  }
  if (platform === 'win32') {
    const appData = env.APPDATA ?? join(home(), 'AppData', 'Roaming')
    return join(appData, 'Claude', 'claude_desktop_config.json')
  }
  // Linux / others — follow XDG.
  const configHome = env.XDG_CONFIG_HOME ?? join(home(), '.config')
  return join(configHome, 'Claude', 'claude_desktop_config.json')
}
