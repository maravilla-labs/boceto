import {
  defineComponent,
  h,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from 'vue'
import { defineBocetoEdit, type BocetoEditElement } from '@boceto/edit'

/**
 * `<BocetoEdit>` — Vue 3 wrapper around the `<boceto-edit>` custom element.
 *
 * The element's native `change` event is re-emitted as `update:code`, so
 * consumers can use `v-model:code="…"` for two-way binding alongside the
 * idiomatic `@update:code` listener.
 */
export const BocetoEdit = defineComponent({
  name: 'BocetoEdit',
  props: {
    code: { type: String, default: undefined },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    readOnly: { type: Boolean, default: false },
    bocetoClass: { type: String, default: undefined },
    bocetoStyle: {
      type: [String, Object] as PropType<string | Record<string, string | number>>,
      default: undefined,
    },
  },
  emits: {
    'update:code': (_code: string) => true,
  },
  setup(props, { emit }) {
    const elRef = ref<BocetoEditElement | null>(null)

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { code: string }
      emit('update:code', detail.code)
    }

    onMounted(() => {
      defineBocetoEdit()
      elRef.value?.addEventListener('change', onChange)
    })

    onBeforeUnmount(() => {
      elRef.value?.removeEventListener('change', onChange)
    })

    watch(elRef, (next, prev) => {
      prev?.removeEventListener('change', onChange)
      next?.addEventListener('change', onChange)
    })

    return () =>
      h('boceto-edit', {
        ref: elRef,
        code: props.code,
        width: props.width,
        height: props.height,
        // Reflect boolean as an attribute: empty string when true, undefined when false.
        readonly: props.readOnly ? '' : undefined,
        class: props.bocetoClass,
        style: props.bocetoStyle,
      })
  },
})
