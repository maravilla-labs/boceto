/**
 * Hand-rolled argv parser. The CLI surface is small enough (7 subcommands,
 * a handful of boolean flags) that pulling in `commander` or `yargs` —
 * roughly 200 KB combined — would dominate the `npx boceto` cold-start.
 *
 * Recognises:
 *   - bare positionals
 *   - `--flag` (boolean)
 *   - `--key=value`
 *   - `--key value` (next token consumed)
 *   - `-x` short flag (treated as boolean)
 *
 * Anything not matching becomes a positional. Order of positionals is
 * preserved.
 */
export interface ParsedArgs {
  positional: string[]
  flags: Record<string, string | boolean>
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!
    if (tok === '--') {
      // Everything after `--` is positional, even if it looks like a flag.
      positional.push(...argv.slice(i + 1))
      break
    }
    if (tok.startsWith('--')) {
      const body = tok.slice(2)
      const eq = body.indexOf('=')
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1)
      } else {
        // Peek ahead: if the next token isn't a flag, treat it as the value.
        const peek = argv[i + 1]
        if (peek != null && !peek.startsWith('-')) {
          flags[body] = peek
          i += 1
        } else {
          flags[body] = true
        }
      }
    } else if (tok.startsWith('-') && tok.length > 1) {
      flags[tok.slice(1)] = true
    } else {
      positional.push(tok)
    }
  }
  return { positional, flags }
}

/** Convenience: read a boolean flag, accepting either the long name or any of the given aliases. */
export function getBool(flags: Record<string, string | boolean>, ...names: string[]): boolean {
  return names.some((n) => flags[n] === true || flags[n] === 'true')
}

/** Convenience: read a string flag (returns undefined if absent). */
export function getString(
  flags: Record<string, string | boolean>,
  ...names: string[]
): string | undefined {
  for (const n of names) {
    const v = flags[n]
    if (typeof v === 'string') return v
  }
  return undefined
}
