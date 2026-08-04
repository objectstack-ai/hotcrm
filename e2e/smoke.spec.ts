// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { test, expect, recordsOf } from './fixtures';
import { SEEDS_UNREADABLE_MID_RUN } from './seed-precondition';

/**
 * Server smoke tests — the routes are mounted and the CRM data is reachable.
 */

test('health endpoint reports ok', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.status).toBe('ok');
  // `data.version` is the ObjectStack *health payload* schema version, not
  // hotcrm's. Pinning it to the literal '1.0.0' asserted a platform-owned
  // constant that no change to this repo can affect and that any platform bump
  // would break. Assert the shape instead; hotcrm's own version is pinned in
  // test/smoke.test.ts against the manifest, where it means something.
  expect(body.data.version, 'health version should be a semver string').toMatch(/^\d+\.\d+\.\d+/);
  expect(typeof body.data.uptime).toBe('number');
});

// ObjectStack 7.x serves the unified UI shell (Studio + apps) under
// `/_console/`; the legacy `/_studio/` and `/_account/` mounts were removed.
test('console shell loads', async ({ page }) => {
  const response = await page.goto('/_console/');
  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/.+/);
  const html = await page.content();
  expect(html.length).toBeGreaterThan(100);
});

test('login page loads', async ({ page }) => {
  const response = await page.goto('/_console/login');
  expect(response?.status()).toBeLessThan(400);
  const html = await page.content();
  expect(html.length).toBeGreaterThan(100);
});

test('the CRM data API is auth-gated', async ({ request }) => {
  // Unauthenticated, on purpose: this is the assertion the old spec *thought*
  // it was making when it accepted `[200, 401, 403]` for an anonymous read.
  // Accepting 200 there meant a regression that exposed every account
  // anonymously would have kept the suite green.
  const res = await request.get('/api/v1/data/crm_account?limit=1');
  expect([401, 403]).toContain(res.status());
});

test('REST API serves seeded hotcrm records to an authenticated caller', async ({ api }) => {
  const res = await api.get('/api/v1/data/crm_account?limit=5');
  expect(res.ok(), `authenticated read failed: ${res.status()} ${await res.text()}`).toBeTruthy();

  const records = recordsOf(await res.json());
  expect(records.length, `no seeded accounts returned — ${SEEDS_UNREADABLE_MID_RUN}`).toBeGreaterThan(0);
  // A real record, not just a 200 with an empty envelope.
  expect(typeof records[0].id).toBe('string');
  expect(typeof records[0].name).toBe('string');
});

test('every core CRM object is queryable', async ({ api }) => {
  const objects = [
    'crm_account', 'crm_contact', 'crm_lead', 'crm_opportunity',
    'crm_case', 'crm_campaign', 'crm_quote', 'crm_task', 'crm_product',
  ];
  for (const name of objects) {
    const res = await api.get(`/api/v1/data/${name}?limit=1`);
    expect(res.ok(), `${name} is not queryable: ${res.status()}`).toBeTruthy();
  }
});
