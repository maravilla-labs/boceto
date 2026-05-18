import { lint, type LintIssue } from '@boceto/lint'
import { z } from 'zod'

export const fixInputSchema = {
  source: z.string().describe('Boceto DSL source to autofix.'),
  imports: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(
      'Library source(s) whose component definitions feed the parse-check registry. Pass when `source` references components defined in another file to avoid false-positive "Unknown component" parse errors.',
    ),
}

export interface FixResult {
  fixed: string
  issues: LintIssue[]
  errorCount: number
  warningCount: number
  infoCount: number
}

/**
 * Convenience wrapper: runs lint(), but the agent's expected output is the
 * rewritten source. Issues + counts come along so the caller knows what was
 * changed and whether anything was left unfixable.
 */
export function runFix(args: { source: string; imports?: string | string[] }): FixResult {
  const r = lint(args.source, { imports: args.imports })
  return {
    fixed: r.fixed,
    issues: r.issues,
    errorCount: r.errorCount,
    warningCount: r.warningCount,
    infoCount: r.infoCount,
  }
}
