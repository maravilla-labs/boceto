export { BocetoEditElement, defineBocetoEdit, TAG } from './boceto-edit'
export { BocetoPaletteElement, defineBocetoPalette, PALETTE_TAG } from './boceto-palette'
export { BocetoInspectorElement, defineBocetoInspector, INSPECTOR_TAG } from './boceto-inspector'
export { BocetoComponentsElement, defineBocetoComponents, COMPONENTS_TAG } from './boceto-components'
export {
  getActiveEditor,
  setActiveEditor,
  onActiveEditorChange,
} from './editor/active-editor'
export { ELEMENT_CATALOG, catalogEntry, type ElementCategory } from './editor/element-catalog'
export {
  BocetoEditor,
  bindCanvas,
  createContextMenu,
  createInlineEditor,
  hitTestTop,
  hitTestLeaf,
  hitHandle,
  selectionBox,
  itemsInRect,
  type BindOptions,
  type ContextMenuHandle,
  type ContextMenuItem,
  type EditorEventName,
  type EditorEvents,
  type EditorInit,
  type EditorState,
  type HandleEdge,
  type HandleHit,
  type HitResult,
  type Mode,
} from './editor'
export {
  ComponentMutationError,
  type ComponentDefPatch,
  type ComponentSummary,
  type PromoteArgs,
} from './editor/components'
