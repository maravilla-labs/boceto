import { homedir } from 'node:os'
import { resolveClientConfigPath, type McpClientId, type McpPathDeps } from './paths'

/**
 * Three MCP clients we know how to configure. The label and shortPath are
 * shown in the interactive picker; `id` is the canonical CLI name.
 */
export interface McpClient {
  id: McpClientId
  label: string
  /** Human-friendly path string (with `~` collapsed). */
  shortPath: (deps?: McpPathDeps) => string
  /** Resolved absolute path. */
  configPath: (deps?: McpPathDeps) => string
}

export const MCP_CLIENTS: Record<McpClientId, McpClient> = {
  'claude-code': {
    id: 'claude-code',
    label: 'Claude Code',
    shortPath: (deps) => collapseHome(resolveClientConfigPath('claude-code', deps), deps),
    configPath: (deps) => resolveClientConfigPath('claude-code', deps),
  },
  cursor: {
    id: 'cursor',
    label: 'Cursor',
    shortPath: (deps) => collapseHome(resolveClientConfigPath('cursor', deps), deps),
    configPath: (deps) => resolveClientConfigPath('cursor', deps),
  },
  'claude-desktop': {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    shortPath: (deps) => collapseHome(resolveClientConfigPath('claude-desktop', deps), deps),
    configPath: (deps) => resolveClientConfigPath('claude-desktop', deps),
  },
}

export const MCP_CLIENT_IDS = Object.keys(MCP_CLIENTS) as McpClientId[]

export function findMcpClient(id: string): McpClient | null {
  return (MCP_CLIENTS as Record<string, McpClient>)[id] ?? null
}

function collapseHome(p: string, deps: McpPathDeps = {}): string {
  const home = (deps.homedir ?? homedir)()
  if (p.startsWith(home)) return '~' + p.slice(home.length)
  return p
}
