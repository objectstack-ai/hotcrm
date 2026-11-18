// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineConfig } from 'vitest/config';

/**
 * Floors sit just under the measured numbers, so they lock in the
 * runtime-test work rather than aspiring to it. Raise them as coverage
 * improves; never lower them to turn a red build green.
 */
const COVERAGE_THRESHOLDS = {
  lines: 95,       // measured 99.6
  statements: 92,  // measured 94.9
  functions: 92,   // measured 95.3
  branches: 78,    // measured 80.2
};

/**
 * A `--shard=i/N` run executes one slice of the files, so its coverage is
 * partial by construction: a hook exercised only by another shard's files
 * reads 0% here. CI runs the suite as N shards (`.github/workflows/ci.yml`,
 * #2645), each writing a blob report, and its required "Build and Test (22.x)"
 * job merges them with `vitest run --merge-reports --coverage` — a run with no
 * `--shard`, which checks COVERAGE_THRESHOLDS on the merged coverage of the
 * whole suite. So a shard skips the check and the merge enforces it; every run
 * without `--shard` (`pnpm test:coverage` included) enforces it as before.
 */
const isShardRun = process.argv.some((arg) => arg === '--shard' || arg.startsWith('--shard='));

/**
 * Vitest runs the metadata unit tests under `test/` only. The Playwright
 * end-to-end specs live in `e2e/*.spec.ts` and are run separately via
 * `pnpm test:e2e` — they must NOT be picked up by Vitest.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      /**
       * Scoped to the hook handlers — the only part of `src/` that is
       * executable code. Everything else (objects, views, seed data,
       * translations) is declarative metadata whose line-coverage number is
       * pure noise, and including it diluted the signal enough to hide the
       * fact that 20 of 24 hooks had no runtime test at all.
       *
       * Each package's `flows/*.flow.ts` is deliberately NOT here for the
       * same reason, and for a sharper one: a flow file is an object literal,
       * so importing it scores 100% whether or not any test ever executes the
       * flow. Flow coverage is asserted structurally instead — see
       * `test/runtime-coverage.test.ts`, which fails when a registered flow or
       * hook has no runtime test naming it.
       *
       * That path is written WITHOUT its `src/` prefix on purpose. The real
       * glob is `src/` + `*` + `/flows/*.flow.ts`, and spelling it out here
       * would put `*` immediately before `/`, which ENDS this block comment —
       * the rest of the paragraph becomes code and `tsc` fails at the line
       * below. Same trap for every `src/` + `*` + `/` path in a block comment.
       */
      include: ['src/*/objects/*.hook.ts'],
      thresholds: isShardRun ? undefined : COVERAGE_THRESHOLDS,
    },
  },
});
