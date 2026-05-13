/**
 * Boceto parser entry point. The work is split across:
 *
 *   - `blocks.ts`     — Pass 0: pull source blocks out of markdown / standalone files.
 *   - `components.ts` — Pass 1: extract `component … end` definitions.
 *   - `page.ts`       — Pass 2: parse each remaining block into a `Page`.
 *   - `elements.ts`   — statement-level parsers for `element`/`text`/`arrow`.
 *   - `layout.ts`     — `row` / `col` → `FlexContainer` builder.
 *   - `attrs.ts`      — shared key=value bag handling.
 *   - `primitives.ts` — `posInt` / `posIntOrAuto`.
 *   - `errors.ts`     — `BocetoParseError`.
 *
 * Public API: `parse(source, options?)` and the `BocetoParseError` class.
 */

import type { BocetoDoc, Component, Page, ParseOptions } from '../types'
import { extractBlocks } from './blocks'
import {
  collectComponentDefinitions,
  parseComponentBodies,
  validateComponents,
} from './components'
import { parsePage } from './page'

export { BocetoParseError } from './errors'

export function parse(source: string, options: ParseOptions = {}): BocetoDoc {
  if (options.raw) {
    return {
      pages: [parsePage('Page 1', 0, source, new Map())],
      components: [],
    }
  }

  const rawBlocks = extractBlocks(source)

  // Pass 1a: pull every component header + raw body out of every block.
  const { raw: rawComponents, blocks: blocksForPages } = collectComponentDefinitions(rawBlocks)
  // Pass 1b: parse each body with the full component registry available so
  // composites can reference each other regardless of source order.
  const components = parseComponentBodies(rawComponents)
  validateComponents(components)

  const componentMap: ReadonlyMap<string, Component> = new Map(
    components.map((c) => [c.name, c] as const),
  )

  // Pass 2: parse pages with the component registry available so references
  // resolve to ComponentInstance items.
  const pages: Page[] = []
  let pageIndex = 0
  for (const block of blocksForPages) {
    const trimmedBody = block.body.trim()
    // A block whose only content was components produces no page.
    if (!trimmedBody) continue
    const name = block.name ?? `Page ${pageIndex + 1}`
    pages.push(parsePage(name, pageIndex, block.body, componentMap))
    pageIndex++
  }

  if (pages.length === 0) {
    pages.push({ id: 'p0', name: 'Page 1', elements: [], arrows: [] })
  }
  return { pages, components }
}
