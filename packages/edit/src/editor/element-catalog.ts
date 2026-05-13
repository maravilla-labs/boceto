import type { ElementType } from '@boceto/core'

/**
 * The 83 v0.1 element types grouped by purpose. Used by the palette to
 * organise the picker into scannable sections. Order matches the source
 * order in `@boceto/core`'s `ELEMENT_TYPES` for stability.
 */
export interface ElementCategory {
  name: string
  /** Default `w` / `h` used when the palette inserts an instance — chosen to
   *  match the typical proportions of each element type. Authors can resize
   *  immediately after via the canvas handles. */
  types: { type: ElementType; w: number; h: number; label?: string }[]
}

export const ELEMENT_CATALOG: ElementCategory[] = [
  {
    name: 'Layout',
    types: [
      { type: 'box', w: 200, h: 120, label: 'Box' },
      { type: 'card', w: 280, h: 160, label: 'Card' },
      { type: 'modal', w: 420, h: 260, label: 'Modal' },
      { type: 'navbar', w: 600, h: 44, label: 'Navbar' },
      { type: 'divider', w: 300, h: 1 },
      { type: 'sidebar', w: 220, h: 360, label: 'Sidebar' },
    ],
  },
  {
    name: 'Typography',
    types: [
      { type: 'heading', w: 400, h: 32, label: 'Heading' },
      { type: 'label', w: 200, h: 22, label: 'Text label' },
      { type: 'breadcrumb', w: 320, h: 24 },
    ],
  },
  {
    name: 'Form',
    types: [
      { type: 'input', w: 240, h: 36, label: 'Placeholder…' },
      { type: 'textarea', w: 240, h: 120, label: '' },
      { type: 'button', w: 120, h: 36, label: 'Button' },
      { type: 'primary-button', w: 140, h: 36, label: 'Submit' },
      { type: 'select', w: 200, h: 36, label: 'Choose…' },
      { type: 'checkbox', w: 160, h: 24, label: 'Option' },
      { type: 'radio', w: 160, h: 24, label: 'Option' },
      { type: 'switch', w: 80, h: 28 },
      { type: 'slider', w: 200, h: 24 },
      { type: 'range-slider', w: 200, h: 24 },
      { type: 'search', w: 280, h: 36, label: 'Search…' },
      { type: 'segmented-control', w: 240, h: 32 },
      { type: 'combobox', w: 220, h: 36, label: 'Pick one…' },
      { type: 'date-picker', w: 200, h: 36, label: 'Pick a date' },
      { type: 'color-picker', w: 180, h: 36 },
      { type: 'file-upload', w: 280, h: 80, label: 'Drop a file' },
      { type: 'rating', w: 140, h: 24 },
      { type: 'otp-input', w: 220, h: 40 },
      { type: 'tag-input', w: 260, h: 40 },
      { type: 'stepper-input', w: 120, h: 32, label: '0' },
    ],
  },
  {
    name: 'Media',
    types: [
      { type: 'image', w: 240, h: 160, label: 'Image' },
      { type: 'video', w: 280, h: 160, label: 'Video' },
      { type: 'avatar', w: 48, h: 48 },
    ],
  },
  {
    name: 'Content',
    types: [
      { type: 'list', w: 240, h: 160 },
      { type: 'table', w: 320, h: 180 },
      { type: 'tabs', w: 320, h: 200, label: '' },
      { type: 'badge', w: 60, h: 22, label: 'New' },
      { type: 'progress', w: 200, h: 18 },
      { type: 'pagination', w: 240, h: 32 },
      { type: 'alert', w: 320, h: 56, label: 'Alert message here' },
      { type: 'chip', w: 90, h: 26, label: 'Chip' },
      { type: 'code-block', w: 320, h: 140 },
      { type: 'accordion', w: 320, h: 80, label: 'Section title' },
      { type: 'chat-bubble', w: 240, h: 60, label: 'Hi there' },
      { type: 'calendar', w: 240, h: 220 },
      { type: 'tree', w: 220, h: 180 },
      { type: 'stepper', w: 320, h: 56 },
      { type: 'carousel', w: 320, h: 180 },
      { type: 'popover', w: 220, h: 120, label: 'Popover' },
      { type: 'kbd', w: 36, h: 22, label: '⌘K' },
      { type: 'quote', w: 320, h: 100, label: 'Quoted text…' },
      { type: 'status-dot', w: 12, h: 12 },
      { type: 'notification-bell', w: 32, h: 32 },
      { type: 'mention', w: 90, h: 22, label: '@name' },
      { type: 'ai-suggestion', w: 320, h: 60, label: 'Try: summarize this thread' },
      { type: 'presence-cursor', w: 18, h: 18, label: 'You' },
    ],
  },
  {
    name: 'Navigation / overlays',
    types: [
      { type: 'dropdown-menu', w: 200, h: 140 },
      { type: 'tooltip', w: 100, h: 28, label: 'Tooltip' },
      { type: 'toast', w: 320, h: 56, label: 'Toast notification' },
    ],
  },
  {
    name: 'Feedback',
    types: [
      { type: 'spinner', w: 32, h: 32 },
      { type: 'skeleton', w: 240, h: 80 },
    ],
  },
  {
    name: 'Data viz',
    types: [
      { type: 'chart-bar', w: 240, h: 160 },
      { type: 'chart-line', w: 240, h: 160 },
      { type: 'chart-donut', w: 180, h: 180 },
      { type: 'chart-area', w: 240, h: 160 },
      { type: 'chart-sparkline', w: 140, h: 40 },
      { type: 'gantt', w: 320, h: 180 },
      { type: 'heatmap', w: 240, h: 160 },
      { type: 'map', w: 280, h: 180 },
      { type: 'code-diff', w: 320, h: 200 },
    ],
  },
  {
    name: 'Mobile chrome',
    types: [
      { type: 'phone-frame', w: 320, h: 600 },
      { type: 'status-bar', w: 320, h: 24 },
      { type: 'home-indicator', w: 320, h: 8 },
      { type: 'fab', w: 56, h: 56, label: '+' },
      { type: 'app-icon', w: 72, h: 96, label: 'App' },
    ],
  },
  {
    name: 'System chrome',
    types: [
      { type: 'window-frame', w: 400, h: 300 },
      { type: 'browser-frame', w: 480, h: 320 },
      { type: 'terminal', w: 400, h: 240 },
    ],
  },
  {
    name: 'AR / spatial',
    types: [
      { type: 'glass-window', w: 300, h: 200 },
      { type: 'gaze-cursor', w: 32, h: 32 },
      { type: 'pinch-indicator', w: 60, h: 60 },
      { type: 'volumetric-scene', w: 300, h: 200 },
      { type: 'passthrough-frame', w: 320, h: 200 },
      { type: 'voice-input', w: 280, h: 56 },
    ],
  },
]

/**
 * Flat lookup for searching by type name. Returns the catalog entry (default
 * size + suggested label) so the palette can insert a sensible instance.
 */
const FLAT = new Map(
  ELEMENT_CATALOG.flatMap((c) =>
    c.types.map((t) => [t.type, { ...t, category: c.name }] as const),
  ),
)

export function catalogEntry(type: ElementType): {
  type: ElementType
  w: number
  h: number
  label?: string
  category: string
} | null {
  return FLAT.get(type) ?? null
}
