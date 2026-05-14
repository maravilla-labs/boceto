/**
 * Thin wrapper over picocolors so the rest of the CLI doesn't pull in the
 * dependency directly. Lets us swap or no-op the styling later without
 * touching every call site.
 */
import pc from 'picocolors'

const isTTY = process.stdout.isTTY === true
const useColor = isTTY && !process.env.NO_COLOR

export const c = {
  bold: (s: string) => (useColor ? pc.bold(s) : s),
  dim: (s: string) => (useColor ? pc.dim(s) : s),
  green: (s: string) => (useColor ? pc.green(s) : s),
  yellow: (s: string) => (useColor ? pc.yellow(s) : s),
  red: (s: string) => (useColor ? pc.red(s) : s),
  cyan: (s: string) => (useColor ? pc.cyan(s) : s),
  gray: (s: string) => (useColor ? pc.gray(s) : s),
}
