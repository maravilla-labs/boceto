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
}

export function runLint(args: {
  source: string
  disable?: string[]
  skipParseCheck?: boolean
}): LintReport {
  return lint(args.source, {
    disable: args.disable,
    skipParseCheck: args.skipParseCheck,
  })
}
