import { describe, expect, it, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { BocetoView, BocetoEdit } from '../src'

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (): null {
    return null
  } as unknown as HTMLCanvasElement['getContext']
})

describe('@boceto/react', () => {
  it('mounts <boceto-view> with the code prop', () => {
    const { container } = render(<BocetoView code='element box 0 0 100 50 "Hi"' />)
    const el = container.querySelector('boceto-view')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('code')).toContain('Hi')
  })

  it('mounts <boceto-edit> with the code prop', () => {
    const { container } = render(<BocetoEdit code='element box 0 0 100 50 "Hi"' />)
    const el = container.querySelector('boceto-edit')
    expect(el).not.toBeNull()
  })
})
