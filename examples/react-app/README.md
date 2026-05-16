# React example (placeholder)

This package is the workspace slot for a future Vite + React demo using
`@boceto/react`. v0.1 ships only the package skeleton so the wrappers can be
imported in real apps; a full Vite scaffold lands once the editor port is in.

To use the wrappers in your own React app today:

```tsx
import { BocetoView, BocetoEditFull } from '@boceto/react'

export function Demo() {
  return (
    <>
      <BocetoView code={'element navbar 0 0 460 44 "MyApp"'} />
      {/* Editor + floating palette + property inspector, wired together. */}
      <BocetoEditFull
        code={'element box 0 0 100 50 "Edit me"'}
        onChange={(code) => console.log(code)}
      />
    </>
  )
}
```

Prefer `BocetoEditFull` when you want a usable authoring surface. `BocetoEdit`
alone renders only the canvas — handy when you need a custom layout for the
palette/inspector and wire them yourself via `BocetoPalette` / `BocetoInspector`
with a shared `id`.
