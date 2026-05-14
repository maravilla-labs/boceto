/**
 * Node-safe entry that re-exports just the catalog + attribute-schema data.
 *
 * The main `@boceto/edit` entry pulls in the `<boceto-edit>` custom element,
 * which references `HTMLElement` at module-eval time and therefore cannot be
 * imported from a plain Node process. This entry exposes only pure data so
 * non-browser consumers (e.g. `@boceto/mcp`) can read the catalog without
 * needing a DOM polyfill.
 */
export {
  ELEMENT_CATALOG,
  catalogEntry,
  type ElementCategory,
} from './editor/element-catalog'
export {
  ATTR_SCHEMAS,
  attrsFor,
  type AttrKind,
  type AttrSpec,
} from './editor/element-attrs'
