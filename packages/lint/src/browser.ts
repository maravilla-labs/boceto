/**
 * Browser-friendly entry. Re-exports the public lint API and is bundled
 * by tsup with `@boceto/core` inlined so the playground / any other
 * static HTML page can load it via a single `<script type="module">`.
 */
export { lint, applyFixes, RULES } from './index'
export type {
  LintIssue,
  LintFix,
  LintReport,
  LintOptions,
  Severity,
} from './index'
