import type { AttrValue, ElementType } from '@boceto/core'

/**
 * Per-element attribute schemas — what extra `key=value` attributes each
 * element type accepts. Used by `<boceto-inspector>` to render the right
 * typed inputs (number / select / text / color / checkbox / pipe-list) for
 * the current selection. Source: `spec/boceto-spec.md` §5.2.
 *
 * Generic text-rendering attrs (`fontSize`, `overflow`, `textAlign`,
 * `minFontSize`) and visual decorators (`border`, `shadow`) are handled in
 * the inspector's common sections and intentionally NOT listed here.
 */

export type AttrKind =
  | 'number'
  | 'string'
  | 'enum'
  | 'pipe-list'
  | 'comma-list'
  | 'color'
  | 'bool'

export interface AttrSpec {
  key: string
  kind: AttrKind
  /** Allowed values for `kind: 'enum'`. */
  enum?: readonly string[]
  /** Suggested default — used as the initial input value when the attr is
   *  absent. Stored on commit only when the user explicitly sets it. */
  default?: AttrValue
  /** Short tooltip shown beside the input. */
  hint?: string
}

const ITEMS = (def: string, hint = 'Pipe-separated items'): AttrSpec => ({
  key: 'items',
  kind: 'pipe-list',
  default: def,
  hint,
})

export const ATTR_SCHEMAS: Partial<Record<ElementType, readonly AttrSpec[]>> = {
  // ── Layout ───────────────────────────────────────────────────────────
  navbar: [ITEMS('Home|About|Contact', 'Right-aligned menu items')],
  sidebar: [
    ITEMS('Home|Inbox|Settings', 'Sidebar rows'),
    { key: 'active', kind: 'number', default: 0, hint: '0-based index' },
    { key: 'collapsed', kind: 'bool', default: 'false', hint: 'Icon-only mode' },
  ],

  // ── Form ─────────────────────────────────────────────────────────────
  tabs: [
    { key: 'tabNames', kind: 'pipe-list', default: 'Tab 1|Tab 2|Tab 3' },
    { key: 'active', kind: 'number', default: 0, hint: '0-based index' },
  ],
  'segmented-control': [
    { key: 'items', kind: 'pipe-list', default: 'Day|Week|Month' },
    { key: 'active', kind: 'number', default: 0 },
  ],
  switch: [{ key: 'on', kind: 'bool', default: 'false' }],
  slider: [
    { key: 'value', kind: 'number', default: 50 },
    { key: 'min', kind: 'number', default: 0 },
    { key: 'max', kind: 'number', default: 100 },
  ],
  'range-slider': [
    { key: 'low', kind: 'number', default: 25 },
    { key: 'high', kind: 'number', default: 75 },
    { key: 'min', kind: 'number', default: 0 },
    { key: 'max', kind: 'number', default: 100 },
  ],
  search: [{ key: 'value', kind: 'string', hint: 'Current search text' }],
  'tag-input': [
    { key: 'tags', kind: 'pipe-list', default: 'design|wireframe|ui' },
  ],

  // ── Media ────────────────────────────────────────────────────────────

  // ── Content ──────────────────────────────────────────────────────────
  list: [ITEMS('Item one|Item two|Item three', 'Bullet list items')],
  table: [
    { key: 'headers', kind: 'pipe-list', default: 'Col 1|Col 2|Col 3' },
    {
      key: 'data',
      kind: 'string',
      hint: '"r1c1|r1c2;r2c1|r2c2" — `;` between rows, `|` between cells',
    },
    { key: 'rows', kind: 'number', default: 4 },
    { key: 'cols', kind: 'number', default: 3 },
  ],
  badge: [
    { key: 'badgeColor', kind: 'color', default: '#e94560' },
  ],
  progress: [
    { key: 'progress', kind: 'number', default: 60, hint: '0–100' },
  ],
  pagination: [
    { key: 'current', kind: 'number', default: 2 },
    { key: 'total', kind: 'number', default: 10 },
  ],
  alert: [
    { key: 'alertColor', kind: 'color', default: '#4a90d9' },
  ],
  chip: [
    { key: 'closable', kind: 'bool', default: 'false' },
    { key: 'chipColor', kind: 'color', default: '#e4e4e7' },
  ],
  'code-block': [
    { key: 'lang', kind: 'string', hint: 'e.g. js, ts, py' },
  ],
  accordion: [{ key: 'expanded', kind: 'bool', default: 'false' }],
  'chat-bubble': [
    { key: 'side', kind: 'enum', enum: ['left', 'right'], default: 'left' },
    { key: 'bubbleColor', kind: 'color' },
    { key: 'textColor', kind: 'color' },
  ],
  calendar: [
    { key: 'month', kind: 'number', default: 1, hint: '1–12' },
    { key: 'year', kind: 'number', default: 2026 },
    { key: 'selected', kind: 'number', hint: 'Highlighted day-of-month' },
  ],
  stepper: [
    { key: 'steps', kind: 'pipe-list', default: 'Cart|Address|Payment|Done' },
    { key: 'active', kind: 'number', default: 1 },
  ],
  rating: [
    { key: 'value', kind: 'number', default: 3, hint: '0–5' },
    { key: 'max', kind: 'number', default: 5 },
  ],
  carousel: [
    { key: 'slides', kind: 'number', default: 4 },
    { key: 'active', kind: 'number', default: 0 },
  ],

  // ── Navigation / overlays ────────────────────────────────────────────
  'dropdown-menu': [
    {
      key: 'items',
      kind: 'pipe-list',
      default: 'Edit|Duplicate|---|Delete',
      hint: 'Use `---` for a separator',
    },
  ],
  tooltip: [
    {
      key: 'arrow',
      kind: 'enum',
      enum: ['top', 'bottom', 'left', 'right'],
      default: 'top',
    },
  ],
  toast: [
    {
      key: 'variant',
      kind: 'enum',
      enum: ['info', 'success', 'warn', 'error'],
      default: 'info',
    },
  ],

  // ── Feedback ─────────────────────────────────────────────────────────
  skeleton: [{ key: 'lines', kind: 'number', default: 3 }],

  // ── Data viz ─────────────────────────────────────────────────────────
  'chart-bar': [
    { key: 'data', kind: 'comma-list', default: '3,5,2,7,4' },
  ],
  'chart-line': [
    { key: 'data', kind: 'comma-list', default: '3,5,2,7,4,6,5' },
  ],
  'chart-donut': [
    { key: 'data', kind: 'comma-list', default: '40,30,20,10' },
  ],
  'chart-area': [
    { key: 'data', kind: 'comma-list', default: '2,4,3,5,4,6,5' },
  ],
  'chart-sparkline': [
    { key: 'data', kind: 'comma-list', default: '1,3,2,4,3,5' },
  ],
  gantt: [{ key: 'tasks', kind: 'number', default: 5 }],

  // ── Mobile / system chrome ───────────────────────────────────────────
  'phone-frame': [
    {
      key: 'model',
      kind: 'enum',
      enum: ['iphone', 'android', 'generic'],
      default: 'iphone',
    },
  ],
  'app-icon': [
    { key: 'bg', kind: 'color', default: '#3b82c4' },
    { key: 'glyph', kind: 'string', hint: 'Single character / emoji' },
    { key: 'badge', kind: 'number', hint: 'Notification count' },
  ],
  'browser-frame': [
    { key: 'url', kind: 'string', default: 'example.com' },
  ],
  terminal: [
    { key: 'prompt', kind: 'string', default: '$' },
  ],
}

/** Look up the schema for a given element type. Returns an empty array when
 *  no type-specific attrs are defined. */
export function attrsFor(type: ElementType | string): readonly AttrSpec[] {
  return (ATTR_SCHEMAS[type as ElementType] ?? []) as readonly AttrSpec[]
}
