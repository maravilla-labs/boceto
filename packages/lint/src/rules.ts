import { ELEMENT_TYPES } from '@boceto/core'
import {
  columnFromOffset,
  countPositional,
  isKnownElementType,
  type ParsedLine,
  type RangedToken,
} from './line-parser'
import type { LintFix, LintIssue } from './types'

/**
 * Each rule returns issues with both the line and the character range of
 * the offending token. CodeMirror, VS Code, or any other editor turns
 * those ranges into precise underlines / squiggles.
 */
export type Rule = (lines: ParsedLine[]) => LintIssue[]

// ── canonical hallucination map ────────────────────────────────────────

const INVENTED_TYPE_MAP: ReadonlyMap<string, string> = new Map([
  ['frame', 'box'],
  ['container', 'box'],
  ['section', 'box'],
  ['stack', 'col'],
  ['vstack', 'col'],
  ['hstack', 'row'],
  ['group', 'row'],
  ['link', 'button'],
  ['textlink', 'button'],
  ['heading1', 'heading'],
  ['heading2', 'heading'],
  ['heading3', 'heading'],
  ['h1', 'heading'],
  ['h2', 'heading'],
  ['h3', 'heading'],
  ['subheading', 'heading'],
  ['paragraph', 'label'],
  ['text-block', 'label'],
  ['header', 'navbar'],
  ['pageheader', 'navbar'],
  ['footer', 'box'],
  ['menu-bar', 'navbar'],
  ['menubar', 'navbar'],
  ['nav', 'navbar'],
  ['topbar', 'navbar'],
  ['appbar', 'navbar'],
  ['tab', 'tabs'],
  ['tabbar', 'tabs'],
  ['tab-bar', 'tabs'],
  ['icon', 'button'],
  ['iconbutton', 'button'],
  ['icon-button', 'button'],
  ['pill', 'chip'],
  ['tag', 'chip'],
  ['Card', 'card'],
  ['Panel', 'card'],
  ['Button', 'button'],
  ['NavBar', 'navbar'],
  ['Heading', 'heading'],
  ['Input', 'input'],
  ['Textarea', 'textarea'],
  ['Sidebar', 'sidebar'],
  ['Avatar', 'avatar'],
  ['Spinner', 'spinner'],
  ['Divider', 'divider'],
  ['Spacer', 'divider'],
  ['StatusBar', 'status-bar'],
  ['HomeIndicator', 'home-indicator'],
  ['PhoneFrame', 'phone-frame'],
  ['WindowFrame', 'window-frame'],
  ['BrowserFrame', 'browser-frame'],
  ['ChatBubble', 'chat-bubble'],
  ['CodeBlock', 'code-block'],
  ['ChartBar', 'chart-bar'],
  ['ChartLine', 'chart-line'],
  ['ChartDonut', 'chart-donut'],
  ['FAB', 'fab'],
  ['Fab', 'fab'],
  ['FloatingButton', 'fab'],
])

const FLEX_ALIGN_VALUES = new Set(['start', 'middle', 'end', 'stretch'])
const TEXT_ALIGN_VALUES = new Set(['left', 'center', 'right'])

// ── rules ─────────────────────────────────────────────────────────────

/**
 * Wrong number of positional slots on an `element` line. Boceto wants
 * 6 (`TYPE X Y W H "Label"`). This rule distinguishes three failure
 * shapes that look superficially similar but require different fixes:
 *
 *   - **missing-label** — 5 slots, the 5th is unquoted. The user
 *     wrote `element chart-bar 0 0 600 260` and forgot `""`. Auto-fix:
 *     splice an empty label after H.
 *   - **missing-coord** — 5 slots, the 5th IS quoted. The user wrote
 *     `element label 100 400 22 "Edit me"` and dropped one of X/Y/W/H.
 *     Inserting `""` would be the WRONG fix — they need a numeric
 *     coord before the label. We can't tell which one was dropped, so
 *     no autofix; the message tells them exactly what to do.
 *   - **wrong-arity** — fewer than 5 positional slots. Just report the
 *     count so the user knows how many they're missing.
 */
const elementArity: Rule = (lines) => {
  const out: LintIssue[] = []
  for (const ln of lines) {
    if (ln.kind !== 'element') continue
    const positional = countPositional(ln.tokens)
    if (positional >= 6) continue

    if (positional < 5) {
      const tok = ln.tokens[Math.max(0, positional - 1)] ?? ln.keyword!
      out.push({
        rule: 'wrong-arity',
        severity: 'error',
        line: ln.lineNo,
        column: columnFromOffset(ln.indent, tok.start),
        endColumn: columnFromOffset(ln.indent, tok.end),
        message:
          `element line has only ${positional} positional slot${positional === 1 ? '' : 's'} — ` +
          `Boceto needs 6 (TYPE X Y W H "Label"). Add the missing positional args before any \`key=value\` attrs.`,
      })
      continue
    }

    // positional === 5. Disambiguate by the shape of the 5th token.
    const fifth = ln.tokens[4]!
    if (fifth.quoted) {
      out.push({
        rule: 'missing-coord',
        severity: 'error',
        line: ln.lineNo,
        column: columnFromOffset(ln.indent, fifth.start),
        endColumn: columnFromOffset(ln.indent, fifth.end),
        message:
          `element line has 5 slots ending in a quoted label, but Boceto requires 6 ` +
          `(TYPE X Y W H "Label"). One of X/Y/W/H is missing — count the numbers ` +
          `between TYPE and the label and add the dropped coord.`,
        // No autofix — we don't know which of X/Y/W/H was dropped.
      })
      continue
    }

    // True missing-label: 5 positional, 5th is unquoted.
    const insertOffset = fifth.end
    const col = columnFromOffset(ln.indent, insertOffset)
    const newTrimmed =
      ln.trimmed.slice(0, insertOffset) + ' ""' + ln.trimmed.slice(insertOffset)
    const fix: LintFix = {
      line: ln.lineNo,
      newLine: ln.indent + newTrimmed,
      label: 'insert `""` after H',
    }
    out.push({
      rule: 'missing-label',
      severity: 'error',
      line: ln.lineNo,
      column: col,
      endColumn: col,
      message:
        'element line is missing the required label slot — every element needs `element TYPE X Y W H "Label"` before any attrs. Use `""` for chrome elements that show no text.',
      fix,
    })
  }
  return out
}

const inventedType: Rule = (lines) => {
  const out: LintIssue[] = []
  for (const ln of lines) {
    if (ln.kind !== 'element' || !ln.typeToken) continue
    const { type: t, token: tok, id } = ln.typeToken
    if (isKnownElementType(t)) continue
    const real = INVENTED_TYPE_MAP.get(t) ?? INVENTED_TYPE_MAP.get(t.toLowerCase())
    if (!real) continue
    out.push({
      rule: 'invented-type',
      severity: 'error',
      line: ln.lineNo,
      // Underline only the type portion of the token, not `#id` if present.
      column: columnFromOffset(ln.indent, tok.start),
      endColumn: columnFromOffset(ln.indent, tok.start + t.length),
      message: `"${t}" is not a real Boceto element type — use \`${real}\` instead. (See references/elements.md for the full catalog of 83 types.)`,
      fix: makeReplaceTypeFix(ln, tok, t, real, id),
    })
  }
  return out
}

const unknownType: Rule = (lines) => {
  const out: LintIssue[] = []
  for (const ln of lines) {
    if (ln.kind !== 'element' || !ln.typeToken) continue
    const { type: t, token: tok } = ln.typeToken
    if (isKnownElementType(t)) continue
    if (INVENTED_TYPE_MAP.has(t) || INVENTED_TYPE_MAP.has(t.toLowerCase())) continue
    const suggestion = closestKnownType(t)
    out.push({
      rule: 'unknown-type',
      severity: 'warning',
      line: ln.lineNo,
      column: columnFromOffset(ln.indent, tok.start),
      endColumn: columnFromOffset(ln.indent, tok.start + t.length),
      message:
        `"${t}" is not a built-in element type. ` +
        (suggestion ? `Did you mean \`${suggestion}\`? ` : '') +
        'If this is a composite component you defined in this doc, ignore — otherwise check references/elements.md.',
    })
  }
  return out
}

const badCoord: Rule = (lines) => {
  const out: LintIssue[] = []
  for (const ln of lines) {
    if (ln.kind !== 'element' && ln.kind !== 'row' && ln.kind !== 'col' && ln.kind !== 'text') continue
    const startAt = ln.kind === 'element' ? 1 : 0
    const positional = countPositional(ln.tokens)

    type BadCoord = { tokIdx: number; col: number; endCol: number; old: string; fixed: number }
    const bads: BadCoord[] = []
    let coordCount = 0
    for (let i = startAt; i < positional && coordCount < 4; i++) {
      const tok = ln.tokens[i]!
      coordCount++
      if (tok.quoted) continue
      const v = tok.value
      if (v === 'auto' && coordCount >= 3) continue
      const n = Number(v)
      if (Number.isInteger(n) && n >= 0) continue
      if (!Number.isFinite(n)) continue
      const fixed = !Number.isInteger(n) ? Math.max(0, Math.round(n)) : 0
      bads.push({
        tokIdx: i,
        col: columnFromOffset(ln.indent, tok.start),
        endCol: columnFromOffset(ln.indent, tok.end),
        old: v,
        fixed,
      })
    }

    if (bads.length === 0) continue

    // Build a single consolidated fix: replace each bad coord at its
    // exact offsets, right-to-left so earlier offsets don't shift.
    let patched = ln.trimmed
    for (const b of [...bads].reverse()) {
      const tok = ln.tokens[b.tokIdx]!
      patched = patched.slice(0, tok.start) + String(b.fixed) + patched.slice(tok.end)
    }
    const fix: LintFix = {
      line: ln.lineNo,
      newLine: ln.indent + patched,
      label: 'round + clamp coords',
    }

    // Per-coord diagnostics, consolidated fix attached to the first.
    for (let k = 0; k < bads.length; k++) {
      const b = bads[k]!
      out.push({
        rule: 'bad-coord',
        severity: 'error',
        line: ln.lineNo,
        column: b.col,
        endColumn: b.endCol,
        message: `coord must be a non-negative integer — got \`${b.old}\`. Boceto's grammar rejects fractions and negatives in X/Y/W/H slots.`,
        fix: k === 0 ? fix : undefined,
      })
    }
  }
  return out
}

const alignVsTextAlign: Rule = (lines) => {
  const out: LintIssue[] = []
  for (const ln of lines) {
    if (ln.kind !== 'element') continue
    for (const tok of ln.tokens) {
      if (tok.quoted) continue
      const m = tok.value.match(/^align=([A-Za-z]+)$/)
      if (!m) continue
      const value = m[1]!
      if (FLEX_ALIGN_VALUES.has(value)) continue
      if (!TEXT_ALIGN_VALUES.has(value)) continue
      const newTrimmed =
        ln.trimmed.slice(0, tok.start) + `textAlign=${value}` + ln.trimmed.slice(tok.end)
      out.push({
        rule: 'align-vs-textAlign',
        severity: 'warning',
        line: ln.lineNo,
        column: columnFromOffset(ln.indent, tok.start),
        endColumn: columnFromOffset(ln.indent, tok.end),
        message:
          `\`align=${value}\` on an \`element\` line means flex cross-axis alignment ` +
          `(values: start|middle|end|stretch). For horizontal text alignment, use ` +
          `\`textAlign=${value}\` instead — that's the attribute the renderer consults.`,
        fix: {
          line: ln.lineNo,
          newLine: ln.indent + newTrimmed,
          label: 'rename `align` → `textAlign`',
        },
      })
    }
  }
  return out
}

const unclosedBlock: Rule = (lines) => {
  const out: LintIssue[] = []
  const stack: { line: number; kind: string; col: number; endCol: number }[] = []
  for (const ln of lines) {
    if (ln.kind === 'row' || ln.kind === 'col' || ln.kind === 'component') {
      const kw = ln.keyword!
      stack.push({
        line: ln.lineNo,
        kind: ln.kind,
        col: columnFromOffset(ln.indent, kw.start),
        endCol: columnFromOffset(ln.indent, kw.end),
      })
    } else if (ln.kind === 'end') {
      stack.pop()
    } else if (ln.kind === 'element' && ln.trimmed.endsWith(':')) {
      const kw = ln.keyword!
      stack.push({
        line: ln.lineNo,
        kind: 'element-block',
        col: columnFromOffset(ln.indent, kw.start),
        endCol: columnFromOffset(ln.indent, kw.end),
      })
    }
  }
  for (const frame of stack) {
    out.push({
      rule: 'unclosed-block',
      severity: 'error',
      line: frame.line,
      column: frame.col,
      endColumn: frame.endCol,
      message: `\`${frame.kind}\` block opened on line ${frame.line} is never closed. Add an \`end\` line.`,
    })
  }
  return out
}

/**
 * A quoted string on this line is missing its closing `"`. The Boceto
 * parser silently tolerates this (reads to end-of-line and accepts
 * whatever was inside), so the doc still "renders correctly" — but the
 * source is malformed and the next edit is almost guaranteed to break
 * something. Severity is `warning` because parse() still succeeds.
 *
 * Autofix appends `"` at the end of the line, which is the right
 * answer for the vast majority of cases (the user forgot to close
 * what they opened).
 */
const unterminatedString: Rule = (lines) => {
  const out: LintIssue[] = []
  for (const ln of lines) {
    if (ln.kind === 'blank' || ln.kind === 'comment') continue
    for (const tok of ln.tokens) {
      if (tok.closed !== false) continue
      const openAt = tok.unclosedAt ?? tok.start
      out.push({
        rule: 'unterminated-string',
        severity: 'warning',
        line: ln.lineNo,
        column: columnFromOffset(ln.indent, openAt),
        // Highlight from the orphan `"` to the end of the line.
        endColumn: columnFromOffset(ln.indent, ln.trimmed.length),
        message:
          'string literal opened with `"` but never closed before end of line. ' +
          'The parser silently accepts this and reads to the end of the line, ' +
          'but it almost always means a typo — close the string with `"`.',
        fix: {
          line: ln.lineNo,
          newLine: ln.raw + '"',
          label: 'append closing `"`',
        },
      })
    }
  }
  return out
}

export const RULES: Record<string, Rule> = {
  // The element-arity check is a single Rule that emits issues under
  // three different rule ids depending on what's wrong. Listed once
  // here so it runs once per lint pass.
  'element-arity': elementArity,
  'invented-type': inventedType,
  'unknown-type': unknownType,
  'bad-coord': badCoord,
  'align-vs-textAlign': alignVsTextAlign,
  'unclosed-block': unclosedBlock,
  'unterminated-string': unterminatedString,
}

// ── helpers ───────────────────────────────────────────────────────────

function makeReplaceTypeFix(
  ln: ParsedLine,
  tok: RangedToken,
  badType: string,
  realType: string,
  id: string | undefined,
): LintFix {
  // The bad type portion runs from tok.start to tok.start + badType.length.
  // Anything after (e.g. `#id`) is preserved.
  const replaceEnd = tok.start + badType.length
  const newTrimmed =
    ln.trimmed.slice(0, tok.start) + realType + ln.trimmed.slice(replaceEnd)
  // `id` is just for the human-readable label here; the slicing already
  // preserved it because tok.end > replaceEnd when an id is present.
  void id
  return {
    line: ln.lineNo,
    newLine: ln.indent + newTrimmed,
    label: `replace \`${badType}\` → \`${realType}\``,
  }
}

function closestKnownType(t: string): string | null {
  let best: { type: string; d: number } | null = null
  for (const real of ELEMENT_TYPES) {
    const d = editDistance(t.toLowerCase(), real)
    if (best === null || d < best.d) best = { type: real, d }
  }
  if (!best) return null
  return best.d <= Math.max(1, Math.floor(t.length / 3) + 1) ? best.type : null
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const prev = new Array(b.length + 1)
  const curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}
