export type {
  Arrow,
  AttrValue,
  BocetoDoc,
  Component,
  ComponentBodyItem,
  ComponentInstance,
  Element,
  ElementType,
  Page,
  PageItem,
  ParseOptions,
} from './types'
export { ELEMENT_TYPES, isComponentInstance } from './types'
export { parse, BocetoParseError } from './parser'
export { serialize, type SerializeOptions } from './serializer'
export { tokenize, type Token } from './tokenizer'
export {
  drawElement,
  registerElement,
  getRenderer,
  strokeColor,
  fillColor,
  type DrawState,
  type ElementRenderer,
} from './elements'
export {
  sketchRect,
  sketchLine,
  sketchText,
  wrapText,
  arrow,
  PALETTE,
  type SketchRectOpts,
  type SketchLineOpts,
  type SketchTextOpts,
  type ArrowOpts,
} from './elements/primitives'
export { CanvasRenderer } from './render/canvas'
export { CanvasSurface } from './render/canvas-surface'
export { SvgRenderer, SvgSurface } from './render/svg'
export {
  type Surface,
  type ShapeOpts,
  type StrokeOpts,
  type TextOpts,
  type GroupOpts,
  type ShadowOpts,
  DEFAULT_FONT,
  fontString,
} from './render/surface'
export { selectPage, type Renderer, type RenderOptions } from './render/types'
export { mulberry32, hashString } from './random'
