import { createElement, useEffect, useRef, type CSSProperties, type Ref } from 'react'
import { defineBocetoEdit, type BocetoEditElement } from '@boceto/edit'

export interface BocetoEditProps {
  /** Inline DSL source. */
  code?: string
  /** URL to fetch DSL source from. Used when `code` isn't set. */
  src?: string
  /** Canvas pixel width (default 860). */
  width?: number
  /** Canvas pixel height (default 600). */
  height?: number
  /** Page id, name, or numeric index. */
  page?: string | number
  /** Disable mutations. */
  readOnly?: boolean
  /**
   * Component-definition source merged into the parser before `code` is
   * parsed. Lets one editor instance resolve components defined elsewhere
   * (e.g. another fence in the same TipTap doc). Pass `null` to clear.
   */
  imports?: string | null
  /**
   * Optional DOM id. Set this when you need to wire a separate
   * `<BocetoPalette for={id}>` / `<BocetoInspector for={id}>` to this
   * editor; otherwise use `<BocetoEditFull>` which manages the id for you.
   */
  id?: string
  className?: string
  style?: CSSProperties
  /** Fires on every user-initiated commit. */
  onChange?: (code: string) => void
  /** Forwarded ref for power-user access to the underlying element. */
  innerRef?: Ref<BocetoEditElement | null>
}

export function BocetoEdit(props: BocetoEditProps): JSX.Element {
  const ref = useRef<BocetoEditElement | null>(null)

  useEffect(() => {
    defineBocetoEdit()
  }, [])

  // Forward to the optional `innerRef` after each render. Use an effect so
  // callers can capture the ref via `useState`-driven callbacks too.
  useEffect(() => {
    if (typeof props.innerRef === 'function') props.innerRef(ref.current)
    else if (props.innerRef && 'current' in props.innerRef) {
      ;(props.innerRef as { current: BocetoEditElement | null }).current = ref.current
    }
  })

  // Push `imports` via the JS property — bypasses attribute serialization
  // for potentially-large strings, and `null` clears the override.
  useEffect(() => {
    const el = ref.current as (BocetoEditElement & { imports?: string | null }) | null
    if (!el) return
    el.imports = props.imports ?? null
  }, [props.imports])

  useEffect(() => {
    const el = ref.current
    const onChange = props.onChange
    if (!el || !onChange) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { code: string }
      onChange(detail.code)
    }
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
  }, [props.onChange])

  return createElement('boceto-edit', {
    ref,
    id: props.id,
    code: props.code,
    src: props.src,
    width: props.width,
    height: props.height,
    page: props.page,
    readonly: props.readOnly ? '' : undefined,
    class: props.className,
    style: props.style,
  })
}
