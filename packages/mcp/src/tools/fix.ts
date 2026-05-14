import { lint, type LintIssue } from '@boceto/lint'
import { z } from 'zod'

export const fixInputSchema = {
  source: z.string().describe('Boceto DSL source to autofix.'),
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
export function runFix(args: { source: string }): FixResult {
  const r = lint(args.source)
  return {
    fixed: r.fixed,
    issues: r.issues,
    errorCount: r.errorCount,
    warningCount: r.warningCount,
    infoCount: r.infoCount,
  }
}
