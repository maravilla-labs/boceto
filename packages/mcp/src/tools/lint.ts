import { lint, type LintReport } from '@boceto/lint'
import { z } from 'zod'

export const lintInputSchema = {
  source: z.string().describe('Boceto DSL source (raw or markdown with ```boceto fences).'),
  disable: z
    .array(z.string())
    .optional()
    .describe('Rule ids to skip (e.g. ["element-arity"]).'),
  skipParseCheck: z
    .boolean()
    .optional()
    .describe('Skip the final parse() cross-check. Default: false.'),
  imports: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(
      'Library source(s) whose `component … end` definitions feed the parse-check registry. Use when the source references components defined in another file — without this, the cross-check raises a false-positive "Unknown component" issue. Each entry may be raw DSL or a fenced markdown block.',
    ),
}

export function runLint(args: {
  source: string
  disable?: string[]
  skipParseCheck?: boolean
  imports?: string | string[]
}): LintReport {
  return lint(args.source, {
    disable: args.disable,
    skipParseCheck: args.skipParseCheck,
    imports: args.imports,
  })
}
