<!--
  `<BocetoEdit>` — Svelte wrapper around the `<boceto-edit>` custom element.

  The element's native `change` CustomEvent is re-emitted as Svelte `on:change`,
  with the new code string surfaced both as `event.detail` and via a bind:code
  prop for two-way binding (`<BocetoEdit bind:code />`).
-->
<script>
  import { onMount, createEventDispatcher } from 'svelte'
  import { defineBocetoEdit } from '@boceto/edit'

  /** DSL source. Bindable for two-way sync (`bind:code`). */
  export let code = ''
  export let width = undefined
  export let height = undefined
  export let readOnly = false
  let className = ''
  export { className as class }
  export let style = undefined

  let el
  const dispatch = createEventDispatcher()

  onMount(() => {
    defineBocetoEdit()
  })

  $: if (el) {
    const handler = (e) => {
      code = e.detail.code
      dispatch('change', { code: e.detail.code })
    }
    el.addEventListener('change', handler)
  }
</script>

<boceto-edit
  bind:this={el}
  {code}
  {width}
  {height}
  readonly={readOnly ? '' : undefined}
  class={className}
  {style}
></boceto-edit>
