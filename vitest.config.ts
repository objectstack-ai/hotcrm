// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineConfig } from 'vitest/config';

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
       * `src/flows/*.flow.ts` is deliberately NOT here for the same reason,
       * and for a sharper one: a flow file is an object literal, so importing
       * it scores 100% whether or not any test ever executes the flow. Flow
       * coverage is asserted structurally instead — see
       * `test/runtime-coverage.test.ts`, which fails when a registered flow or
       * hook has no runtime test naming it.
       */
      include: ['src/objects/*.hook.ts'],
      /**
       * Floors sit just under the measured numbers, so they lock in the
       * runtime-test work rather than aspiring to it. Raise them as coverage
       * improves; never lower them to turn a red build green.
       */
      thresholds: {
        lines: 95,       // measured 99.6
        statements: 92,  // measured 94.9
        functions: 92,   // measured 95.3
        branches: 78,    // measured 80.2
      },
    },
  },
});
