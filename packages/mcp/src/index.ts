/**
 * Public surface for embedders that want to spin up the MCP server on a
 * custom transport (anything other than stdio). The default `boceto-mcp`
 * binary calls `runStdioServer()` directly.
 */
export { createServer, runStdioServer } from './server'
export { runParse, type ParseResult } from './tools/parse'
export { runLint } from './tools/lint'
export { runFix, type FixResult } from './tools/fix'
export { runRenderSvg, type RenderSvgResult } from './tools/render-svg'
export { runListElements, type ListElementsResult } from './tools/list-elements'
export {
  runDescribeElement,
  type DescribeElementResult,
} from './tools/describe-element'
export {
  runListRecipes,
  runReadRecipe,
  type ListRecipesResult,
  type ReadRecipeResult,
  type RecipeMeta,
} from './tools/recipes'
export {
  RESOURCES,
  findResource,
  readResource,
  resolveResourcePath,
  type ResourceEntry,
} from './resources'
