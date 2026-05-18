export { BocetoView } from './BocetoView'
export { BocetoEdit } from './BocetoEdit'

// Side-effect-only import: declares the five boceto custom-element tags on
// Vue's `GlobalComponents` so consumers using the raw elements in templates
// (e.g. `<boceto-view code="…">`) get full prop autocomplete + type-checking.
import './custom-elements'
