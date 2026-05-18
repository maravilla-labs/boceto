/**
 * Type declarations for the public exports. Each `.svelte` file has its
 * own sibling `.svelte.d.ts` (Svelte's convention — `svelte-package` emits
 * these); this file just re-exports them so `@boceto/svelte` resolves
 * directly.
 */

// Triple-slash reference: pulls in the `SvelteHTMLElements` augmentation
// for the five boceto custom-element tags. With this, raw template usage
// (`<boceto-view code="…">`) is type-checked alongside the higher-level
// `<BocetoView>` Svelte wrapper.
/// <reference path="./elements.d.ts" />

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
