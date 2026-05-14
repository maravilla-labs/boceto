<!--
  `<BocetoView>` — Svelte wrapper around the `<boceto-view>` custom element.

  Uses Svelte 4 syntax (`export let`, `$:`, `createEventDispatcher`) so the
  same source compiles under both Svelte 4 and Svelte 5's legacy mode. The
  underlying custom element does all the work; this file is the thin
  reactive bridge between Svelte props and HTML attributes.

  Two events are forwarded:
  - the element's `boceto-render` CustomEvent → Svelte `on:render`
-->
<script>
  import { onMount, createEventDispatcher } from 'svelte'
  import { defineBocetoView } from '@boceto/view'

  /** Boceto DSL source. */
  export let code = undefined
  /** Or: URL to fetch a `.boceto` file. */
  export let src = undefined
  export let width = undefined
  export let height = undefined
  /** Page selector for multi-page docs (string name or 0-based number). */
  export let page = undefined
  /** Forwarded to the underlying element's `class` attr. */
  let className = ''
  export { className as class }
  /** Forwarded inline style. */
  export let style = undefined

  /** Reference to the underlying custom element. */
  let el

  const dispatch = createEventDispatcher()

  onMount(() => {
    defineBocetoView()
  })

  // Bind / rebind the render listener whenever the element ref settles.
  $: if (el) {
    const handler = (e) => {
      dispatch('render', { doc: e.detail.doc, page: e.detail.page })
    }
    el.addEventListener('boceto-render', handler)
  }
</script>

<boceto-view
  bind:this={el}
  {code}
  {src}
  {width}
  {height}
  {page}
  class={className}
  {style}
></boceto-view>
