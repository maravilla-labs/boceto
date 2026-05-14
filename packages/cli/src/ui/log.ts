/**
 * Tiny logger matching the existing `✓` / `✗` style. Non-clack: used by
 * non-interactive commands (`add`, `check --json`) and by the installer
 * modules so they stay framework-agnostic.
 */
import { c } from './colors'

export function ok(msg: string): void {
  console.log(`${c.green('✓')} ${msg}`)
}

export function info(msg: string): void {
  console.log(`  ${c.dim(msg)}`)
}

export function warn(msg: string): void {
  console.log(`${c.yellow('!')} ${msg}`)
}

export function fail(msg: string): void {
  console.error(`${c.red('✗')} ${msg}`)
}

export function step(msg: string): void {
  console.log(`${c.cyan('→')} ${msg}`)
}
