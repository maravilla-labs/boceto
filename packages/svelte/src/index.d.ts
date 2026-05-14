/**
 * Type declarations for the public exports. Each `.svelte` file has its
 * own sibling `.svelte.d.ts` (Svelte's convention — `svelte-package` emits
 * these); this file just re-exports them so `@boceto/svelte` resolves
 * directly.
 */
export { default as BocetoView } from './BocetoView.svelte'
export { default as BocetoEdit } from './BocetoEdit.svelte'
export type {
  BocetoViewProps,
  BocetoViewEvents,
} from './BocetoView.svelte'
export type {
  BocetoEditProps,
  BocetoEditEvents,
} from './BocetoEdit.svelte'
