/**
 * Node-only default adapters for `@boceto/remark`'s `resolveImports`.
 *
 * `@boceto/remark`'s main entry is **deliberately runtime-agnostic** — it
 * never reaches for `node:fs` or `tinyglobby` itself, so browser / Tauri /
 * react-markdown consumers can bundle the plugin without dragging Node
 * built-ins into their builds (Vite would choke on the `await import('fs')`
 * static specifier even though it's gated behind dead code).
 *
 * Node consumers — Astro, Next, Docusaurus, the CLI — that want to point
 * the resolver at the file system import these adapters and pass them
 * explicitly:
 *
 *     import remarkBoceto from '@boceto/remark'
 *     import { defaultFsAdapter, defaultGlobAdapter } from '@boceto/remark/node-adapters'
 *
 *     unified().use(remarkBoceto, {
 *       resolveImports: {
 *         fs: defaultFsAdapter,
 *         glob: defaultGlobAdapter,
 *       },
 *     })
 *
 * The imports here are STATIC — when this module is loaded, `node:fs/promises`
 * and `tinyglobby` resolve at parse time. Bundlers targeting the browser
 * will refuse to evaluate this module, which is what we want: it should
 * only ever be reachable from Node entry points.
 */

import { readFile } from 'node:fs/promises'
import { glob } from 'tinyglobby'
import type { FsAdapter, GlobAdapter } from '@boceto/core'

/** Reads files from the OS file system via `node:fs/promises`. */
export const defaultFsAdapter: FsAdapter = {
  async readFile(absPath: string): Promise<Uint8Array> {
    const buf = await readFile(absPath)
    // Buffer extends Uint8Array — copy into a fresh ArrayBuffer-backed
    // view so downstream Web Crypto / TextDecoder consumers see a plain
    // Uint8Array.
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  },
}

/** Expands glob patterns via `tinyglobby`, scoped to `opts.cwd`. */
export const defaultGlobAdapter: GlobAdapter = async (pattern, opts) => {
  return glob(pattern, { cwd: opts.cwd, absolute: false })
}
