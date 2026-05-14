import { attrsFor, catalogEntry, type AttrSpec } from '@boceto/edit/catalog'
import { z } from 'zod'

export const describeElementInputSchema = {
  type: z.string().describe('Canonical Boceto element type (e.g. "button", "navbar", "chart-bar").'),
}

export type DescribeElementResult =
  | {
      ok: true
      type: string
      category: string
      defaultW: number
      defaultH: number
      defaultLabel?: string
      attrs: AttrSpec[]
    }
  | { ok: false; error: string }

export function runDescribeElement(args: { type: string }): DescribeElementResult {
  const entry = catalogEntry(args.type as Parameters<typeof catalogEntry>[0])
  if (!entry) {
    return { ok: false, error: `Unknown element type: ${args.type}` }
  }
  const attrs = attrsFor(entry.type).map((a) => ({ ...a }))
  return {
    ok: true,
    type: entry.type,
    category: entry.category,
    defaultW: entry.w,
    defaultH: entry.h,
    ...(entry.label !== undefined ? { defaultLabel: entry.label } : {}),
    attrs,
  }
}
