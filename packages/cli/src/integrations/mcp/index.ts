import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  findMcpClient,
  MCP_CLIENTS,
  MCP_CLIENT_IDS,
  type McpClient,
} from './clients'
import {
  readMcpServer,
  writeMcpServer,
  type McpServerEntry,
  type WriteMcpServerResult,
  type WriteMode,
} from './config'
import type { McpClientId, McpPathDeps } from './paths'

export {
  MCP_CLIENTS,
  MCP_CLIENT_IDS,
  findMcpClient,
  readMcpServer,
  writeMcpServer,
  type McpClient,
  type McpClientId,
  type McpServerEntry,
  type WriteMode,
  type WriteMcpServerResult,
}
export { resolveClientConfigPath } from './paths'

const DEFAULT_NPX_ENTRY: McpServerEntry = {
  command: 'npx',
  args: ['-y', '@boceto/mcp'],
}

/**
 * Build the server entry to write. With `local`, point at the built
 * `packages/mcp/dist/server.js` inside the current workspace — useful for
 * `pnpm link --global ./packages/cli` style dev loops.
 */
export function buildServerEntry(opts: { local?: boolean }): McpServerEntry {
  if (!opts.local) return DEFAULT_NPX_ENTRY
  const repoRoot = findRepoRoot()
  if (!repoRoot) {
    throw new Error(
      '--local requires running from inside the Boceto monorepo (so we can locate packages/mcp/dist/server.js). Falling back: drop --local and rely on npx.',
    )
  }
  return {
    command: 'node',
    args: [resolve(repoRoot, 'packages', 'mcp', 'dist', 'server.js')],
    cwd: repoRoot,
  }
}

/**
 * Walk up from the CLI's own module URL looking for a `pnpm-workspace.yaml`.
 * That marks the Boceto monorepo root.
 */
function findRepoRoot(): string | null {
  const here = dirname(fileURLToPath(import.meta.url))
  let dir = here
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

// ── high-level entry ────────────────────────────────────────────────────

export interface InstallMcpOptions {
  client: McpClientId
  /** Default `boceto`. Lets users run multiple instances (`--name boceto-dev`). */
  name?: string
  /** `--local`: write `node + abs-path` instead of `npx -y @boceto/mcp`. */
  local?: boolean
  /** Existing-entry handling. */
  mode?: WriteMode
  /** Test/CI hooks for path resolution. */
  pathDeps?: McpPathDeps
  /** Custom confirm fn for `prompt` mode. */
  confirmReplace?: (existing: McpServerEntry, next: McpServerEntry) => Promise<boolean>
}

export async function installMcp(
  opts: InstallMcpOptions,
): Promise<WriteMcpServerResult & { configPath: string }> {
  const client = findMcpClient(opts.client)
  if (!client) throw new Error(`unknown MCP client: ${opts.client}`)
  const configPath = client.configPath(opts.pathDeps)
  const entry = buildServerEntry({ local: opts.local })
  const result = await writeMcpServer({
    configPath,
    name: opts.name ?? 'boceto',
    entry,
    mode: opts.mode ?? 'prompt',
    confirmReplace: opts.confirmReplace,
  })
  return { ...result, configPath }
}

// ── detection ───────────────────────────────────────────────────────────

export interface DetectedMcpClient {
  client: McpClient
  configPath: string
  entry: McpServerEntry | null
}

export function detectInstalledMcpClients(
  name = 'boceto',
  pathDeps?: McpPathDeps,
): DetectedMcpClient[] {
  return MCP_CLIENT_IDS.map((id) => {
    const client = MCP_CLIENTS[id]
    const configPath = client.configPath(pathDeps)
    const entry = readMcpServer(configPath, name)
    return { client, configPath, entry }
  })
}
