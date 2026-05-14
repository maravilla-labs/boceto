import * as p from '@clack/prompts'
import { MCP_CLIENTS, type McpClient } from './clients'
import type { McpClientId, McpPathDeps } from './paths'
import type { McpServerEntry } from './config'

/**
 * Ask the user which MCP client to configure. Returns null on cancel so
 * the caller bails without writing.
 */
export async function pickMcpClient(
  defaultId: McpClientId | null = null,
  pathDeps?: McpPathDeps,
): Promise<McpClientId | null> {
  const result = await p.select({
    message: 'Pick an MCP client',
    initialValue: defaultId ?? 'claude-code',
    options: ([
      'claude-code',
      'cursor',
      'claude-desktop',
    ] as McpClientId[]).map((id) => clientOption(MCP_CLIENTS[id], pathDeps)),
  })
  if (p.isCancel(result)) return null
  return result as McpClientId
}

function clientOption(client: McpClient, pathDeps?: McpPathDeps) {
  return {
    value: client.id,
    label: client.label,
    hint: client.shortPath(pathDeps),
  }
}

/**
 * Ask whether to replace an existing entry. Used when the merge sees a
 * mismatch and the caller invoked `prompt` mode.
 */
export async function confirmReplaceServerEntry(
  existing: McpServerEntry,
  next: McpServerEntry,
): Promise<boolean> {
  const result = await p.confirm({
    message: `Replace existing \`mcpServers.boceto\` entry?`,
    initialValue: false,
  })
  if (p.isCancel(result)) return false
  void existing
  void next
  return result === true
}
