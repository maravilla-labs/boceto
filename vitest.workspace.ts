import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/core',
  'packages/view',
  'packages/edit',
  'packages/remark-boceto',
  'packages/markdown-it-boceto',
  'packages/react',
])
