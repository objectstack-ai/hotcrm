// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the hotcrm end-to-end suite.
 *
 * Previously this pointed `baseURL` at port 4004 while `pnpm dev` / `pnpm start`
 * (and every doc) served 4001, and declared no `webServer`, so every spec hit a
 * closed port. Nothing noticed because no workflow ran playwright and `verify`
 * did not include it — the suite had been unrunnable for its entire life.
 */

const PORT = Number(process.env.HOTCRM_PORT ?? 4001);
export const BASE_URL = process.env.HOTCRM_BASE_URL ?? `http://localhost:${PORT}`;

const isCI = !!process.env.CI;

/**
 * Some sandboxes and prebuilt CI images ship a Chromium that does not match the
 * revision `@playwright/test` would download. Point this at that binary rather
 * than re-downloading; unset, Playwright resolves its own browser as usual.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The specs write real records through the REST API; a single worker keeps
  // the assertions on seeded aggregates deterministic.
  workers: 1,
  forbidOnly: isCI,
  // A retry buys the trace below. Locally, failing fast is more useful.
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    // `off` meant a CI failure produced a bare assertion message and nothing to
    // debug from. The retry above makes the first failure cheap to re-run with
    // a full trace attached.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
  // `objectstack start` serves the built artifact, so the build has to run
  // first. Reusing an already-running dev server locally keeps the edit/run
  // loop fast; CI always gets a cold, freshly built server.
  webServer: {
    command: `pnpm run build && pnpm exec objectstack start -p ${PORT}`,
    url: `${BASE_URL}/api/v1/health`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
