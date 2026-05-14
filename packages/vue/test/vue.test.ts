import { describe, expect, it, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { BocetoView, BocetoEdit } from '../src'

beforeAll(() => {
  // happy-dom's canvas doesn't support 2D contexts; stub so the custom
  // element's rendering attempt doesn't blow up under test.
  HTMLCanvasElement.prototype.getContext = function (): null {
    return null
  } as unknown as HTMLCanvasElement['getContext']
})

/**
 * Vue 3 with unregistered custom elements writes string-shaped props as
 * DOM attributes AND falls back to DOM properties when an attribute can't
 * carry the value (numbers, booleans, objects). The test accepts either
 * route — what matters is that the value made it to the element.
 */
function getCode(el: HTMLElement | null): string | null {
  if (!el) return null
  const attr = el.getAttribute('code')
  if (attr != null) return attr
  return (el as unknown as { code?: string }).code ?? null
}

describe('@boceto/vue', () => {
  it('mounts <boceto-view> with the code prop', () => {
    const wrapper = mount(BocetoView, {
      props: { code: 'element box 0 0 100 50 "Hi"' },
    })
    const el = wrapper.element as HTMLElement
    expect(el.tagName.toLowerCase()).toBe('boceto-view')
    expect(getCode(el)).toContain('Hi')
  })

  it('mounts <boceto-edit> with the code prop', () => {
    const wrapper = mount(BocetoEdit, {
      props: { code: 'element box 0 0 100 50 "Hi"', readOnly: true },
    })
    const el = wrapper.element as HTMLElement
    expect(el.tagName.toLowerCase()).toBe('boceto-edit')
    expect(getCode(el)).toContain('Hi')
  })
})
