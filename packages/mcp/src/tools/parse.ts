import { parse, BocetoParseError, type BocetoDoc } from '@boceto/core'
import { z } from 'zod'

export const parseInputSchema = {
  source: z
    .string()
    .describe(
      'Boceto DSL source. Accepts either a raw page body or a markdown string containing ```boceto fences.',
    ),
  raw: z
    .boolean()
    .optional()
    .describe(
      'Force-parse as a single raw page body (skip the markdown-fence pre-scan). Default: auto-detect.',
    ),
}

export type ParseResult =
  | { ok: true; doc: BocetoDoc }
  | { ok: false; error: { line: number; message: string } }

export function runParse(args: { source: string; raw?: boolean }): ParseResult {
  try {
    const doc = parse(args.source, args.raw === undefined ? undefined : { raw: args.raw })
    return { ok: true, doc }
  } catch (err) {
    const pe = err as BocetoParseError
    return {
      ok: false,
      error: {
        line: pe.line ?? 1,
        message: pe.message ?? String(err),
      },
    }
  }
}
