import { createElement, useEffect, useRef, type CSSProperties } from 'react'
import { defineBocetoEdit, type BocetoEditElement } from '@boceto/edit'

export interface BocetoEditProps {
  code?: string
  width?: number
  height?: number
  readOnly?: boolean
  className?: string
  style?: CSSProperties
  onChange?: (code: string) => void
}

export function BocetoEdit(props: BocetoEditProps): JSX.Element {
  const ref = useRef<BocetoEditElement | null>(null)

  useEffect(() => {
    defineBocetoEdit()
  }, [])

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
    code: props.code,
    width: props.width,
    height: props.height,
    readonly: props.readOnly ? '' : undefined,
    class: props.className,
    style: props.style,
  })
}
