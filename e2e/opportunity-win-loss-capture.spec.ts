// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { test, expect, recordOf, recordsOf, seededAccountId } from './fixtures';
import type { APIRequestContext } from '@playwright/test';

/**
 * Win/loss reason capture, asserted on the REAL HTTP write path (#593).
 *
 * `test/win-loss-capture.test.ts` proves the same contract through ObjectQL on
 * two drivers. This file proves it one layer further out — through the REST
 * API, over the real kernel, against the real database the demo boots with —
 * because "the engine rejects it in a test harness" and "a client gets a 400"
 * are not the same claim, and this issue's acceptance criterion is the second
 * one.
 *
 * It exists as a STANDING assertion rather than as a side effect. When the rule
 * first landed, its only evidence on this path was three neighbouring lifecycle
 * fixtures blowing up because they closed deals without a reason — real
 * evidence, but the kind that disappears the moment someone fixes the
 * fixtures. A rule whose only proof is another test's collateral damage is a
 * rule that can be silently removed.
 */

const BASE = '/api/v1/data/crm_opportunity';

/** An open deal to close, and its id registered for cleanup. */
async function openDeal(
  api: APIRequestContext,
  name: string,
  accountId: string,
): Promise<Record<string, unknown>> {
  const res = await api.post(BASE, {
    data: {
      name,
      stage: 'negotiation',
      amount: 30_000,
      close_date: '2099-12-31',
      crm_account: accountId,
    },
  });
  expect(res.ok(), `create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return recordOf(await res.json());
}

test.describe('closing an opportunity requires a reason (real HTTP path)', () => {
  let accountId: string | undefined;
  const created: string[] = [];

  test.beforeEach(async ({ api }) => {
    accountId ??= await seededAccountId(api);
  });

  test.afterEach(async ({ api }) => {
    while (created.length) {
      const id = created.pop()!;
      await api.delete(`${BASE}/${id}`).catch(() => undefined);
    }
  });

  test('PATCH to closed_lost with no loss_reason is rejected, and the deal does not move', async ({
    api,
  }) => {
    const rec = await openDeal(api, 'E2E Lost Without Reason', accountId!);
    const id = rec.id as string;
    created.push(id);

    const res = await api.patch(`${BASE}/${id}`, { data: { stage: 'closed_lost' } });

    expect(res.ok(), 'the server accepted a close with no loss_reason').toBeFalsy();
    expect(res.status()).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('VALIDATION_FAILED');
    // Reported against the FIELD — that is why the rule is a `requiredWhen` and
    // not a record-level script validation: the form can mark the empty
    // picklist instead of showing a banner.
    expect(JSON.stringify(body.fields)).toContain('loss_reason');

    // The half that separates enforcement from a warning: the write did not
    // land. A rule that complains while the record moves anyway is the
    // flow-condition failure mode (#633), not enforcement.
    const after = recordOf(await (await api.get(`${BASE}/${id}`)).json());
    expect(after.stage).toBe('negotiation');
  });

  test('PATCH to closed_won with no win_reason is rejected, and the deal does not move', async ({
    api,
  }) => {
    const rec = await openDeal(api, 'E2E Won Without Reason', accountId!);
    const id = rec.id as string;
    created.push(id);

    const res = await api.patch(`${BASE}/${id}`, { data: { stage: 'closed_won' } });

    expect(res.ok(), 'the server accepted a close with no win_reason').toBeFalsy();
    expect(res.status()).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('win_reason');

    const after = recordOf(await (await api.get(`${BASE}/${id}`)).json());
    expect(after.stage).toBe('negotiation');
  });

  test('POST that lands directly in a closed stage is rejected too', async ({ api }) => {
    // The path an import or an API integration takes. Insert is a different
    // branch of the rule — the engine fills absent fields with null there
    // rather than leaving them out — so it is asserted separately.
    const res = await api.post(BASE, {
      data: {
        name: 'E2E Born Lost',
        stage: 'closed_lost',
        amount: 30_000,
        close_date: '2020-01-01',
        crm_account: accountId,
      },
    });
    expect(res.ok(), 'the server accepted an insert straight into closed_lost').toBeFalsy();
    expect(res.status()).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('loss_reason');
  });

  test('the same close SUCCEEDS once the reason is supplied', async ({ api }) => {
    // Without this, every assertion above would still pass if the API had
    // simply stopped accepting stage changes at all.
    const rec = await openDeal(api, 'E2E Lost With Reason', accountId!);
    const id = rec.id as string;
    created.push(id);

    const res = await api.patch(`${BASE}/${id}`, {
      data: { stage: 'closed_lost', loss_reason: 'competitor' },
    });
    expect(res.ok(), `close with a reason failed: ${res.status()} ${await res.text()}`).toBeTruthy();

    const updated = recordOf(await res.json());
    expect(updated.stage).toBe('closed_lost');
    expect(updated.loss_reason).toBe('competitor');
  });

  test('every seeded settled deal carries its reason — the demo boots with the rule on', async ({
    api,
  }) => {
    // The rule applies to seed writes too, so a settled seed with no reason
    // does not degrade the demo, it stops the boot. This reads the database the
    // server actually loaded rather than the seed source, which is the only
    // way to see the result of that boot.
    const res = await api.get(`${BASE}?limit=200`);
    expect(res.ok(), `could not list opportunities: ${res.status()}`).toBeTruthy();
    const rows = recordsOf(await res.json());

    const won = rows.filter((r) => r.stage === 'closed_won');
    const lost = rows.filter((r) => r.stage === 'closed_lost');
    // Guards the guard: an empty database would make the sweep below vacuous.
    expect(won.length, 'no closed_won opportunities loaded').toBeGreaterThan(0);
    expect(lost.length, 'no closed_lost opportunities loaded').toBeGreaterThan(0);

    const missing = [
      ...won.filter((r) => !r.win_reason).map((r) => `${r.name}: no win_reason`),
      ...lost.filter((r) => !r.loss_reason).map((r) => `${r.name}: no loss_reason`),
    ];
    expect(missing, `settled deals with no reason:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});
