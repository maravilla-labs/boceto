/**
 * Per-element-type intrinsic content insets.
 *
 * When a built-in element has block-form children (see `Element.children`),
 * the layout pass adds these insets to the author-supplied `padding` to keep
 * children from overlapping the chrome's intrinsic header / bezel.
 *
 *  - `card`: 36px top — header bar + label.
 *  - `modal`: 40px top — title bar with close button.
 *  - `window-frame`: 32px top — macOS-style titlebar.
 *  - `browser-frame`: 70px top — tabs (≈30px) + URL bar (≈36px) + breathing room.
 *  - `phone-frame`: 12px all around — bezel.
 *
 * Element types not listed get all-zero insets. Authors can always add more
 * padding via the `padding=N` attribute; we never subtract from it.
 */
export interface ChromeInsets {
  top: number
  right: number
  bottom: number
  left: number
}

const TABLE: Record<string, Partial<ChromeInsets>> = {
  card: { top: 36 },
  modal: { top: 40 },
  'window-frame': { top: 32 },
  'browser-frame': { top: 70 },
  'phone-frame': { top: 12, right: 12, bottom: 12, left: 12 },
}

const ZERO: ChromeInsets = { top: 0, right: 0, bottom: 0, left: 0 }

export function chromeInsets(type: string): ChromeInsets {
  const partial = TABLE[type]
  if (!partial) return ZERO
  return {
    top: partial.top ?? 0,
    right: partial.right ?? 0,
    bottom: partial.bottom ?? 0,
    left: partial.left ?? 0,
  }
}
