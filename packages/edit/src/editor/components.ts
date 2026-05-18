/**
 * Component-definition mutations and introspection.
 *
 * Geometry mutations (move/resize/setLabel) treat composite call sites
 * (`ComponentInstance`) as atomic top-level items. The helpers here go a
 * level deeper: they manipulate the **definitions** in `doc.components` —
 * create / rename / delete / patch them, lift a selection into a brand-new
 * one (`promoteToComponent`), and surface a panel-friendly summary of every
 * component in scope (`local` + `imported`).
 *
 * All mutations are pure-ish: they mutate the doc in place and return either
 * the affected entity or throw `ComponentMutationError` on rejection.
 * Callers run them inside `beginTransaction` / `commitTransaction` so undo
 * + the `change` event fire once per gesture.
 */

import {
  ELEMENT_TYPES,
  isComponentInstance,
  isFlexContainer,
  isSlot,
  layoutBox,
  type Arrow,
  type BocetoDoc,
  type Component,
  type ComponentBodyItem,
  type ComponentDefaults,
  type ComponentInstance,
  type ComponentShell,
  type Element,
  type FlexContainer,
  type Page,
  type PageItem,
  type Slot,
} from '@boceto/core'

const ELEMENT_TYPE_SET: ReadonlySet<string> = new Set(ELEMENT_TYPES)
const COMPONENT_NAME_RE = /^[A-Za-z][A-Za-z0-9_-]*$/
const PARAM_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const PARAM_TOKEN_RE = /\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g

/** Raised by every mutation in this file when its precondition fails. */
export class ComponentMutationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ComponentMutationError'
  }
}

/** Panel-friendly summary used by `<boceto-components>`. */
export interface ComponentSummary {
  name: string
  params: string[]
  /** 'local' = defined in `doc.components`; 'imported' = visible via the editor's `imports`. */
  origin: 'local' | 'imported'
  /** Read-only when origin === 'imported'. */
  definition: Component
  /** Number of instances on the current page (the panel's main concern). */
  instanceCount: number
  /** Optional origin hint from the host (e.g. "block 2" or "from ./shared/cards.md"). */
  hint?: string
}

export interface PromoteArgs {
  ids: string[]
  name: string
  /** Optional override. When omitted, params are inferred from `$ident` tokens in the lifted body. */
  params?: string[]
}

export interface ComponentDefPatch {
  params?: string[]
  shell?: ComponentShell | null
  defaults?: ComponentDefaults | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Introspection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the panel summary for every component in scope. `localDoc.components`
 * are tagged `'local'`; everything in `importedComponents` that isn't shadowed
 * by a local of the same name is tagged `'imported'`. Instance counts come
 * from `currentPage.elements` (including inside FlexContainers).
 */
export function buildComponentSummaries(args: {
  localComponents: readonly Component[]
  importedComponents: readonly Component[]
  currentPage: Page | null
  hints: ReadonlyMap<string, string>
}): ComponentSummary[] {
  const out: ComponentSummary[] = []
  const localNames = new Set<string>()
  const counts = countInstancesOnPage(args.currentPage)
  for (const c of args.localComponents) {
    localNames.add(c.name)
    out.push({
      name: c.name,
      params: [...c.params],
      origin: 'local',
      definition: c,
      instanceCount: counts.get(c.name) ?? 0,
    })
  }
  for (const c of args.importedComponents) {
    if (localNames.has(c.name)) continue // shadowed by local
    out.push({
      name: c.name,
      params: [...c.params],
      origin: 'imported',
      definition: c,
      instanceCount: counts.get(c.name) ?? 0,
      hint: args.hints.get(c.name),
    })
  }
  return out
}

/** Count instances of each component name reachable from a page (one level into FlexContainers). */
function countInstancesOnPage(page: Page | null): Map<string, number> {
  const m = new Map<string, number>()
  if (!page) return m
  walk(page.elements)
  return m
  function walk(items: readonly PageItem[]): void {
    for (const it of items) {
      if (isComponentInstance(it)) {
        m.set(it.componentName, (m.get(it.componentName) ?? 0) + 1)
        continue
      }
      if (isFlexContainer(it)) {
        walk(it.children)
        continue
      }
      if ('children' in it && Array.isArray(it.children)) {
        walk(it.children)
      }
    }
  }
}

/** Every ComponentInstance on `page` (one level into FlexContainers). Optional name filter. */
export function findInstancesOnPage(page: Page, name?: string): ComponentInstance[] {
  const out: ComponentInstance[] = []
  walk(page.elements)
  return out
  function walk(items: readonly PageItem[]): void {
    for (const it of items) {
      if (isComponentInstance(it)) {
        if (!name || it.componentName === name) out.push(it)
        continue
      }
      if (isFlexContainer(it)) {
        walk(it.children)
        continue
      }
      if ('children' in it && Array.isArray(it.children)) {
        walk(it.children)
      }
    }
  }
}

/**
 * Locate a top-level item by id across an arbitrary set of pages. Mirrors
 * `findTopLevel(doc, id)` in `mutations.ts` but accepts a pages array so the
 * caller can mix the real `doc.pages` with the synthetic edit-mode page.
 */
export function findTopLevelInPages(
  pages: readonly Page[],
  id: string,
): { page: Page; item: PageItem; index: number } | null {
  for (const page of pages) {
    for (let i = 0; i < page.elements.length; i++) {
      const it = page.elements[i]!
      if (it.id === id) return { page, item: it, index: i }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD on Component definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append a fresh component. Body defaults to a single 200×100 box so the
 * empty definition is visible in component-edit mode. Throws on name
 * collision (with existing local components or built-in element types) and
 * on bad param names.
 */
export function createComponent(
  doc: BocetoDoc,
  input: { name: string; params?: string[]; body?: ComponentBodyItem[] },
): Component {
  validateName(input.name)
  if (doc.components.some((c) => c.name === input.name)) {
    throw new ComponentMutationError(`Component "${input.name}" already exists`)
  }
  const params = (input.params ?? []).map((p) => p.trim()).filter((p) => p.length > 0)
  validateParams(input.name, params)
  const body: ComponentBodyItem[] =
    input.body && input.body.length > 0
      ? input.body
      : [
          {
            id: 'c0',
            type: 'box',
            x: 0,
            y: 0,
            w: 200,
            h: 100,
            label: '',
            attrs: {},
          },
        ]
  const component: Component = { name: input.name, params, body }
  doc.components.push(component)
  return component
}

/**
 * Drop a component definition. Refuses while instances exist (any page)
 * unless `deleteInstances` is set, in which case every matching
 * `ComponentInstance` is removed first.
 */
export function deleteComponent(
  doc: BocetoDoc,
  name: string,
  options: { deleteInstances?: boolean } = {},
): boolean {
  const idx = doc.components.findIndex((c) => c.name === name)
  if (idx < 0) return false
  const instances = countInstancesAcrossDoc(doc, name)
  if (instances > 0 && !options.deleteInstances) {
    throw new ComponentMutationError(
      `Cannot delete component "${name}": ${instances} instance(s) still reference it. Pass { deleteInstances: true } to drop them.`,
    )
  }
  if (options.deleteInstances && instances > 0) removeAllInstances(doc, name)
  doc.components.splice(idx, 1)
  return true
}

/** Rename a component definition + every instance that uses it. */
export function renameComponent(doc: BocetoDoc, oldName: string, newName: string): boolean {
  if (oldName === newName) return false
  const c = doc.components.find((c) => c.name === oldName)
  if (!c) return false
  validateName(newName)
  if (doc.components.some((c) => c.name === newName)) {
    throw new ComponentMutationError(`A component named "${newName}" already exists`)
  }
  c.name = newName
  // Rewrite every instance — and every nested instance inside another body —
  // that references the old name.
  for (const other of doc.components) renameInBody(other.body, oldName, newName)
  for (const page of doc.pages) renameInItems(page.elements, oldName, newName)
  return true
}

function renameInItems(items: PageItem[], oldName: string, newName: string): void {
  for (const it of items) {
    if (isComponentInstance(it)) {
      if (it.componentName === oldName) it.componentName = newName
      renameInItems(it.expanded as PageItem[], oldName, newName)
      continue
    }
    if (isFlexContainer(it)) {
      renameInItems(it.children as PageItem[], oldName, newName)
      continue
    }
    if ('children' in it && Array.isArray(it.children)) {
      renameInItems(it.children as PageItem[], oldName, newName)
    }
  }
}

function renameInBody(items: ComponentBodyItem[], oldName: string, newName: string): void {
  for (const it of items) {
    if (isSlot(it)) continue
    if ('from' in it && 'to' in it) continue // arrow
    if (isComponentInstance(it)) {
      if (it.componentName === oldName) it.componentName = newName
      continue
    }
    if (isFlexContainer(it)) {
      renameInBody(it.children as ComponentBodyItem[], oldName, newName)
      continue
    }
    if ('children' in it && Array.isArray(it.children)) {
      renameInBody(it.children as ComponentBodyItem[], oldName, newName)
    }
  }
}

/**
 * Patch params / shell / defaults atomically. `shell: null` removes the
 * shell; `defaults: null` removes defaults. Removed params are dropped from
 * every instance's `params` map and `$param` substitutions in the body fall
 * through to empty strings on the next expansion.
 */
export function updateComponentDef(
  doc: BocetoDoc,
  name: string,
  patch: ComponentDefPatch,
): boolean {
  const c = doc.components.find((c) => c.name === name)
  if (!c) return false
  if (patch.params != null) {
    const params = patch.params.map((p) => p.trim()).filter((p) => p.length > 0)
    validateParams(name, params)
    const removed = c.params.filter((p) => !params.includes(p))
    c.params = params
    if (removed.length > 0) {
      for (const page of doc.pages) dropInstanceParams(page.elements, name, removed)
    }
  }
  if (patch.shell !== undefined) {
    if (patch.shell == null) delete c.shell
    else c.shell = patch.shell
  }
  if (patch.defaults !== undefined) {
    if (patch.defaults == null) delete c.defaults
    else c.defaults = patch.defaults
  }
  return true
}

function dropInstanceParams(items: PageItem[], name: string, removed: string[]): void {
  for (const it of items) {
    if (isComponentInstance(it)) {
      if (it.componentName === name) {
        for (const k of removed) delete it.params[k]
      }
      dropInstanceParams(it.expanded as PageItem[], name, removed)
      continue
    }
    if (isFlexContainer(it)) {
      dropInstanceParams(it.children as PageItem[], name, removed)
      continue
    }
    if ('children' in it && Array.isArray(it.children)) {
      dropInstanceParams(it.children as PageItem[], name, removed)
    }
  }
}

/**
 * Update the call-site `params` for one specific ComponentInstance. Editing
 * one param doesn't disturb the others, and an empty value clears the entry.
 */
export function updateInstanceParams(
  doc: BocetoDoc,
  instanceId: string,
  next: Record<string, string>,
): boolean {
  for (const page of doc.pages) {
    const inst = findInstanceById(page.elements, instanceId)
    if (inst) {
      // Replace by clear-then-set so callers who omit a key clear it.
      for (const k of Object.keys(inst.params)) delete inst.params[k]
      for (const [k, v] of Object.entries(next)) {
        if (v !== '') inst.params[k] = v
      }
      return true
    }
  }
  return false
}

function findInstanceById(items: PageItem[], id: string): ComponentInstance | null {
  for (const it of items) {
    if (isComponentInstance(it)) {
      if (it.id === id) return it
      const inner = findInstanceById(it.expanded as PageItem[], id)
      if (inner) return inner
      continue
    }
    if (isFlexContainer(it)) {
      const inner = findInstanceById(it.children as PageItem[], id)
      if (inner) return inner
      continue
    }
    if ('children' in it && Array.isArray(it.children)) {
      const inner = findInstanceById(it.children as PageItem[], id)
      if (inner) return inner
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Promote-to-component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lift `ids` (top-level items on `page`) into a brand-new `Component`. The
 * selection is replaced by a single `ComponentInstance` placed at the
 * union-bbox of the selection; the lifted items become `Component.body`
 * with coords translated so the body's origin is (0, 0).
 *
 * Returns the new instance's id and the component name. Throws on any item
 * not found at the top level (sub-selections inside an instance's expanded
 * tree are intentionally not supported in v1).
 */
export function promoteToComponent(
  doc: BocetoDoc,
  page: Page,
  args: PromoteArgs,
): { instanceId: string; componentName: string } {
  if (args.ids.length === 0) {
    throw new ComponentMutationError('Cannot promote: no items selected')
  }
  validateName(args.name)
  if (doc.components.some((c) => c.name === args.name)) {
    throw new ComponentMutationError(`A component named "${args.name}" already exists`)
  }

  // 1. Resolve every id to a top-level item index on `page`. Refuse if any
  //    isn't found (sub-selection inside expanded subtree, or wrong page).
  const indexOf = new Map<string, number>()
  for (let i = 0; i < page.elements.length; i++) indexOf.set(page.elements[i]!.id, i)
  const lifted: { item: PageItem; index: number }[] = []
  for (const id of args.ids) {
    const i = indexOf.get(id)
    if (i === undefined) {
      throw new ComponentMutationError(
        `Cannot promote: item "${id}" is not a top-level element on the current page (nested items can't be lifted in v1)`,
      )
    }
    lifted.push({ item: page.elements[i]!, index: i })
  }
  lifted.sort((a, b) => a.index - b.index)

  // 2. Union bbox of the lifted items' layout boxes.
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const { item } of lifted) {
    const b = layoutBox(item)
    if (b.x < x0) x0 = b.x
    if (b.y < y0) y0 = b.y
    if (b.x + b.w > x1) x1 = b.x + b.w
    if (b.y + b.h > y1) y1 = b.y + b.h
  }
  const ox = Math.max(0, Math.floor(x0))
  const oy = Math.max(0, Math.floor(y0))
  const bw = Math.max(1, Math.ceil(x1 - ox))
  const bh = Math.max(1, Math.ceil(y1 - oy))

  // 3. Build the body: deep-clone each item with x/y shifted by (-ox, -oy).
  const body: ComponentBodyItem[] = lifted.map(({ item }) =>
    translateForBody(item, -ox, -oy) as ComponentBodyItem,
  )

  // 4. Infer params from $ident tokens if the caller didn't supply explicit ones.
  let params: string[]
  if (args.params != null) {
    params = args.params.map((p) => p.trim()).filter((p) => p.length > 0)
  } else {
    params = inferParams(body)
  }
  validateParams(args.name, params)

  // 5. Remove the lifted items from the page (and drop arrows touching them).
  const liftedIds = new Set(args.ids)
  page.elements = page.elements.filter((it) => !liftedIds.has(it.id))
  page.arrows = page.arrows.filter((a) => !liftedIds.has(a.from) && !liftedIds.has(a.to))

  // 6. Push the new component definition + instance call site.
  doc.components.push({ name: args.name, params, body })
  const instanceId = mintInstanceId(page, args.name)
  const instance: ComponentInstance = {
    kind: 'component-instance',
    id: instanceId,
    componentName: args.name,
    x: ox,
    y: oy,
    w: bw,
    h: bh,
    params: {},
    expanded: [], // (re-)filled by the next parse-from-serialized round
  }
  page.elements.push(instance)

  return { instanceId, componentName: args.name }
}

/** Recursively clone an item with (x,y) translated; drops computed boxes so the layout pass re-derives them. */
function translateForBody(item: PageItem, dx: number, dy: number): PageItem {
  if (isComponentInstance(item)) {
    return {
      ...item,
      x: typeof item.x === 'number' ? item.x + dx : item.x,
      y: typeof item.y === 'number' ? item.y + dy : item.y,
      params: { ...item.params },
      expanded: [], // re-derived by parser
      computed: undefined,
    } as ComponentInstance
  }
  if (isFlexContainer(item)) {
    return {
      ...item,
      x: item.x + dx,
      y: item.y + dy,
      children: item.children.map((c) => translateForBody(c, 0, 0)),
      computed: undefined,
    } as FlexContainer
  }
  const el = item as Element
  return {
    ...el,
    x: el.x + dx,
    y: el.y + dy,
    attrs: { ...el.attrs },
    children: el.children ? el.children.map((c) => translateForBody(c, 0, 0)) : undefined,
    computed: undefined,
  }
}

/** Scan a body for `$ident` and `${ident}` tokens; return unique names in first-appearance order. */
function inferParams(items: readonly ComponentBodyItem[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  const push = (n: string): void => {
    if (!seen.has(n)) {
      seen.add(n)
      order.push(n)
    }
  }
  const scan = (s: string | undefined): void => {
    if (!s) return
    for (const m of s.matchAll(PARAM_TOKEN_RE)) push(m[1] ?? m[2]!)
  }
  const visit = (xs: readonly ComponentBodyItem[]): void => {
    for (const it of xs) {
      if (isSlot(it as Slot)) continue
      if ('from' in it && 'to' in it) {
        const a = it as Arrow
        scan(a.label)
        continue
      }
      if (isComponentInstance(it as PageItem)) {
        const ci = it as ComponentInstance
        for (const v of Object.values(ci.params)) scan(v)
        continue
      }
      if (isFlexContainer(it as PageItem)) {
        const fc = it as FlexContainer
        visit(fc.children as ComponentBodyItem[])
        continue
      }
      const el = it as Element
      scan(el.label)
      scan(el.note)
      for (const v of Object.values(el.attrs)) if (typeof v === 'string') scan(v)
      if (el.children) visit(el.children as ComponentBodyItem[])
    }
  }
  visit(items)
  return order
}

function mintInstanceId(page: Page, componentName: string): string {
  const used = new Set<string>()
  collectIdsTopLevel(page.elements, used)
  // Match the parser's auto-id format for component instances: `<name>0`,
  // `<name>1`, etc., so the serializer keeps the bare form.
  let n = 0
  while (used.has(`${componentName}${n}`)) n++
  return `${componentName}${n}`
}

function collectIdsTopLevel(items: readonly PageItem[], into: Set<string>): void {
  for (const it of items) into.add(it.id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append a fresh `ComponentInstance` call site for `componentName` to `page`.
 * Used by the panel's "Instantiate" button. The caller decides where (x, y).
 * Refuses if no component with that name is reachable from the page's doc.
 */
export function appendInstance(
  doc: BocetoDoc,
  page: Page,
  componentName: string,
  args: { x: number; y: number; w?: number; h?: number },
): ComponentInstance {
  const all = new Set(doc.components.map((c) => c.name))
  if (!all.has(componentName)) {
    throw new ComponentMutationError(
      `Cannot instantiate "${componentName}": no such local component`,
    )
  }
  const id = mintInstanceId(page, componentName)
  const instance: ComponentInstance = {
    kind: 'component-instance',
    id,
    componentName,
    x: args.x,
    y: args.y,
    w: args.w ?? 200,
    h: args.h ?? 120,
    params: {},
    expanded: [],
  }
  page.elements.push(instance)
  return instance
}

export function countInstancesAcrossDoc(doc: BocetoDoc, name: string): number {
  let count = 0
  for (const page of doc.pages) count += findInstancesOnPage(page, name).length
  return count
}

function removeAllInstances(doc: BocetoDoc, name: string): void {
  for (const page of doc.pages) {
    const removedIds = new Set<string>()
    const next = page.elements.filter((it) => {
      if (isComponentInstance(it) && it.componentName === name) {
        removedIds.add(it.id)
        return false
      }
      return true
    })
    if (next.length !== page.elements.length) {
      page.elements = next
      page.arrows = page.arrows.filter((a) => !removedIds.has(a.from) && !removedIds.has(a.to))
    }
  }
}

function validateName(name: string): void {
  if (!COMPONENT_NAME_RE.test(name)) {
    throw new ComponentMutationError(
      `Invalid component name "${name}" (must match /^[A-Za-z][A-Za-z0-9_-]*$/)`,
    )
  }
  if (ELEMENT_TYPE_SET.has(name)) {
    throw new ComponentMutationError(
      `Component name "${name}" collides with a built-in element type`,
    )
  }
}

function validateParams(componentName: string, params: readonly string[]): void {
  const seen = new Set<string>()
  for (const p of params) {
    if (!PARAM_NAME_RE.test(p)) {
      throw new ComponentMutationError(
        `Component "${componentName}" has invalid param "${p}" (must match /^[A-Za-z_][A-Za-z0-9_]*$/)`,
      )
    }
    if (seen.has(p)) {
      throw new ComponentMutationError(`Component "${componentName}" has duplicate param "${p}"`)
    }
    seen.add(p)
  }
}
