// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { test, expect, recordOf, recordsOf, sessionUserId } from './fixtures';

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

test('the REST API serves an authenticated caller the records it owns', async ({ api, account }) => {
  // This used to read the SEEDED accounts, and passed only while nobody owned
  // them (#665). It now reads a record this caller created, and says out loud
  // WHY that read is allowed: `crm_account` is `sharingModel: 'private'` and
  // this account is a plain org member holding no grant, so the owner match
  // below is the entire reason the row comes back rather than a 403 or an
  // empty list. See the access-control note in `./fixtures.ts` (#669).
  const single = await api.get(`/api/v1/data/crm_account/${account.id}`);
  expect(single.ok(), `authenticated read failed: ${single.status()} ${await single.text()}`).toBeTruthy();

  const mine = recordOf(await single.json());
  expect(mine.id).toBe(account.id);
  expect(typeof mine.name).toBe('string');
  expect(mine.owner_id, 'the caller reads this row because it OWNS it').toBe(sessionUserId());

  // The collection route serves it too — a by-id read alone would not show that
  // the row is reachable through a list, which is what every view issues.
  const list = await api.get('/api/v1/data/crm_account?limit=200');
  expect(list.ok(), `authenticated list failed: ${list.status()}`).toBeTruthy();
  const records = recordsOf(await list.json());
  expect(records.length, 'the list route returned no records at all').toBeGreaterThan(0);
  // A real record, not just a 200 with an empty envelope.
  expect(typeof records[0].id).toBe('string');
  expect(typeof records[0].name).toBe('string');

  // Pinned to the row under test rather than to whatever the page happened to
  // hold: the local database keeps every account past runs created (this
  // account holds no delete grant), so an unfiltered page is not a place to
  // look for one record.
  const filtered = await api.get(
    `/api/v1/data/crm_account?filters=${encodeURIComponent(JSON.stringify([['id', '=', account.id]]))}`,
  );
  expect(filtered.ok(), `filtered list failed: ${filtered.status()}`).toBeTruthy();
  expect(recordsOf(await filtered.json()).map((r) => r.id)).toEqual([account.id]);
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
