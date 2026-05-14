import { parse, BocetoParseError } from '@boceto/core'
import { parseLine } from './line-parser'
import { RULES } from './rules'
import type { LintIssue, LintOptions, LintReport } from './types'

/**
 * Lint Boceto source. Returns issues + an autofixed copy of the source.
 *
 * The flow:
 *   1. Split source into lines + tokenize each one.
 *   2. Run every rule (minus anything in `options.disable`).
 *   3. Apply autofixes to produce `fixed`.
 *   4. Cross-check by running `@boceto/core`'s `parse()` on `fixed` —
 *      if it still fails, surface the parser's error as a final
 *      `parse-error` issue. This catches things the rules don't cover
 *      directly (e.g. malformed component bodies, unsupported
 *      slot nesting).
 *
 * Multi-line markdown sources with ```boceto fences are linted as
 * one input — the linter is line-oriented and doesn't care about
 * fence boundaries, but rules that depend on doc-level structure
 * (unclosed-block, parse-error) will scope correctly.
 */
export function lint(source: string, options: LintOptions = {}): LintReport {
  const disabled = new Set(options.disable ?? [])

  // Run rules iteratively. Some lines carry more than one issue
  // (e.g. `element Frame 0 0 600 400` triggers both `invented-type` AND
  // `missing-label`); the first-pass autofixes might unblock issues that
  // only become visible after the first rewrite. After each pass we
  // apply available fixes and re-lint. Cap at MAX_PASSES so the loop
  // terminates even when a rule is somehow stuck.
  const MAX_PASSES = 6
  let current = source
  let allIssues: LintIssue[] = []
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const lines = current.split('\n').map((raw, i) => parseLine(raw, i + 1))
    const passIssues: LintIssue[] = []
    for (const [name, rule] of Object.entries(RULES)) {
      if (disabled.has(name)) continue
      passIssues.push(...rule(lines))
    }
    passIssues.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule))

    // The issues we surface to the caller come from the FIRST pass — they
    // describe what was wrong with the user's *original* source. Later
    // passes feed into the autofix loop only.
    if (pass === 0) allIssues = passIssues

    const fixableThisPass = passIssues.filter((i) => i.fix)
    if (fixableThisPass.length === 0) break
    current = applyFixes(current, fixableThisPass)
  }

  // Cross-check the final state with the real parser.
  // Parser-reported line numbers are RELATIVE TO THE BLOCK (not the
  // file), so for markdown sources with ```boceto fences we have to map
  // them back to absolute file lines. We do that by walking each fence
  // and parsing its body separately — that way we know exactly which
  // fence threw and what its body's offset is.
  if (!options.skipParseCheck) {
    const fences = findBocetoFences(current)
    if (fences.length === 0) {
      // No fences — treat as raw DSL (one block at file line 1).
      const isRaw = !current.includes('```') && !/^---/m.test(current.trim())
      try {
        parse(current, { raw: isRaw })
      } catch (err) {
        const pe = err as BocetoParseError
        allIssues.push(parseErrorIssue(pe, 0))
      }
    } else {
      for (const fence of fences) {
        try {
          // Parse each fence as a raw single block — the body's first line
          // sits at `fence.bodyStartLine` in the original source.
          parse(fence.body, { raw: true })
        } catch (err) {
          const pe = err as BocetoParseError
          // Parser's line is 1-based within the body. Absolute file line
          // is bodyStartLine + (pe.line - 1).
          const offset = fence.bodyStartLine - 1
          allIssues.push(parseErrorIssue(pe, offset))
        }
      }
    }
  }

  const errorCount = allIssues.filter((i) => i.severity === 'error').length
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length
  const infoCount = allIssues.filter((i) => i.severity === 'info').length

  return { issues: allIssues, fixed: current, errorCount, warningCount, infoCount }
}

/**
 * Locate every ```boceto fence in a markdown source. Returns each
 * fence's body text and the line number where that body starts in the
 * original source. Used to map parser-reported (within-block)
 * line numbers back to absolute file line numbers.
 */
function findBocetoFences(source: string): { body: string; bodyStartLine: number }[] {
  const lines = source.split('\n')
  const fences: { body: string; bodyStartLine: number }[] = []
  let inFence = false
  let bodyStart = -1
  const bodyLines: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (!inFence) {
      // Match opening: ```boceto / ```boceto:Name (allow whitespace before)
      if (/^\s*```boceto(?::[^\s`]+)?\s*$/.test(line)) {
        inFence = true
        bodyStart = i + 2 // 1-based: the line AFTER this opener
        bodyLines.length = 0
      }
    } else {
      if (/^\s*```\s*$/.test(line)) {
        fences.push({ body: bodyLines.join('\n'), bodyStartLine: bodyStart })
        inFence = false
        bodyStart = -1
        bodyLines.length = 0
      } else {
        bodyLines.push(line)
      }
    }
  }
  // Unclosed fence — still surface its content for parse-checking.
  if (inFence && bodyStart > 0) {
    fences.push({ body: bodyLines.join('\n'), bodyStartLine: bodyStart })
  }
  return fences
}

function parseErrorIssue(pe: BocetoParseError, lineOffset: number): LintIssue {
  const line = (pe.line ?? 1) + lineOffset
  return {
    rule: 'parse-error',
    severity: 'error',
    line,
    column: 1,
    endColumn: 1,
    message: pe.message,
  }
}

/**
 * Apply every fix attached to an issue list and return the rewritten
 * source. Idempotent: re-applying a fix to already-fixed source is a
 * no-op because the matcher only fires when the issue is still present.
 */
export function applyFixes(source: string, issues: readonly LintIssue[]): string {
  const lines = source.split('\n')
  // line number → final patched value
  const patched = new Map<number, string>()
  for (const issue of issues) {
    if (!issue.fix) continue
    // Later fixes for the same line override earlier ones — rules emit in
    // a deterministic order. `applyFixes` is called by `lint()` AFTER
    // every rule has run, so combining is fine.
    patched.set(issue.fix.line, issue.fix.newLine)
  }
  if (patched.size === 0) return source
  for (const [lineNo, newLine] of patched) {
    lines[lineNo - 1] = newLine
  }
  return lines.join('\n')
}
