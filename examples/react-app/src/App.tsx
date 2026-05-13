import { useState } from 'react'
import { BocetoEdit, BocetoView } from '@boceto/react'

const INITIAL = `\`\`\`boceto:Login
element navbar 60 40 340 44 "MyApp"
element heading 130 110 200 28 "Welcome back"
element input 100 190 260 36 "Email"
element primary-button 100 240 260 36 "Sign In"
\`\`\``

export function App(): JSX.Element {
  const [code, setCode] = useState(INITIAL)
  return (
    <div style={{ padding: 24 }}>
      <h1>Boceto · React demo</h1>
      <BocetoEdit code={code} onChange={setCode} />
      <h2>Read-only render of the same source</h2>
      <BocetoView code={code} width={860} height={300} />
    </div>
  )
}
