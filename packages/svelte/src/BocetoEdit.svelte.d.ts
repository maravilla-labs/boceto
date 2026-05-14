import { SvelteComponent } from 'svelte'

export interface BocetoEditProps {
  code?: string
  width?: number
  height?: number
  readOnly?: boolean
  class?: string
  style?: string
}

export interface BocetoEditEvents {
  change: CustomEvent<{ code: string }>
}

export default class BocetoEdit extends SvelteComponent<BocetoEditProps, BocetoEditEvents> {}
