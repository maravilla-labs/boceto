import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The bundled skill content lives at `node_modules/@boceto/skill/skill/`
 * after install, and at `<repo>/skill/boceto/` during workspace dev. We
 * resolve in that order so the CLI works in both modes without env vars.
 *
 * `--from-git` uses `fetchSkillFromGit()` to drop the latest skill into a
 * temp dir; downstream code treats it identically.
 */
const here = dirname(fileURLToPath(import.meta.url))

/**
 * Resolve the on-disk skill root. Walks up from the CLI's own location to
 * find either the published `@boceto/skill` package or the monorepo's
 * canonical `/skill/boceto/`. Throws on miss with the list of paths tried.
 */
export function resolveSkillRoot(): string {
  // CLI is bundled into `packages/cli/dist/cli.js` after build, or run from
  // `packages/cli/src/integrations/skill/source.ts` in tests. Both walks
  // need to find a node_modules tree containing `@boceto/skill` OR the
  // workspace `/skill/boceto/` root.
  const candidates: string[] = []
  // Walk up looking for a sibling `node_modules/@boceto/skill/skill/`.
  let dir = here
  for (let i = 0; i < 8; i++) {
    candidates.push(join(dir, 'node_modules', '@boceto', 'skill', 'skill'))
    candidates.push(join(dir, 'skill', 'boceto'))
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  for (const c of candidates) {
    if (existsSync(join(c, 'SKILL.md'))) return c
  }
  throw new Error(
    'could not locate the skill source. Looked in:\n  ' +
      candidates.slice(0, 8).join('\n  '),
  )
}

/**
 * Download the latest skill markdown straight from the `main` branch on
 * GitHub. Used by `--from-git` so users can grab unreleased changes
 * without waiting for an npm publish.
 *
 * Returns a temp directory whose layout matches the bundled skill: a
 * top-level `SKILL.md` plus a `references/` subdirectory.
 */
export async function fetchSkillFromGit(): Promise<string> {
  const base =
    'https://raw.githubusercontent.com/maravilla-labs/boceto/main/skill/boceto'
  const files = [
    'SKILL.md',
    'references/grammar.md',
    'references/layout.md',
    'references/component-doc-pattern.md',
  ]
  const tmp = mkdtempSync(join(tmpdir(), 'boceto-skill-'))
  for (const f of files) {
    const url = `${base}/${f}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`fetch ${url}: HTTP ${res.status}`)
    }
    const content = await res.text()
    const dest = join(tmp, f)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content, 'utf8')
  }
  return tmp
}

/**
 * Best-effort installed-version lookup. Reads the `package.json` next to
 * the resolved skill root (if it's an `@boceto/skill` install). Returns
 * `'unknown'` rather than throwing so `check` can show a partial report.
 */
export function readSkillVersion(skillRoot: string): string {
  // The skill is bundled at `<pkg>/skill/`, so `package.json` is one dir up.
  const pkgJsonPath = resolve(skillRoot, '..', 'package.json')
  try {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as { version?: string }
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** Fetch the latest `@boceto/skill` version from the npm registry. */
export async function fetchNpmLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch('https://registry.npmjs.org/@boceto/skill/latest')
    if (!res.ok) return null
    const data = (await res.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null
  }
}
