import { defineComponent, h, onMounted, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { defineBocetoView, type BocetoViewElement } from '@boceto/view'
import type { BocetoDoc } from '@boceto/core'

/**
 * `<BocetoView>` — Vue 3 wrapper around the `<boceto-view>` custom element.
 *
 * Props mirror the underlying element's attributes; the `boceto-render`
 * CustomEvent is re-emitted as Vue's `render` event so consumers can do
 * `<BocetoView @render="onRender" :code="…" />`.
 *
 * Uses a render function rather than an SFC so the package can ship through
 * the same tsup pipeline as the other Boceto packages — no Vue compiler
 * step required at build time, and consumers' Vue tooling treats the
 * exported component as a regular runtime component.
 */
export const BocetoView = defineComponent({
  name: 'BocetoView',
  props: {
    code: { type: String, default: undefined },
    src: { type: String, default: undefined },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    page: { type: [String, Number] as PropType<string | number>, default: undefined },
    bocetoClass: { type: String, default: undefined },
    bocetoStyle: {
      type: [String, Object] as PropType<string | Record<string, string | number>>,
      default: undefined,
    },
  },
  emits: {
    render: (_doc: BocetoDoc, _page: string | number | undefined) => true,
  },
  setup(props, { emit }) {
    const elRef = ref<BocetoViewElement | null>(null)

    const onRender = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        doc: BocetoDoc
        page: string | number | undefined
      }
      emit('render', detail.doc, detail.page)
    }

    onMounted(() => {
      defineBocetoView()
      elRef.value?.addEventListener('boceto-render', onRender)
    })

    onBeforeUnmount(() => {
      elRef.value?.removeEventListener('boceto-render', onRender)
    })

    // When ref changes (rare — only on dynamic re-mount), rebind the
    // listener. Vue's keepalive/teleport edge cases.
    watch(elRef, (next, prev) => {
      prev?.removeEventListener('boceto-render', onRender)
      next?.addEventListener('boceto-render', onRender)
    })

    return () =>
      h('boceto-view', {
        ref: elRef,
        code: props.code,
        src: props.src,
        width: props.width,
        height: props.height,
        page: props.page,
        class: props.bocetoClass,
        style: props.bocetoStyle,
      })
  },
})
