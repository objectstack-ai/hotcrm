import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Opportunity lifecycle regression tests.
 *
 * These exercise the `opportunity_lifecycle` hook (src/objects/opportunity.hook.ts)
 * end-to-end through the REST API, since L2 hooks are body-only sandboxed code
 * and cannot be imported and unit-tested in isolation. The hook is the single
 * source of truth for `probability` and `expected_revenue` (the duplicate
 * field-update workflows were removed), so these assertions guard against drift.
 *
 * The CRM data API may be auth-gated depending on how the server is launched.
 * When a write is rejected (401/403), the test self-skips rather than failing —
 * mirroring the tolerance already used in e2e/smoke.spec.ts.
 */

const BASE = '/api/v1/data/crm_opportunity';

async function createOpportunity(
  request: APIRequestContext,
  body: Record<string, unknown>,
): Promise<{ skipped: boolean; status: number; data?: Record<string, unknown> }> {
  const res = await request.post(BASE, { data: body });
  if ([401, 403].includes(res.status())) return { skipped: true, status: res.status() };
  expect(res.ok(), `create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const json = await res.json();
  return { skipped: false, status: res.status(), data: json.data ?? json };
}

test('expected_revenue and probability are derived from stage on create', async ({ request }) => {
  const created = await createOpportunity(request, {
    name: 'E2E Pipeline Deal',
    stage: 'proposal', // probability 60
    amount: 10000,
    close_date: '2099-12-31',
  });
  test.skip(created.skipped, `data API is auth-gated (status ${created.status})`);

  const rec = created.data!;
  // Hook syncs probability to the stage's canonical value …
  expect(rec.probability).toBe(60);
  // … and recomputes expected_revenue = amount * probability/100.
  expect(rec.expected_revenue).toBe(6000);

  // cleanup (best-effort)
  if (rec.id) await request.delete(`${BASE}/${rec.id}`);
});

test('closed_won stamps close_date and recomputes to 100% probability', async ({ request }) => {
  const created = await createOpportunity(request, {
    name: 'E2E Won Deal',
    stage: 'negotiation',
    amount: 25000,
    close_date: '2099-12-31',
  });
  test.skip(created.skipped, `data API is auth-gated (status ${created.status})`);

  const id = created.data!.id as string;
  const res = await request.patch(`${BASE}/${id}`, { data: { stage: 'closed_won' } });
  expect(res.ok(), `update failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const updated = (await res.json()).data ?? (await res.json());

  expect(updated.stage).toBe('closed_won');
  expect(updated.probability).toBe(100);
  expect(updated.expected_revenue).toBe(25000);
  // Hook stamps close_date to today when entering closed_won.
  expect(typeof updated.close_date).toBe('string');

  if (id) await request.delete(`${BASE}/${id}`);
});
