/**
 * Browser bundle entry point.
 *
 * Re-exports the full public API of `@boceto/core` so the bundler produces a
 * single self-contained ESM file with `yoga-layout` inlined — suitable for
 * loading directly from a static site via `<script type="module">`.
 *
 * Consumers that go through a bundler / Node should keep importing from
 * `@boceto/core` (the regular entry) so workspace dependents share a single
 * core instance and yoga-layout stays external.
 */
export * from './index'
