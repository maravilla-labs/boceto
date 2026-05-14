/**
 * MCP client config writer. The riskiest code in this CLI — `~/.claude.json`
 * holds API keys, project history, conversation logs. Corrupting it would
 * brick Claude Code.
 *
 * Three guarantees:
 *
 *   1. **Sibling-key preserving merge.** Read the existing JSON, mutate
 *      only `mcpServers[name]`, write the rest back unchanged.
 *   2. **Atomic write.** Stage to `.boceto.tmp` and `rename()`. Either the
 *      whole new file lands or the original stays intact — no
 *      half-written states.
 *   3. **No silent backup-and-replace on malformed JSON.** If the existing
 *      file fails to parse, we bail with a clear error and ask the user to
 *      fix it manually. We will never overwrite a file we couldn't read.
 */
import { existsSync, readFileSync } from 'node:fs'
import { writeFileAtomic } from '../../util/fs'

export interface McpServerEntry {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}

export type WriteMode = 'force' | 'skip' | 'prompt'

export type WriteOutcome = 'created' | 'updated' | 'skipped'

export interface WriteMcpServerResult {
  outcome: WriteOutcome
  /** Set when outcome === 'updated' and an existing entry was replaced. */
  replaced?: McpServerEntry
}

/**
 * Read the JSON at `configPath`, set `mcpServers[name] = entry`, and write
 * it back. See module docstring for the three correctness guarantees.
 *
 * `confirmReplace` is only called in `prompt` mode when the existing
 * entry differs from the new one. Tests pass a stub; the CLI passes a
 * clack confirm wrapper.
 */
export interface WriteMcpServerOptions {
  configPath: string
  name: string
  entry: McpServerEntry
  mode: WriteMode
  /** Called only when an existing entry differs and `mode === 'prompt'`. */
  confirmReplace?: (existing: McpServerEntry, next: McpServerEntry) => Promise<boolean>
}

export async function writeMcpServer(
  options: WriteMcpServerOptions,
): Promise<WriteMcpServerResult> {
  const { configPath, name, entry, mode } = options

  // Case 1: file doesn't exist. Create from scratch.
  if (!existsSync(configPath)) {
    const fresh = { mcpServers: { [name]: entry } }
    writeFileAtomic(configPath, JSON.stringify(fresh, null, 2) + '\n')
    return { outcome: 'created' }
  }

  // Case 2: file exists. Read carefully.
  let raw: string
  try {
    raw = readFileSync(configPath, 'utf8')
  } catch (err) {
    throw new Error(
      `cannot read ${configPath}: ${(err as Error).message}. Fix permissions and retry.`,
    )
  }

  let doc: Record<string, unknown>
  try {
    doc = JSON.parse(raw) as Record<string, unknown>
  } catch (err) {
    throw new Error(
      `${configPath} is not valid JSON (${(err as Error).message}). ` +
        `Fix it manually or delete it before re-running. boceto will not overwrite a file it could not read.`,
    )
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(
      `${configPath} must contain a JSON object at the top level (found ${
        Array.isArray(doc) ? 'array' : typeof doc
      }).`,
    )
  }

  // Ensure `mcpServers` exists as an object.
  const existingServers = (doc.mcpServers ?? {}) as Record<string, McpServerEntry>
  if (typeof existingServers !== 'object' || Array.isArray(existingServers)) {
    throw new Error(
      `${configPath} has a non-object \`mcpServers\` key — refusing to overwrite. Fix manually first.`,
    )
  }

  const existing = existingServers[name]

  // Case 2a: entry deep-equals new → no-op.
  if (existing && deepEqual(existing, entry)) {
    return { outcome: 'skipped' }
  }

  // Case 2b: entry exists but differs → mode decides.
  if (existing) {
    if (mode === 'skip') {
      return { outcome: 'skipped' }
    }
    if (mode === 'prompt') {
      const approved = options.confirmReplace
        ? await options.confirmReplace(existing, entry)
        : false
      if (!approved) {
        return { outcome: 'skipped' }
      }
    }
    // mode === 'force' (or prompt approved) → fall through to write.
  }

  // Write back, preserving indentation style.
  const newServers: Record<string, McpServerEntry> = {
    ...existingServers,
    [name]: entry,
  }
  const next: Record<string, unknown> = { ...doc, mcpServers: newServers }
  const indent = detectIndent(raw)
  const trailing = raw.endsWith('\n') ? '\n' : ''
  writeFileAtomic(configPath, JSON.stringify(next, null, indent) + trailing)
  return existing
    ? { outcome: 'updated', replaced: existing }
    : { outcome: 'updated' }
}

/**
 * Detect the indentation style of an existing JSON document. JSON.stringify
 * accepts a number (spaces) or string (e.g. `\t`). Defaults to 2 — same as
 * what the existing claude-code config uses in the wild.
 */
function detectIndent(raw: string): number | string {
  const m = raw.match(/^\n?(\s+)"/m)
  if (!m) return 2
  const head = m[1]!
  if (head.startsWith('\t')) return '\t'
  return Math.max(1, Math.min(8, head.length))
}

/** Strict deep equality for JSON-like values. Arrays compared in order. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  if (typeof a !== 'object') return false
  const ka = Object.keys(a as object).sort()
  const kb = Object.keys(b as object).sort()
  if (ka.length !== kb.length) return false
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false
    if (!deepEqual((a as Record<string, unknown>)[ka[i]!], (b as Record<string, unknown>)[kb[i]!])) {
      return false
    }
  }
  return true
}

/**
 * Read the current server entry from a config file, if any. Used by `check`
 * to display what's installed without going through the merge code path.
 */
export function readMcpServer(
  configPath: string,
  name: string,
): McpServerEntry | null {
  if (!existsSync(configPath)) return null
  try {
    const raw = readFileSync(configPath, 'utf8')
    const doc = JSON.parse(raw) as Record<string, unknown>
    const servers = (doc.mcpServers ?? {}) as Record<string, McpServerEntry>
    return servers[name] ?? null
  } catch {
    return null
  }
}
