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
import { stripFrontmatter } from './frontmatter'

export { BocetoParseError } from './errors'

export function parse(source: string, options: ParseOptions = {}): BocetoDoc {
  if (options.raw) {
    return {
      pages: [parsePage('Page 1', 0, source, new Map())],
      components: [],
    }
  }

  // Strip a leading YAML frontmatter block if present. Frontmatter is
  // metadata for higher-level consumers (e.g. `resolveBocetoImports`); the
  // parser itself ignores it. Stripping here keeps standalone `.boceto`
  // files with frontmatter from being mis-detected as page-separator runs.
  const stripped = stripFrontmatter(source)

  const rawBlocks = extractBlocks(stripped)

  // Optional imports: prepend their blocks for Pass-1 component extraction
  // only — their pages are discarded so importing a doc doesn't leak its
  // mockups into ours.
  const importSources = options.imports
    ? Array.isArray(options.imports)
      ? options.imports
      : [options.imports]
    : []
  const importBlocks = importSources.flatMap((src) => extractBlocks(src))

  // Pass 1a (source side): own component defs are what we'll expose on
  // `doc.components` and round-trip through serialize.
  const { raw: ownRawComponents, blocks: blocksForPages } = collectComponentDefinitions(rawBlocks)
  // Pass 1a (imports side): import-defined components join the registry used
  // for resolution but are NOT added to `doc.components` — that would round-
  // trip them through serialize and trip duplicate-component validation on
  // the next parse.
  const { raw: importRawComponents } = importBlocks.length > 0
    ? collectComponentDefinitions(importBlocks)
    : { raw: [] as ReturnType<typeof collectComponentDefinitions>['raw'] }

  // Pass 1b: parse all bodies together so cross-references resolve regardless
  // of which side declared them. Imports go first so an own component with
  // the same name overrides the import in the resolution map.
  const allParsed = parseComponentBodies([...importRawComponents, ...ownRawComponents])
  const components = allParsed.slice(importRawComponents.length) // own only
  validateComponents(components)

  const componentMap = new Map<string, Component>()
  // Pre-parsed imports go in first — cheapest path; consumers using a
  // LibraryCache populated by `resolveBocetoImports` flow through here.
  if (options.importedComponents) {
    for (const c of options.importedComponents) componentMap.set(c.name, c)
  }
  for (const c of allParsed) componentMap.set(c.name, c) // own overrides import (later wins)

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
