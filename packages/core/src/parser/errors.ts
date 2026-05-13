/**
 * Error type for every authoring problem the parser reports. Carries the
 * 1-based line number and raw line so callers (editors, error overlays) can
 * surface the failure in source.
 */
export class BocetoParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly source?: string,
  ) {
    super(message)
    this.name = 'BocetoParseError'
  }
}
