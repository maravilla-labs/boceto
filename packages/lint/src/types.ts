/**
 * Severity levels for lint issues. `error` indicates the source won't parse
 * as-is (the linter caught what `parse()` would throw on, plus a few
 * pre-parse problems like negative coords); `warning` is "this parses but
 * is probably not what you meant"; `info` is style guidance.
 */
export type Severity = 'error' | 'warning' | 'info'

/**
 * A single autofix proposal. `apply()` returns the rewritten source with
 * the fix applied. Carries `line` and the patch payload in a shape that
 * `applyFixes()` can merge — multiple fixes on the same line are
 * coalesced safely.
 */
export interface LintFix {
  /** 1-based line number to patch. */
  line: number
  /** New full line content (replaces the existing line). */
  newLine: string
  /** Short human label for UIs ("insert `\"\"` after H", "replace `align` with `textAlign`", …). */
  label: string
}

export interface LintIssue {
  /** Machine-readable rule id (e.g. `missing-label`, `invented-type`). */
  rule: string
  severity: Severity
  /** 1-based line in the original source. */
  line: number
  /**
   * 1-based column where the offending token starts. Inclusive — points at
   * the first character of the problem token. With `endColumn`, this lets
   * editors underline the exact span instead of the whole line.
   */
  column: number
  /**
   * 1-based column just past the end of the offending span. For zero-width
   * issues (e.g. "you should insert `""` here") `endColumn === column`.
   */
  endColumn: number
  /** Human-readable message; safe for inline display in editors. */
  message: string
  /** Optional autofix. When present, `applyFixes()` can rewrite the source. */
  fix?: LintFix
}

export interface LintReport {
  /** Every issue found, in source order. */
  issues: LintIssue[]
  /**
   * The source rewritten with every available autofix applied. When no
   * fixes are available this is identical to the input. The fixed source
   * is guaranteed to lint at least as cleanly as the input.
   */
  fixed: string
  /** Convenience counts. */
  errorCount: number
  warningCount: number
  infoCount: number
}

export interface LintOptions {
  /**
   * Rules to disable by id. The default rule set runs everything except
   * what's listed here. Useful for projects that have intentionally
   * deviated (e.g. an in-house element pack that adds new types).
   */
  disable?: string[]
  /**
   * Skip the final `parse()` cross-check from `@boceto/core`. Default
   * `false` — the linter normally runs parse on the fixed source and
   * surfaces any remaining error as a `parse-error` issue.
   */
  skipParseCheck?: boolean
  /**
   * Library sources whose `component … end` definitions feed the
   * parse-check registry. Use this when linting a page that references
   * components defined in another file — without it, the cross-check
   * raises a false-positive "Unknown component" issue.
   *
   * Each entry may be raw DSL or a fenced markdown block. Forwarded to
   * `parse(src, { imports })`.
   */
  imports?: string | string[]
  /**
   * Pre-parsed components feeding the parse-check registry. Faster path
   * than `imports` when the caller already holds parsed components (e.g.
   * from `resolveBocetoImports` + `LibraryCache`).
   */
  importedComponents?: ReadonlyArray<import('@boceto/core').Component>
}
