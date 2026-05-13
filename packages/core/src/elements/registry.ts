import type { Element, ElementType } from '../types'
import type { Surface } from '../render/surface'

export interface DrawState {
  selected: boolean
  hovered: boolean
  inGroup: boolean
}

export interface ElementRenderer {
  draw(surface: Surface, el: Element, state: DrawState): void
}

const REGISTRY = new Map<ElementType, ElementRenderer>()

export function registerElement(type: ElementType, renderer: ElementRenderer): void {
  REGISTRY.set(type, renderer)
}

export function getRenderer(type: ElementType): ElementRenderer | undefined {
  return REGISTRY.get(type)
}
