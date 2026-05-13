/**
 * Boceto v0.1 element types. See spec §5.
 */
export const ELEMENT_TYPES = [
  // Layout
  'box', 'card', 'modal', 'navbar', 'divider', 'sidebar',
  // Typography
  'heading', 'label', 'breadcrumb',
  // Form
  'input', 'textarea', 'button', 'primary-button', 'select', 'checkbox', 'radio',
  'switch', 'slider', 'search', 'segmented-control',
  // Media
  'image', 'video', 'avatar',
  // Content
  'list', 'table', 'tabs', 'badge', 'progress', 'pagination', 'alert',
  'chip', 'code-block', 'accordion', 'chat-bubble', 'calendar',
  // Navigation / overlays
  'dropdown-menu', 'tooltip', 'toast',
  // Feedback
  'spinner', 'skeleton',
  // Data viz
  'chart-bar', 'chart-line', 'chart-donut',
  // Mobile chrome
  'phone-frame', 'status-bar', 'home-indicator', 'fab', 'app-icon',
  // System chrome
  'window-frame', 'browser-frame', 'terminal',
  // Form (long-tail)
  'combobox', 'date-picker', 'color-picker', 'file-upload', 'rating',
  'otp-input', 'tag-input', 'stepper-input', 'range-slider',
  // Content (long-tail)
  'tree', 'stepper', 'carousel', 'popover', 'kbd', 'quote',
  'status-dot', 'notification-bell', 'mention', 'ai-suggestion', 'presence-cursor',
  // Data viz (long-tail)
  'chart-area', 'chart-sparkline', 'gantt', 'heatmap', 'map', 'code-diff',
  // AR / spatial
  'glass-window', 'gaze-cursor', 'pinch-indicator', 'volumetric-scene',
  'passthrough-frame', 'voice-input',
] as const

export type ElementType = (typeof ELEMENT_TYPES)[number]

export type AttrValue = string | number

export interface Element {
  id: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number
  label: string
  note?: string
  attrs: Record<string, AttrValue>
}

export interface Arrow {
  id: string
  from: string
  to: string
  label?: string
}

/**
 * A user-defined composite component. Defined once in a `component NAME(p1, p2)
 * ... end` block; referenced by name from page bodies. The renderer never sees
 * `Component` directly — the parser expands references into a
 * `ComponentInstance` (carrying pre-substituted `expanded` children) and the
 * renderer iterates those flat elements.
 */
export interface Component {
  /** Identifier, must not collide with built-in `ElementType` values. */
  name: string
  /** Parameter names, unique. Used in `$name` / `${name}` substitutions inside the body. */
  params: string[]
  /** Template body — coordinates are relative to the component's (0, 0) origin. */
  body: ComponentBodyItem[]
}

/**
 * Statements allowed inside a `component ... end` block. Pre-substitution:
 * `$name` placeholders are still literal in `body` items.
 */
export type ComponentBodyItem = Element | Arrow

/**
 * A composite call site after parser expansion. The renderer treats this like
 * a group: it iterates `expanded` (already-substituted, already-translated
 * Element list) and never needs to know the component definition.
 */
export interface ComponentInstance {
  kind: 'component-instance'
  /** Call-site id (auto or supplied via `componentName#instanceId`). */
  id: string
  /** Matches a `Component.name` in the document. */
  componentName: string
  x: number
  y: number
  w: number
  h: number
  /** Parameter values supplied at the call site. */
  params: Record<string, string>
  /**
   * Pre-substituted children with absolute coordinates (translated from the
   * component's local origin to `(x, y)`). Element IDs are namespaced
   * `<instanceId>.<bodyId>` so multiple instances don't collide.
   */
  expanded: Element[]
}

/**
 * Items found in `Page.elements`. Either a regular `Element` or a
 * `ComponentInstance` (composite call site). Use `'kind' in item` to
 * discriminate — `Element` has no `kind` field.
 */
export type PageItem = Element | ComponentInstance

export interface Page {
  id: string
  name: string
  elements: PageItem[]
  arrows: Arrow[]
}

export interface BocetoDoc {
  pages: Page[]
  /** All component definitions in source order. Empty array if none defined. */
  components: Component[]
}

export interface ParseOptions {
  /**
   * When true, treat input as a single boceto block (no fence markers, no
   * `--- Page` separators). Default false: input is treated as either markdown
   * containing fenced blocks or a standalone .boceto file.
   */
  raw?: boolean
}

/** Type guard: returns true if a `PageItem` is a `ComponentInstance`. */
export function isComponentInstance(item: PageItem): item is ComponentInstance {
  return 'kind' in item && item.kind === 'component-instance'
}
