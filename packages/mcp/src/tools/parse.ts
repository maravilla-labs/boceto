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
  imports: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(
      'Library source(s) whose `component … end` definitions feed the component registry before `source` is parsed. Use when the source references components defined in another file. Each entry may be raw DSL or a fenced markdown block. Ignored when `raw` is set.',
    ),
}

export type ParseResult =
  | { ok: true; doc: BocetoDoc }
  | { ok: false; error: { line: number; message: string } }

export function runParse(args: {
  source: string
  raw?: boolean
  imports?: string | string[]
}): ParseResult {
  try {
    const opts =
      args.raw === undefined
        ? args.imports !== undefined
          ? { imports: args.imports }
          : undefined
        : { raw: args.raw, imports: args.raw ? undefined : args.imports }
    const doc = parse(args.source, opts)
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
