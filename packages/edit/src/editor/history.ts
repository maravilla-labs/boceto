/**
 * Serialize-string-based undo/redo stack. The editor pushes a serialized
 * snapshot of the doc on every commit; undo/redo pops/pushes the strings and
 * re-parses to restore. Cheap, lossless (round-trip is core-tested), and
 * format-normalizing for free.
 */
export class History {
  #past: string[] = []
  #future: string[] = []
  #cap: number
  #txnDepth = 0
  #txnBase: string | null = null

  constructor(cap = 100) {
    this.#cap = Math.max(1, cap)
  }

  get canUndo(): boolean {
    return this.#past.length > 0
  }

  get canRedo(): boolean {
    return this.#future.length > 0
  }

  /**
   * Begin a transaction. Subsequent `push()` calls are coalesced into a
   * single history entry committed when the transaction closes. Nested
   * `begin`/`commit` pairs share the same outermost base.
   */
  begin(currentSnapshot: string): void {
    if (this.#txnDepth === 0) this.#txnBase = currentSnapshot
    this.#txnDepth += 1
  }

  /** Commit the open transaction. The active snapshot is what's stored. */
  commit(currentSnapshot: string): void {
    if (this.#txnDepth === 0) {
      this.push(currentSnapshot, this.#txnBase ?? currentSnapshot)
      return
    }
    this.#txnDepth -= 1
    if (this.#txnDepth === 0) {
      const base = this.#txnBase
      this.#txnBase = null
      if (base != null && base !== currentSnapshot) {
        this.#past.push(base)
        if (this.#past.length > this.#cap) this.#past.shift()
        this.#future.length = 0
      }
    }
  }

  /**
   * Push a history entry. If a transaction is open, this is a no-op — the
   * snapshot at `begin()` time is what gets recorded on `commit()`. Without
   * an open transaction, the previous snapshot becomes the undo target.
   */
  push(_nextSnapshot: string, previousSnapshot: string): void {
    if (this.#txnDepth > 0) return
    if (previousSnapshot === _nextSnapshot) return
    this.#past.push(previousSnapshot)
    if (this.#past.length > this.#cap) this.#past.shift()
    this.#future.length = 0
  }

  /** Pop the latest undo entry; push current onto the redo stack. Returns the snapshot to restore, or null. */
  undo(currentSnapshot: string): string | null {
    const prev = this.#past.pop()
    if (prev == null) return null
    this.#future.push(currentSnapshot)
    return prev
  }

  /** Pop the latest redo entry; push current onto the undo stack. */
  redo(currentSnapshot: string): string | null {
    const next = this.#future.pop()
    if (next == null) return null
    this.#past.push(currentSnapshot)
    return next
  }

  /** Clear all history. Called by `setCode()` (external source-of-truth reset). */
  clear(): void {
    this.#past.length = 0
    this.#future.length = 0
    this.#txnDepth = 0
    this.#txnBase = null
  }
}
