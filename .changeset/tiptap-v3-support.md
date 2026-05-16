---
'@boceto/tiptap': patch
---

Support TipTap v3 alongside v2.

- Widened `peerDependencies.@tiptap/core` and `peerDependencies.@tiptap/react` from `^2.0.0` to `^2.0.0 || ^3.0.0`.
- Verified the package builds and all tests pass against `@tiptap/core@3.23.4` and `@tiptap/react@3.23.4`. The integration only touches stable API (`Node.create`, `Extension.create`, `mergeAttributes`, `NodeViewWrapper`, `ReactNodeViewRenderer`, `editor.storage`, `editor.state.doc.descendants`) — no code changes required for v3.

Consumers on v2 are unaffected. Consumers on v3 (including `@tiptap/react@^3.20.0`) can now install `@boceto/tiptap` without peer-dep warnings.

Note: `@tiptap/extension-table` v3 dropped its default export (it's now a named export). That change only affected the site demo's island bundle, not this package.
