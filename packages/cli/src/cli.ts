/**
 * `boceto` CLI entry. Hand-rolled dispatcher — see `util/argv.ts` for the
 * tiny parser.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from './util/argv'
import { runAdd } from './commands/add'
import { runCheck } from './commands/check'
import { runList } from './commands/list'
import { printHelp } from './commands/help'
import { fail } from './ui/log'

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const [cmd, ...rest] = argv

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp(rest[0])
    return
  }
  if (cmd === '--version' || cmd === '-v') {
    console.log(readOwnVersion())
    return
  }

  const args = parseArgs(rest)
  let exit = 0
  try {
    switch (cmd) {
      case 'add':
        exit = await runAdd(args)
        break
      case 'check':
        exit = await runCheck(args)
        break
      case 'list':
        exit = runList(args)
        break
      default:
        fail(`unknown command: ${cmd}`)
        printHelp()
        exit = 1
    }
  } catch (err) {
    fail((err as Error).message ?? String(err))
    exit = 1
  }
  if (exit !== 0) process.exit(exit)
}

function readOwnVersion(): string {
  try {
    // dist/cli.js → packages/cli/dist → packages/cli
    const here = dirname(fileURLToPath(import.meta.url))
    const pkg = JSON.parse(
      readFileSync(resolve(here, '..', 'package.json'), 'utf8'),
    ) as { version?: string }
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}
