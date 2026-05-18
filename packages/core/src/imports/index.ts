/**
 * Cross-document component imports.
 *
 * `parse()` already accepts pre-parsed `Component[]` via the `importedComponents`
 * option. This module wraps `parse()` with file-system-aware orchestration:
 *
 *   - Extract a tiny YAML frontmatter (`boceto.import: [...]`) from a markdown
 *     or `.boceto` source.
 *   - Resolve each entry (relative path or glob) against the importer's
 *     directory, constrained to a project root.
 *   - Read + hash + parse each library file exactly once via `LibraryCache`,
 *     resolving transitive imports recursively.
 *   - Surface absolute paths of every file consulted so consumers (docs-app
 *     watch mode, CLI) can subscribe to changes.
 *
 * All I/O is injected (`fs`, `glob`) so the module is runtime-agnostic and
 * trivially testable with in-memory fixtures.
 */

import type { Component } from '../types'
import { parse } from '../parser'

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/** Parsed shape of the `boceto:` block in a doc's YAML frontmatter. */
export interface BocetoFrontmatter {
  boceto?: {
    /** Path(s) to other doc/library files whose components feed this doc. */
    import?: string | string[]
  }
}

export interface LibraryCacheEntry {
  /** sha256 of the raw file bytes — surfaced for HMR comparisons. */
  hash: string
  /**
   * Components defined in this file **plus** all transitively-imported
   * components, in resolution order. Pre-parsed so consumers can skip
   * `parse()`'s Pass-1 entirely.
   */
  components: Component[]
  /** Absolute paths of files this entry depends on (this file + transitive). */
  paths: string[]
}

export interface FsAdapter {
  readFile(absPath: string): Promise<Uint8Array>
}

export type GlobAdapter = (
  pattern: string,
  opts: { cwd: string },
) => Promise<string[]>

export interface ResolveImportsOptions {
  /** Absolute path of the file whose imports we're resolving. */
  filePath: string
  /** Raw source text (frontmatter still present). */
  source: string
  fs: FsAdapter
  glob: GlobAdapter
  cache: LibraryCache
  /**
   * Resolved paths must stay within this directory. Defaults to `dirname(filePath)`.
   * Useful when a docs-app wants to allow `../shared/*.md` but block `../../etc/...`.
   */
  projectRoot?: string
  /** Internal: paths already on the current resolution stack (cycle guard). */
  visiting?: Set<string>
}

export interface ResolveImportsResult {
  /** Components from every import, deduplicated by definition path. */
  importedComponents: Component[]
  /** Absolute paths consulted during resolution (for watch-mode subscription). */
  importedPaths: string[]
}

/**
 * In-memory cache keyed by absolute file path. Owned by the consumer (CLI
 * process, remark plugin instance, dev server) so multiple parses across a
 * build share the work. Invalidate entries when files change on disk.
 */
export class LibraryCache {
  private store = new Map<string, LibraryCacheEntry>()

  get(absPath: string): LibraryCacheEntry | undefined {
    return this.store.get(absPath)
  }

  set(absPath: string, entry: LibraryCacheEntry): void {
    this.store.set(absPath, entry)
  }

  /** Drop one file's entry. Use from a file watcher on each change. */
  invalidate(absPath: string): void {
    this.store.delete(absPath)
  }

  /** Drop every entry that depends on `absPath` (including the entry itself). */
  invalidateDependents(absPath: string): string[] {
    const dropped: string[] = []
    for (const [key, entry] of this.store) {
      if (key === absPath || entry.paths.includes(absPath)) {
        this.store.delete(key)
        dropped.push(key)
      }
    }
    return dropped
  }

  clear(): void {
    this.store.clear()
  }

  /** For tests / instrumentation: number of cached entries. */
  get size(): number {
    return this.store.size
  }
}

/** Raised for any failure during cross-document import resolution. */
export class BocetoImportError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'BocetoImportError'
    if (options?.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Frontmatter extraction
// ─────────────────────────────────────────────────────────────────────────────

const FRONTMATTER_OPEN_RE = /^---[ \t]*\r?\n/
const FRONTMATTER_CLOSE_RE = /\r?\n---[ \t]*(\r?\n|$)/

/**
 * Strip a leading `---\n…\n---\n` YAML frontmatter block. Returns the parsed
 * `boceto:` field (if any) and the body without the frontmatter. Files without
 * frontmatter pass through unchanged.
 *
 * Only `boceto.import` (string or string-array, plain or flow) is interpreted;
 * everything else in the frontmatter is ignored. We deliberately avoid pulling
 * in a full YAML parser — the contract is narrow.
 */
export function extractFrontmatter(source: string): {
  meta: BocetoFrontmatter
  body: string
} {
  const openMatch = source.match(FRONTMATTER_OPEN_RE)
  if (!openMatch || openMatch.index !== 0) return { meta: {}, body: source }
  const afterOpen = source.slice(openMatch[0].length)
  const closeMatch = afterOpen.match(FRONTMATTER_CLOSE_RE)
  if (!closeMatch || closeMatch.index === undefined) {
    return { meta: {}, body: source }
  }
  const fmText = afterOpen.slice(0, closeMatch.index)
  const body = afterOpen.slice(closeMatch.index + closeMatch[0].length)
  return { meta: parseMiniYaml(fmText), body }
}

/**
 * Minimal YAML reader scoped to `boceto.import` (string | string[] | flow list).
 * Handles indented block lists, inline scalars, flow `[a, b]` lists, and `#`
 * comments. Anything else is silently ignored.
 */
function parseMiniYaml(text: string): BocetoFrontmatter {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const stripped = stripComment(lines[i] ?? '')
    const m = stripped.match(/^(\s*)boceto\s*:\s*(.*)$/)
    if (!m) continue
    const baseIndent = m[1]!.length
    const inline = m[2]!.trim()
    if (inline) {
      // `boceto: <something>` on one line — we only model an object value, skip.
      return {}
    }
    // Walk children deeper than baseIndent.
    const boceto: { import?: string | string[] } = {}
    i++
    while (i < lines.length) {
      const childRaw = lines[i] ?? ''
      const child = stripComment(childRaw)
      if (!child.trim()) {
        i++
        continue
      }
      const childIndent = (child.match(/^(\s*)/)?.[1] ?? '').length
      if (childIndent <= baseIndent) break
      const km = child.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/)
      if (!km) {
        i++
        continue
      }
      const key = km[1]!
      const inlineVal = km[2]!.trim()
      if (key !== 'import') {
        i++
        continue
      }
      if (inlineVal) {
        boceto.import = parseScalarOrFlow(inlineVal)
        i++
        continue
      }
      // Block list: collect `  - item` lines deeper than this key's indent.
      const items: string[] = []
      i++
      while (i < lines.length) {
        const itemRaw = lines[i] ?? ''
        const item = stripComment(itemRaw)
        if (!item.trim()) {
          i++
          continue
        }
        const itemIndent = (item.match(/^(\s*)/)?.[1] ?? '').length
        if (itemIndent <= childIndent) break
        const im = item.match(/^\s*-\s*(.*)$/)
        if (im) items.push(parseScalar(im[1]!.trim()))
        i++
      }
      boceto.import = items
    }
    return { boceto }
  }
  return {}
}

function stripComment(line: string): string {
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === "'" && !inDouble) inSingle = !inSingle
    else if (c === '"' && !inSingle) inDouble = !inDouble
    else if (c === '#' && !inSingle && !inDouble) return line.slice(0, i)
  }
  return line
}

function parseScalar(s: string): string {
  const t = s.trim()
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1)
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1)
  return t
}

function parseScalarOrFlow(s: string): string | string[] {
  const t = s.trim()
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((part) => parseScalar(part.trim()))
  }
  return parseScalar(t)
}

// ─────────────────────────────────────────────────────────────────────────────
// Path helpers (POSIX-style; works on both POSIX paths and forward-slash inputs)
// ─────────────────────────────────────────────────────────────────────────────

const GLOB_CHARS_RE = /[*?[{]/

function isGlob(p: string): boolean {
  return GLOB_CHARS_RE.test(p)
}

/**
 * Resolve `pattern` against `dir`. Supports `..`/`.` segments. We deliberately
 * use a tiny POSIX-only resolver instead of `node:path` so this module stays
 * runtime-agnostic. Both POSIX (`/`) and Windows-style paths get normalised to
 * forward slashes.
 */
function resolvePath(dir: string, pattern: string): string {
  const slashed = pattern.replace(/\\/g, '/')
  const dirSlashed = dir.replace(/\\/g, '/')
  const base = slashed.startsWith('/') ? slashed : `${dirSlashed}/${slashed}`
  const parts = base.split('/')
  const out: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') {
      if (out.length === 0 && part === '') out.push('') // keep leading /
      continue
    }
    if (part === '..') {
      if (out.length > 1) out.pop()
      continue
    }
    out.push(part)
  }
  const joined = out.join('/')
  return joined || '/'
}

function dirname(p: string): string {
  const s = p.replace(/\\/g, '/')
  const i = s.lastIndexOf('/')
  if (i < 0) return '.'
  if (i === 0) return '/'
  return s.slice(0, i)
}

function isWithin(child: string, parent: string): boolean {
  const c = child.replace(/\\/g, '/')
  const p = parent.replace(/\\/g, '/').replace(/\/$/, '')
  if (c === p) return true
  return c.startsWith(p + '/')
}

// ─────────────────────────────────────────────────────────────────────────────
// Hashing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sha256 → hex. Used to surface "did the file change?" to consumers. Uses Web
 * Crypto, available in modern browsers and Node ≥ 19. Failures fall back to a
 * cheap content-length hash so the cache still works in environments without
 * `crypto.subtle` (we never use the hash for security).
 */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle
  if (subtle) {
    // Copy into a fresh ArrayBuffer — `Uint8Array` from `Buffer` or
    // `SharedArrayBuffer` doesn't satisfy `BufferSource` under strict TS lib.
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    const buf = await subtle.digest('SHA-256', copy.buffer)
    const view = new Uint8Array(buf)
    let out = ''
    for (let i = 0; i < view.length; i++) {
      const b = view[i]!
      out += (b < 16 ? '0' : '') + b.toString(16)
    }
    return out
  }
  // Fallback: cheap, not cryptographic, but stable for cache identity.
  let h = 5381
  for (let i = 0; i < bytes.length; i++) h = ((h * 33) ^ bytes[i]!) >>> 0
  return `len-${bytes.length}-${h.toString(16)}`
}

function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes)
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveBocetoImports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve every `boceto.import` declared in `opts.source`'s frontmatter into a
 * flat `Component[]` ready to pass to `parse(src, { importedComponents })`.
 *
 *  - Relative paths and globs are resolved against `dirname(opts.filePath)`.
 *  - Glob patterns are expanded via the injected `glob` adapter.
 *  - All paths must lie within `opts.projectRoot` (defaults to the importer's
 *    directory) — escapes throw `BocetoImportError`.
 *  - Library files are read, hashed, parsed, and cached on first sight.
 *    Repeated calls with the same `cache` skip the read+parse entirely.
 *  - Transitive imports resolve recursively; cycles are detected by `visiting`
 *    and silently skipped (flat namespace makes cycles benign).
 *  - Duplicate component names across imports raise `BocetoImportError` with
 *    both source paths.
 */
export async function resolveBocetoImports(
  opts: ResolveImportsOptions,
): Promise<ResolveImportsResult> {
  const visiting = opts.visiting ?? new Set<string>()
  const fileAbs = opts.filePath
  if (visiting.has(fileAbs)) {
    return { importedComponents: [], importedPaths: [] }
  }
  visiting.add(fileAbs)

  const { meta } = extractFrontmatter(opts.source)
  const patterns = normaliseImportList(meta.boceto?.import)
  if (patterns.length === 0) {
    return { importedComponents: [], importedPaths: [] }
  }

  const dir = dirname(fileAbs)
  const projectRoot = opts.projectRoot ?? dir

  // Expand patterns → absolute paths, preserving order, deduping.
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const pat of patterns) {
    if (isGlob(pat)) {
      const matches = await opts.glob(pat, { cwd: dir })
      for (const m of matches.slice().sort()) {
        const abs = resolvePath(dir, m)
        if (!seen.has(abs)) {
          seen.add(abs)
          ordered.push(abs)
        }
      }
    } else {
      const abs = resolvePath(dir, pat)
      if (!seen.has(abs)) {
        seen.add(abs)
        ordered.push(abs)
      }
    }
  }

  // Security: every resolved path must be within the project root.
  for (const p of ordered) {
    if (!isWithin(p, projectRoot)) {
      throw new BocetoImportError(
        `Import path escapes projectRoot: ${p} (root: ${projectRoot})`,
      )
    }
  }

  const collectedComponents: Component[] = []
  const collectedPaths: string[] = []
  // Track which import path supplied each component name, for duplicate errors.
  const nameOrigin = new Map<string, string>()

  for (const absPath of ordered) {
    if (visiting.has(absPath)) continue // already on the resolution stack

    let entry = opts.cache.get(absPath)
    if (!entry) {
      let bytes: Uint8Array
      try {
        bytes = await opts.fs.readFile(absPath)
      } catch (err) {
        throw new BocetoImportError(
          `Cannot read boceto import "${absPath}": ${(err as Error).message ?? String(err)}`,
          { cause: err },
        )
      }
      const hash = await sha256Hex(bytes)
      const text = bytesToString(bytes)

      // Resolve THIS library's own imports first, so its components see them.
      const child = await resolveBocetoImports({
        ...opts,
        filePath: absPath,
        source: text,
        visiting,
      })

      const { body } = extractFrontmatter(text)
      let ownComponents: Component[]
      try {
        const doc = parse(body, { importedComponents: child.importedComponents })
        ownComponents = doc.components
      } catch (err) {
        throw new BocetoImportError(
          `Failed to parse boceto import "${absPath}": ${(err as Error).message ?? String(err)}`,
          { cause: err },
        )
      }

      entry = {
        hash,
        components: [...child.importedComponents, ...ownComponents],
        paths: [absPath, ...child.importedPaths],
      }
      opts.cache.set(absPath, entry)
    }

    for (const c of entry.components) {
      const prior = nameOrigin.get(c.name)
      if (prior && prior !== absPath) {
        throw new BocetoImportError(
          `Component "${c.name}" is defined in multiple boceto imports: ${prior} and ${absPath}`,
        )
      }
      // Skip duplicates from the same origin (e.g. diamond imports).
      if (!prior) {
        nameOrigin.set(c.name, absPath)
        collectedComponents.push(c)
      }
    }
    for (const p of entry.paths) {
      if (!collectedPaths.includes(p)) collectedPaths.push(p)
    }
  }

  return { importedComponents: collectedComponents, importedPaths: collectedPaths }
}

function normaliseImportList(v: string | string[] | undefined): string[] {
  if (v == null) return []
  if (typeof v === 'string') return v ? [v] : []
  return v.filter((s) => typeof s === 'string' && s.length > 0)
}
