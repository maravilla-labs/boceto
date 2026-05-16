/**
 * The Boceto brand mark — a 28×28 rounded square (uses `currentColor` for the
 * fill so it picks up the host's text color) with a hand-drawn "B" rotated
 * -5°. Renders as `<text>` using the same `'Patrick Hand', cursive` font
 * stack the docs site declares on `.logo-mark`, so the icon matches the
 * brand badge on whatever device it loads on.
 *
 * Patrick Hand isn't bundled — consumers who want the exact Google Fonts
 * rendering should load it themselves (e.g.
 * `<link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap" rel="stylesheet">`).
 * Without it, the browser's `cursive` fallback applies (usually a chunky
 * italic script).
 *
 * Use:
 *  - React: `<span dangerouslySetInnerHTML={{ __html: BOCETO_ICON_SVG }} />`
 *  - Vanilla DOM: `el.innerHTML = BOCETO_ICON_SVG`
 *  - Static asset: import from `@boceto/tiptap/assets/boceto-icon.svg`
 */
export const BOCETO_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" role="img" aria-label="Boceto block"><rect x="0" y="0" width="28" height="28" rx="6" ry="6" fill="currentColor"/><text x="14" y="21.5" fill="#fff" text-anchor="middle" font-family="'Patrick Hand','Comic Sans MS',cursive" font-size="20" font-weight="700" transform="rotate(-5 14 14)">B</text></svg>`

/**
 * Same icon at a custom pixel size. Sets `width`/`height` on the root SVG;
 * the viewBox is unchanged so the stroke widths and B-glyph proportions scale
 * cleanly with it.
 */
export function bocetoIconAt(size: number): string {
  if (size === 28) return BOCETO_ICON_SVG
  return BOCETO_ICON_SVG.replace(
    'width="28" height="28"',
    `width="${size}" height="${size}"`,
  )
}

/**
 * Alias kept for the docs / README — same string as `BOCETO_ICON_SVG`. Use
 * with React's `dangerouslySetInnerHTML` or vanilla `innerHTML`.
 */
export const BocetoIcon = BOCETO_ICON_SVG
