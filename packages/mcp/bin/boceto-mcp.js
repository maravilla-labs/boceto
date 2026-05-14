#!/usr/bin/env node
/**
 * Stdio entry point for the Boceto MCP server. Spawned by AI clients via
 * `npx -y @boceto/mcp` per their `mcpServers` config.
 *
 * Keep this file dependency-free — the real wiring lives in `dist/server.js`.
 */
import('../dist/server.js').then(({ runStdioServer }) => runStdioServer()).catch((err) => {
  console.error('[boceto-mcp] failed to start:', err)
  process.exit(1)
})
