import { ELEMENT_CATALOG } from '@boceto/edit/catalog'
import { z } from 'zod'

export const listElementsInputSchema = {} as const

export interface ListElementsResult {
  categories: {
    name: string
    types: {
      type: string
      defaultW: number
      defaultH: number
      defaultLabel?: string
    }[]
  }[]
  totalTypes: number
}

export function runListElements(_: z.infer<z.ZodObject<typeof listElementsInputSchema>>): ListElementsResult {
  let total = 0
  const categories = ELEMENT_CATALOG.map((cat) => ({
    name: cat.name,
    types: cat.types.map((t) => {
      total += 1
      return {
        type: t.type,
        defaultW: t.w,
        defaultH: t.h,
        ...(t.label !== undefined ? { defaultLabel: t.label } : {}),
      }
    }),
  }))
  return { categories, totalTypes: total }
}
