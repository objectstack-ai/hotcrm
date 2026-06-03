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
  },
});
