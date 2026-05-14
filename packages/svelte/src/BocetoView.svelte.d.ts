import { SvelteComponent } from 'svelte'
import type { BocetoDoc } from '@boceto/core'

export interface BocetoViewProps {
  code?: string
  src?: string
  width?: number
  height?: number
  page?: string | number
  class?: string
  style?: string
}

export interface BocetoViewEvents {
  render: CustomEvent<{ doc: BocetoDoc; page: string | number | undefined }>
}

export default class BocetoView extends SvelteComponent<BocetoViewProps, BocetoViewEvents> {}
