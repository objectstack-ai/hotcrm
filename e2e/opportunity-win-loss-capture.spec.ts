// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { test, expect, recordOf, uniqueName } from './fixtures';
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
 *
 * ─── Where the "the demo boots with the rule on" case went (#669) ───────────
 *
 * This file used to end by listing 200 opportunities and sweeping the settled
 * ones for a missing reason. That case could only ever run while the SEEDED
 * deals were readable by this account, which is true only while nobody owns
 * them — the dependency #669 removes. It is not replaced by a weaker version of
 * itself; its claim is carried, in full, by two assertions that do not need a
 * particular owner:
 *
 *   - that every settled SEED supplies its reason is
 *     `test/win-loss-capture.test.ts` → "every settled seed carries its reason",
 *     which reads `objectstack.config`'s own seed buckets, so it sees every
 *     record rather than the first 200 rows some user can see;
 *   - that the seed's WRITE SHAPE — an insert landing directly in a settled
 *     stage — is subject to the rule at all is the pair of insert-path cases
 *     below: the rejection when the reason is absent, and (new here) the
 *     acceptance, with the reason stored, when it is supplied.
 *
 * What is genuinely no longer asserted anywhere on this path: that the rows the
 * seed loader actually WROTE match the seed source it read. That is a platform
 * property rather than a hotcrm rule, and it is not one this suite can state
 * without reading somebody else's records.
 */

const BASE = '/api/v1/data/crm_opportunity';

/** An open deal, ready to be closed. */
async function openDeal(
  api: APIRequestContext,
  name: string,
  accountId: unknown,
): Promise<Record<string, unknown>> {
  const res = await api.post(BASE, {
    data: {
      name: uniqueName(name),
      stage: 'negotiation',
      amount: 30_000,
      close_date: '2099-12-31',
      crm_account: accountId,
    },
  });
  expect(res.ok(), `create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return recordOf(await res.json());
}

// No cleanup hook: this account holds no delete grant (see `./fixtures.ts`), so
// the loop that used to sit here deleted nothing. Unique names carry reruns.
test.describe('closing an opportunity requires a reason (real HTTP path)', () => {
  test('PATCH to closed_lost with no loss_reason is rejected, and the deal does not move', async ({
    api,
    account,
  }) => {
    const rec = await openDeal(api, 'E2E Lost Without Reason', account.id);
    const id = rec.id as string;

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
    account,
  }) => {
    const rec = await openDeal(api, 'E2E Won Without Reason', account.id);
    const id = rec.id as string;

    const res = await api.patch(`${BASE}/${id}`, { data: { stage: 'closed_won' } });

    expect(res.ok(), 'the server accepted a close with no win_reason').toBeFalsy();
    expect(res.status()).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('win_reason');

    const after = recordOf(await (await api.get(`${BASE}/${id}`)).json());
    expect(after.stage).toBe('negotiation');
  });

  test('POST that lands directly in a closed stage is rejected too', async ({ api, account }) => {
    // The path an import, a seed file or an API integration takes. Insert is a
    // different branch of the rule — the engine fills absent fields with null
    // there rather than leaving them out — so it is asserted separately.
    const res = await api.post(BASE, {
      data: {
        name: uniqueName('E2E Born Lost'),
        stage: 'closed_lost',
        amount: 30_000,
        close_date: '2020-01-01',
        crm_account: account.id,
      },
    });
    expect(res.ok(), 'the server accepted an insert straight into closed_lost').toBeFalsy();
    expect(res.status()).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('loss_reason');
  });

  test('a deal born settled WITH its reason is accepted, and stores it', async ({ api, account }) => {
    // The other half of the insert branch, and the half the seeds themselves
    // take: `src/data/revenue.seed.ts` ships closed_won and closed_lost deals
    // that land settled at insert time and carry their reason. Without this the
    // case above would still pass if the API had simply stopped accepting
    // settled inserts altogether — a rule that rejects everything is not the
    // rule #593 asked for, and it would take the demo's whole win/loss
    // breakdown down with it.
    const name = uniqueName('E2E Born Won');
    const res = await api.post(BASE, {
      data: {
        name,
        stage: 'closed_won',
        win_reason: 'best_fit',
        amount: 30_000,
        close_date: '2020-01-01',
        crm_account: account.id,
      },
    });
    expect(res.ok(), `a settled insert WITH its reason was refused: ${res.status()} ${await res.text()}`).toBeTruthy();

    const rec = recordOf(await res.json());
    expect(rec.stage).toBe('closed_won');
    expect(rec.win_reason).toBe('best_fit');

    // Re-read: the reason has to be STORED, not merely echoed by the write.
    const reread = recordOf(await (await api.get(`${BASE}/${rec.id}`)).json());
    expect(reread.name).toBe(name);
    expect(reread.stage).toBe('closed_won');
    expect(reread.win_reason).toBe('best_fit');
    expect(reread.loss_reason ?? null).toBeNull();
  });

  test('the same close SUCCEEDS once the reason is supplied', async ({ api, account }) => {
    // Without this, every assertion above would still pass if the API had
    // simply stopped accepting stage changes at all.
    const rec = await openDeal(api, 'E2E Lost With Reason', account.id);
    const id = rec.id as string;

    const res = await api.patch(`${BASE}/${id}`, {
      data: { stage: 'closed_lost', loss_reason: 'competitor' },
    });
    expect(res.ok(), `close with a reason failed: ${res.status()} ${await res.text()}`).toBeTruthy();

    const updated = recordOf(await res.json());
    expect(updated.stage).toBe('closed_lost');
    expect(updated.loss_reason).toBe('competitor');
  });
});
