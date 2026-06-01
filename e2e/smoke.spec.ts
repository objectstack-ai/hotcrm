import { test, expect } from '@playwright/test';

test('health endpoint reports ok', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.status).toBe('ok');
  expect(body.data.version).toBe('1.0.0');
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

test('REST API exposes hotcrm objects', async ({ request }) => {
  const res = await request.get('/api/v1/data/crm_account?limit=1');
  // 200 (seeded/public) or 401/403 (auth-gated) — both prove the route is mounted.
  expect([200, 401, 403]).toContain(res.status());
});
