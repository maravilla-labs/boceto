import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import {
  parseInputSchema,
  runParse,
} from './tools/parse'
import { lintInputSchema, runLint } from './tools/lint'
import { fixInputSchema, runFix } from './tools/fix'
import { renderSvgInputSchema, runRenderSvg } from './tools/render-svg'
import { listElementsInputSchema, runListElements } from './tools/list-elements'
import {
  describeElementInputSchema,
  runDescribeElement,
} from './tools/describe-element'
import {
  listRecipesInputSchema,
  readRecipeInputSchema,
  runListRecipes,
  runReadRecipe,
} from './tools/recipes'
import {
  listIntegrationsInputSchema,
  readIntegrationInputSchema,
  runListIntegrations,
  runReadIntegration,
} from './tools/integrations'
import { findResource, readResource, RESOURCES } from './resources'

const SERVER_NAME = '@boceto/mcp'
// Keep this in sync with packages/mcp/package.json on each release.
const SERVER_VERSION = '0.1.0'

/**
 * Build a configured `McpServer` instance with every tool + resource
 * registered. Exported so embedders can attach a custom transport;
 * `runStdioServer()` wires this up to stdio for the `boceto-mcp` binary.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  })

  // ── Tools ────────────────────────────────────────────────────────────

  server.registerTool(
    'boceto_parse',
    {
      title: 'Parse Boceto DSL',
      description:
        'Parse Boceto DSL source into a structured document. Returns either `{ ok: true, doc }` or `{ ok: false, error: { line, message } }`. Use this to confirm the source is well-formed before rendering — but prefer `boceto_lint` for actionable diagnostics with autofixes.',
      inputSchema: parseInputSchema,
    },
    async (args) => {
      const result = runParse(args)
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_lint',
    {
      title: 'Lint Boceto DSL',
      description:
        'Lint Boceto DSL. Returns every issue with line + column + endColumn + severity + message, plus an autofixed copy of the source. Iterative under the hood — multiple fixable issues per line are coalesced. The shape lines up with editor diagnostic protocols (LSP / CodeMirror).',
      inputSchema: lintInputSchema,
    },
    async (args) => {
      const result = runLint(args)
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_fix',
    {
      title: 'Auto-fix Boceto DSL',
      description:
        'Convenience wrapper: runs the linter and returns the rewritten source. Use this when you only care about getting a clean version back. The `issues` array still surfaces anything the linter could not autofix (e.g. unknown element types with no close suggestion).',
      inputSchema: fixInputSchema,
    },
    async (args) => {
      const result = runFix(args)
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_render_svg',
    {
      title: 'Render Boceto DSL as SVG',
      description:
        'Render one page of a Boceto document as an SVG string. Initialises Yoga on first use, applies flex layout, optionally grows the canvas to encompass content (`fit="content"`), and produces deterministic byte-identical output for the same input. The SVG is self-contained — no external CSS or font dependencies.',
      inputSchema: renderSvgInputSchema,
    },
    async (args) => {
      const result = await runRenderSvg(args)
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_list_elements',
    {
      title: 'List Boceto element types',
      description:
        'Return every supported element type, grouped by category, with default w/h/label hints. Use this to discover what is available — agents should prefer canonical types over invented ones (Frame → box, NavBar → navbar, icon-button → button).',
      inputSchema: listElementsInputSchema,
    },
    async () => {
      const result = runListElements({})
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_describe_element',
    {
      title: 'Describe a Boceto element type',
      description:
        'Return per-element details: category, default dimensions, default label, and the type-specific attribute schema (items, headers, data, model, etc.) so you know exactly which extra `key=value` attrs apply.',
      inputSchema: describeElementInputSchema,
    },
    async (args) => {
      const result = runDescribeElement(args)
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_list_recipes',
    {
      title: 'List Boceto recipes',
      description:
        'List every shipped recipe (slug + kind + title + summary). Recipes come in two flavours — `mockup` (full-page starting points like login, dashboard, chat) and `shell` (reusable composite components like appshell, dialog, kanban-column). Use the slugs returned here with `boceto_read_recipe`. Cheap call — recommended as the first step when starting a new mockup so you pattern-match against a known-good design.',
      inputSchema: listRecipesInputSchema,
    },
    async () => {
      const result = runListRecipes({})
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_read_recipe',
    {
      title: 'Read a Boceto recipe',
      description:
        'Return the full markdown body of one recipe (front-matter meta + the source code block). Use after `boceto_list_recipes` once you have a slug. Recipes are designed to be adapted — clone the block, change labels and dimensions, leave the structure intact.',
      inputSchema: readRecipeInputSchema,
    },
    async (args) => {
      const result = runReadRecipe(args)
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_list_integrations',
    {
      title: 'List integration recipes for embedding the boceto editor',
      description:
        'List every available integration recipe (slug + kind + title + summary): how to embed `<boceto-edit>` and friends into a host application across stacks (TipTap + React, plain web components, React app, docs-site renderer). Start here when the user asks to add boceto to their app, integrate the editor, wire up a Boceto block in TipTap, render boceto in their docs, or anything similar.',
      inputSchema: listIntegrationsInputSchema,
    },
    async () => {
      const result = runListIntegrations({})
      return toolResult(result)
    },
  )

  server.registerTool(
    'boceto_read_integration',
    {
      title: 'Read an integration recipe',
      description:
        'Return the full markdown body for one integration slug — install commands, wiring code, the custom-element / event surface, peer dependencies, and gotchas. Pair with `boceto_list_integrations` for discovery. Slugs available today: `index`, `tiptap-react`, `web-components`, `react`, `docs-site`.',
      inputSchema: readIntegrationInputSchema,
    },
    async (args) => {
      const result = runReadIntegration(args)
      return toolResult(result)
    },
  )

  // ── Resources ────────────────────────────────────────────────────────

  for (const entry of RESOURCES) {
    server.registerResource(
      entry.name,
      entry.uri,
      {
        description: entry.description,
        mimeType: entry.mimeType,
      },
      async (uri) => {
        const matched = findResource(uri.href)
        if (!matched) {
          throw new Error(`Unknown resource: ${uri.href}`)
        }
        const text = readResource(matched)
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: matched.mimeType,
              text,
            },
          ],
        }
      },
    )
  }

  return server
}

/**
 * MCP `tools/call` results must be returned as `content` blocks. We send a
 * single JSON text block — every consumer (Claude Desktop, Cursor, Cline)
 * can parse it, and the SDK also surfaces it under `structuredContent` for
 * clients that prefer typed access. `isError` is left false because the
 * tools themselves encode failure in their payload (`ok: false`, etc.) —
 * a runtime exception (which the SDK catches separately) is the only path
 * to `isError: true`.
 */
function toolResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload as Record<string, unknown>,
  }
}

/**
 * Spawn the server on stdio. The `boceto-mcp` bin script calls this.
 */
export async function runStdioServer(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
