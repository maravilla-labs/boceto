import {
  applyFlexLayout,
  initYoga,
  pageContentBox,
  parse,
  SvgRenderer,
  selectPage,
  type BocetoDoc,
} from '@boceto/core'
import { z } from 'zod'

export const renderSvgInputSchema = {
  source: z.string().describe('Boceto DSL source (raw or markdown with ```boceto fences).'),
  width: z.number().int().positive().optional().describe('SVG width in px. Default 860.'),
  height: z.number().int().positive().optional().describe('SVG height in px. Default 600.'),
  page: z
    .union([z.string(), z.number().int().nonnegative()])
    .optional()
    .describe('Page selector — name (string) or 0-based index. Default: first page.'),
  fit: z
    .enum(['fixed', 'content'])
    .optional()
    .describe(
      '`content` grows the canvas to encompass every element (width/height become minimums). Default `fixed`.',
    ),
  padding: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Padding around content when `fit="content"`. Default 16.'),
  background: z
    .string()
    .nullable()
    .optional()
    .describe('Paper background colour, or `null` to omit. Default `#fafaf8`.'),
}

export interface RenderSvgResult {
  svg: string
  doc: BocetoDoc
  page: string | number | undefined
  width: number
  height: number
}

// Yoga's WASM is loaded lazily and only once. Same singleton pattern
// `<boceto-view>` uses — first render-svg call pays the load cost; every
// subsequent call awaits the already-resolved promise.
let yogaReady: Promise<unknown> | null = null

const DEFAULT_W = 860
const DEFAULT_H = 600

export async function runRenderSvg(args: {
  source: string
  width?: number
  height?: number
  page?: string | number
  fit?: 'fixed' | 'content'
  padding?: number
  background?: string | null
}): Promise<RenderSvgResult> {
  let w = args.width ?? DEFAULT_W
  let h = args.height ?? DEFAULT_H

  const isMarkdown = args.source.includes('```') || /^---/m.test(args.source.trim())
  const doc = parse(args.source, { raw: !isMarkdown })

  if (!yogaReady) yogaReady = initYoga()
  await yogaReady
  applyFlexLayout(doc)

  if (args.fit === 'content') {
    const page = selectPage(doc, args.page)
    if (page) {
      const bb = pageContentBox(page.elements)
      if (bb) {
        const pad = args.padding ?? 16
        w = Math.max(w, Math.ceil(bb.x + bb.w + pad))
        h = Math.max(h, Math.ceil(bb.y + bb.h + pad))
      }
    }
  }

  const renderer = new SvgRenderer()
  const svg = renderer.renderToString(doc, {
    width: w,
    height: h,
    page: args.page,
    background: args.background ?? undefined,
  })

  return { svg, doc, page: args.page, width: w, height: h }
}
