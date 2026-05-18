import { createElement, useEffect, useRef, type CSSProperties } from 'react'
import { defineBocetoView, type BocetoViewElement } from '@boceto/view'
import type { BocetoDoc } from '@boceto/core'

export interface BocetoViewProps {
  code?: string
  src?: string
  width?: number
  height?: number
  page?: string | number
  /**
   * Component-definition source merged into the parser before `code` is
   * parsed. Use when this view renders one fence of a multi-fence doc and
   * needs to resolve composites defined in a sibling fence or imported
   * library. Pushed via the JS property — bypasses attribute serialization
   * for large strings.
   */
  imports?: string
  className?: string
  style?: CSSProperties
  onRender?: (doc: BocetoDoc, page: string | number | undefined) => void
}

export function BocetoView(props: BocetoViewProps): JSX.Element {
  const ref = useRef<BocetoViewElement | null>(null)

  useEffect(() => {
    defineBocetoView()
  }, [])

  useEffect(() => {
    const el = ref.current as (BocetoViewElement & { imports?: string | null }) | null
    if (!el) return
    el.imports = props.imports ?? null
  }, [props.imports])

  useEffect(() => {
    const el = ref.current
    const onRender = props.onRender
    if (!el || !onRender) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { doc: BocetoDoc; page: string | number | undefined }
      onRender(detail.doc, detail.page)
    }
    el.addEventListener('boceto-render', handler)
    return () => el.removeEventListener('boceto-render', handler)
  }, [props.onRender])

  // createElement sidesteps the need to declare custom-element JSX intrinsics
  // on the call-site side. `@boceto/react`'s `./jsx-intrinsics` module
  // augments `JSX.IntrinsicElements` globally so direct tag-name usage from
  // consumers (e.g. `<boceto-view code=…>` or `components={{ 'boceto-view': … }}`
  // in react-markdown) is type-checked too — see `src/jsx-intrinsics.ts`.
  return createElement('boceto-view', {
    ref,
    code: props.code,
    src: props.src,
    width: props.width,
    height: props.height,
    page: props.page,
    class: props.className,
    style: props.style,
  })
}
