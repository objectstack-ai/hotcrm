// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { test, expect, recordOf, seededAccountId } from './fixtures';
import type { APIRequestContext } from '@playwright/test';

/**
 * Opportunity lifecycle regression tests.
 *
 * These exercise `opportunity_lifecycle` (src/objects/opportunity.hook.ts) end
 * to end through the REST API. L2 hooks are body-only sandboxed code, so the
 * vitest suite can only call `handler(ctx)` with a hand-built ctx — this file is
 * what proves the hook is actually bound and firing inside the real kernel,
 * against the real driver, with the real closed-record freeze guard in play.
 *
 * The hook is the single source of truth for `probability`, `expected_revenue`
 * and `forecast_category` (the duplicate field-update workflows were removed),
 * so these assertions guard against drift.
 *
 * Every assertion is unconditional. The previous version self-skipped on
 * 401/403, read the record out of `json.data` when the API answers
 * `{ object, id, record }`, and omitted the REQUIRED `crm_account` — three
 * independent reasons it could never have gone green on real behaviour.
 */

const BASE = '/api/v1/data/crm_opportunity';

async function createOpportunity(
  api: APIRequestContext,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await api.post(BASE, { data: body });
  expect(res.ok(), `create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return recordOf(await res.json());
}

async function patchOpportunity(
  api: APIRequestContext,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await api.patch(`${BASE}/${id}`, { data: body });
  expect(res.ok(), `update failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return recordOf(await res.json());
}

test.describe('opportunity_lifecycle hook (through the real kernel)', () => {
  let accountId: string | undefined;
  const created: string[] = [];

  test.beforeEach(async ({ api }) => {
    accountId ??= await seededAccountId(api);
  });

  test.afterEach(async ({ api }) => {
    // Best-effort cleanup; a closed opportunity may refuse edits but deletes
    // are not blocked by the freeze guard.
    while (created.length) {
      const id = created.pop()!;
      await api.delete(`${BASE}/${id}`).catch(() => undefined);
    }
  });

  test('derives probability and expected_revenue from stage on create', async ({ api }) => {
    const rec = await createOpportunity(api, {
      name: 'E2E Pipeline Deal',
      stage: 'proposal', // canonical probability 60
      amount: 10_000,
      close_date: '2099-12-31',
      crm_account: accountId,
    });
    created.push(rec.id as string);

    // Hook syncs probability to the stage's canonical value …
    expect(rec.probability).toBe(60);
    // … recomputes expected_revenue = amount × probability/100 …
    expect(rec.expected_revenue).toBe(6_000);
    // … and stamps the matching forecast category.
    expect(rec.forecast_category).toBe('commit');
  });

  test('closed_won stamps close_date and recomputes to 100% probability', async ({ api }) => {
    const rec = await createOpportunity(api, {
      name: 'E2E Won Deal',
      stage: 'negotiation',
      amount: 25_000,
      close_date: '2099-12-31',
      crm_account: accountId,
    });
    const id = rec.id as string;
    created.push(id);

    const updated = await patchOpportunity(api, id, { stage: 'closed_won' });

    expect(updated.stage).toBe('closed_won');
    expect(updated.probability).toBe(100);
    expect(updated.expected_revenue).toBe(25_000);
    expect(updated.forecast_category).toBe('closed');
    // The hook stamps close_date to today on entering closed_won, so the far
    // future date supplied at create time must have been overwritten.
    expect(updated.close_date).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(updated.close_date).not.toBe('2099-12-31');
    // Advancing the stage resets the stagnation counter.
    expect(updated.days_in_stage).toBe(0);
  });

  test('closed_lost drops probability to 0 and omits the deal from forecast', async ({ api }) => {
    const rec = await createOpportunity(api, {
      name: 'E2E Lost Deal',
      stage: 'negotiation',
      amount: 40_000,
      close_date: '2099-12-31',
      crm_account: accountId,
    });
    const id = rec.id as string;
    created.push(id);

    const updated = await patchOpportunity(api, id, { stage: 'closed_lost' });

    expect(updated.stage).toBe('closed_lost');
    expect(updated.probability).toBe(0);
    expect(updated.expected_revenue).toBe(0);
    expect(updated.forecast_category).toBe('omitted');
  });

  test('changing amount re-derives expected_revenue at the current stage', async ({ api }) => {
    const rec = await createOpportunity(api, {
      name: 'E2E Amount Change',
      stage: 'proposal', // 60%
      amount: 10_000,
      close_date: '2099-12-31',
      crm_account: accountId,
    });
    const id = rec.id as string;
    created.push(id);
    expect(rec.expected_revenue).toBe(6_000);

    const updated = await patchOpportunity(api, id, { amount: 50_000 });
    expect(updated.amount).toBe(50_000);
    expect(updated.expected_revenue).toBe(30_000); // 50k × 60%
  });

  test('a closed opportunity rejects business-field edits but accepts narrative ones', async ({ api }) => {
    const rec = await createOpportunity(api, {
      name: 'E2E Frozen Deal',
      stage: 'negotiation',
      amount: 15_000,
      close_date: '2099-12-31',
      crm_account: accountId,
    });
    const id = rec.id as string;
    created.push(id);
    await patchOpportunity(api, id, { stage: 'closed_won' });

    // Business field — the freeze guard must reject it.
    const rejected = await api.patch(`${BASE}/${id}`, { data: { amount: 999 } });
    expect(
      rejected.ok(),
      'a closed opportunity accepted an amount edit — the freeze guard is not firing',
    ).toBeFalsy();

    // Narrative field — explicitly allowed while closed.
    const allowed = await patchOpportunity(api, id, { next_step: 'Kick off onboarding' });
    expect(allowed.next_step).toBe('Kick off onboarding');
    expect(allowed.amount).toBe(15_000); // untouched by the rejected write
  });
});
