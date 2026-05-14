/**
 * Filesystem helpers. The atomic write is the most important one — used by
 * the MCP config writer to avoid leaving the user's `~/.claude.json` (which
 * holds API keys + project history) in a half-written state.
 */
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Write `data` to `path` via a temp file + atomic rename. Either the entire
 * new content lands on disk or the original file is untouched — no
 * intermediate states a reader could observe.
 */
export function writeFileAtomic(path: string, data: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}.boceto.tmp`
  writeFileSync(tmp, data, 'utf8')
  renameSync(tmp, path)
}

export function pathExists(path: string): boolean {
  return existsSync(path)
}
