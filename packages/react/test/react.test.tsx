import { describe, expect, it, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import {
  BocetoView,
  BocetoEdit,
  BocetoPalette,
  BocetoInspector,
  BocetoEditFull,
} from '../src'

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

  it('forwards `id` and `imports` on <BocetoEdit>', () => {
    const { container } = render(
      <BocetoEdit
        id="ed-1"
        code='element box 0 0 10 10 ""'
        imports={'```boceto\ncomponent some-comp()\n  element box 0 0 10 10 ""\nend\n```'}
      />,
    )
    const el = container.querySelector('boceto-edit') as HTMLElement & {
      imports?: string | null
    }
    expect(el?.getAttribute('id')).toBe('ed-1')
    // `imports` is plumbed via the JS property, not the attribute.
    expect(el?.imports).toContain('component some-comp')
    expect(el?.getAttribute('imports')).toBeNull()
  })

  it('mounts <boceto-palette> wired by `for=`', () => {
    const { container } = render(<BocetoPalette for="ed-1" />)
    const el = container.querySelector('boceto-palette')
    expect(el?.getAttribute('for')).toBe('ed-1')
  })

  it('mounts <boceto-inspector> with auto by default and lets you turn it off', () => {
    const { container, rerender } = render(<BocetoInspector for="ed-1" />)
    const el = container.querySelector('boceto-inspector')
    expect(el?.hasAttribute('auto')).toBe(true)
    rerender(<BocetoInspector for="ed-1" auto={false} />)
    expect(container.querySelector('boceto-inspector')?.hasAttribute('auto')).toBe(false)
  })

  describe('<BocetoEditFull>', () => {
    it('mounts the editor + palette + inspector wired by a shared id', () => {
      const { container } = render(<BocetoEditFull code='element box 0 0 10 10 ""' />)
      const edit = container.querySelector('boceto-edit')
      const palette = container.querySelector('boceto-palette')
      const inspector = container.querySelector('boceto-inspector')
      expect(edit).not.toBeNull()
      expect(palette).not.toBeNull()
      expect(inspector).not.toBeNull()
      const id = edit?.getAttribute('id')
      expect(id).toBeTruthy()
      expect(palette?.getAttribute('for')).toBe(id)
      expect(inspector?.getAttribute('for')).toBe(id)
    })

    it('honors an explicit `id` prop', () => {
      const { container } = render(
        <BocetoEditFull id="my-editor" code='element box 0 0 10 10 ""' />,
      )
      expect(container.querySelector('boceto-edit')?.getAttribute('id')).toBe('my-editor')
      expect(container.querySelector('boceto-palette')?.getAttribute('for')).toBe('my-editor')
      expect(container.querySelector('boceto-inspector')?.getAttribute('for')).toBe('my-editor')
    })

    it('passes through `imports` to the inner editor', () => {
      const { container } = render(
        <BocetoEditFull
          code='element box 0 0 10 10 ""'
          imports={'```boceto\ncomponent some-comp()\n  element box 0 0 10 10 ""\nend\n```'}
        />,
      )
      const el = container.querySelector('boceto-edit') as HTMLElement & {
        imports?: string | null
      }
      expect(el?.imports).toContain('component some-comp')
    })

    it('respects `inspectorAuto={false}`', () => {
      const { container } = render(
        <BocetoEditFull code='element box 0 0 10 10 ""' inspectorAuto={false} />,
      )
      expect(container.querySelector('boceto-inspector')?.hasAttribute('auto')).toBe(false)
    })
  })
})
