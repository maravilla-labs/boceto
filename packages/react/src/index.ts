export { BocetoView, type BocetoViewProps } from './BocetoView'
export { BocetoEdit, type BocetoEditProps } from './BocetoEdit'
export { BocetoPalette, type BocetoPaletteProps } from './BocetoPalette'
export { BocetoInspector, type BocetoInspectorProps } from './BocetoInspector'
export { BocetoEditFull, type BocetoEditFullProps } from './BocetoEditFull'

// Side-effect-only import: pulls the `JSX.IntrinsicElements` augmentation
// for the five boceto custom-element tags into the consumer's type graph
// so `<boceto-view code={…} />` and `components={{ 'boceto-view': … }}`
// (react-markdown) are first-class typed without manual declarations.
import './jsx-intrinsics'
