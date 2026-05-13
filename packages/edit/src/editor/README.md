# Editor (interactions, not implemented yet)

`<boceto-edit>` currently ships a read-only canvas — visually identical to
`<boceto-view>`. A later release will add canvas interactions onto that
surface:

- selection (click, shift-click, rubber-band)
- drag to move, handles to resize
- draw new elements via toolbar selection
- multi-page tabs with rename / delete / add
- undo / redo (Cmd-Z, Cmd-Shift-Z)
- keyboard shortcuts (delete, duplicate, arrow nudging)
- inline label editing (double-click)
- properties panel for the selected element

The mechanical port from the React POC at `XWireframeEditor.jsx`:

- `state.ts` — pages/selection/history reducer (POC `useState` chunks)
- `interactions.ts` — pointer + keyboard handlers (POC `:649-899`)
- `toolbar.ts` — `TOOL_GROUPS` definitions (POC `:449-491`)
- `ui.ts` — DOM scaffolding (sidebar, panel, page tabs)
