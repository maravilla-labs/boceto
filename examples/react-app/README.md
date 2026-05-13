# React example (placeholder)

This package is the workspace slot for a future Vite + React demo using
`@boceto/react`. v0.1 ships only the package skeleton so the wrappers can be
imported in real apps; a full Vite scaffold lands once the editor port is in.

To use the wrappers in your own React app today:

```tsx
import { BocetoView, BocetoEdit } from '@boceto/react'

export function Demo() {
  return (
    <>
      <BocetoView code={'element navbar 0 0 460 44 "MyApp"'} />
      <BocetoEdit
        code={'element box 0 0 100 50 "Edit me"'}
        onChange={(code) => console.log(code)}
      />
    </>
  )
}
```
