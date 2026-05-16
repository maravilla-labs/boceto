import { Fragment, useId, type CSSProperties } from 'react'
import { BocetoEdit, type BocetoEditProps } from './BocetoEdit'
import { BocetoPalette } from './BocetoPalette'
import { BocetoInspector } from './BocetoInspector'

export interface BocetoEditFullProps extends BocetoEditProps {
  /**
   * Pin the palette open by default (skip the ⌘K keyboard summon).
   * Reserved — the underlying element does not yet honor this; included so
   * the prop shape stays stable as that feature lands.
   */
  paletteAlwaysOpen?: boolean
  /** Class names forwarded to the palette element. */
  paletteClassName?: string
  /** Class names forwarded to the inspector element. */
  inspectorClassName?: string
  /** Style override for the palette element. */
  paletteStyle?: CSSProperties
  /** Style override for the inspector element. */
  inspectorStyle?: CSSProperties
  /**
   * Auto-show the inspector when an element is selected (default true).
   * Mirrors `<BocetoInspector auto>`.
   */
  inspectorAuto?: boolean
}

/**
 * The full authoring surface: `<boceto-edit>` plus its floating palette and
 * property inspector, wired together by a stable id. This is what you want
 * if you're embedding the editor inside a React app — `BocetoEdit` alone
 * has no way to add elements or change properties.
 *
 * The palette and inspector mount in document.body (they escape the host's
 * shadow root), so a host that uses `overflow: hidden` won't clip them.
 *
 * Override `props.id` to wire additional consumers (e.g. external toolbar
 * buttons that target the editor via `document.getElementById`). When
 * unset, a stable `useId`-based id is generated and threaded through.
 */
export function BocetoEditFull(props: BocetoEditFullProps): JSX.Element {
  const {
    paletteAlwaysOpen: _ignored,
    paletteClassName,
    inspectorClassName,
    paletteStyle,
    inspectorStyle,
    inspectorAuto,
    id: providedId,
    ...editProps
  } = props
  const rawId = useId()
  // `useId` returns a `:r0:` style string in some setups — strip characters
  // that aren't valid in HTML id attrs so the `for=` linkage works.
  const fallbackId = `boceto-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const id = providedId || fallbackId

  return (
    <Fragment>
      <BocetoEdit {...editProps} id={id} />
      <BocetoPalette for={id} className={paletteClassName} style={paletteStyle} />
      <BocetoInspector
        for={id}
        auto={inspectorAuto !== false}
        className={inspectorClassName}
        style={inspectorStyle}
      />
    </Fragment>
  )
}
