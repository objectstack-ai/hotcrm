// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * `forecast_snapshot`'s four bucket accumulators are CEL value envelopes
 * (#1984), run here on the shipped app booted by `@objectstack/verify` (the
 * sweep started through the trigger door as the admin): each one is an
 * `assignment` inside a `loop` body inside the owner loop's `try_catch`, so
 * this is also the proof that a value envelope in that position is evaluated
 * at all rather than written into the variable verbatim.
 *
 * Two operand shapes the old `{… * 1}` template absorbed and CEL types
 * instead:
 *
 *  - a NULL amount. `double(null)` errors, so an unguarded accumulator would
 *    throw, the owner's `try_catch` would swallow the iteration, and the row
 *    would keep whatever it held before. On the real engine no deal can carry
 *    one: `crm_opportunity.amount` is `required` with a NOT NULL column, and
 *    the write is refused — pinned below as the reason. The guard stays
 *    `has()`-first, which reads absent and null alike.
 *  - a DECIMAL amount. The cents must survive the sum. 1,000.25 and 0.5 are
 *    exact in binary, so the expected totals carry no floating-point tail.
 *
 * The row starts with STALE amounts: a sweep that died on a deal leaves them
 * in place, one that summed it overwrites them. A freshly opened row could not
 * tell the two apart — it is born with zeros either way.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const isoUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const nowUtc = new Date();
const qStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), Math.floor(nowUtc.getUTCMonth() / 3) * 3, 1));
const qEnd = new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() + 3, 0));
const inPeriod = isoUtc(qStart);

const STALE = 9_999_999;

let verify: VerifyStack;
let admin: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
}, 120_000);

/** A fresh owner with a stale current-quarter snapshot row, and their account. */
const owner = async (): Promise<{ who: Person; accountId: string }> => {
  const who = await signUpPerson(verify, `rep${++k}@forecast-snapshot-amounts.test`, { name: `Rep ${k}` });
  const [acct] = await verify.seed('crm_account', [{ name: `Amounts Co ${k}`, owner_id: who.id }]);
  await verify.seed('crm_forecast', [{
    owner_id: who.id, period: 'quarter',
    period_start: inPeriod, period_end: isoUtc(qEnd),
    snapshot_date: '2026-01-02', source: 'scheduled',
    pipeline_amount: STALE, best_case_amount: STALE,
    commit_amount: STALE, closed_amount: STALE,
  }]);
  return { who, accountId: String(acct!.id) };
};

const opp = (who: Person, accountId: string, over: Rec): Rec => ({
  name: `Amounts ${String(over.stage)} ${++k}`, owner_id: who.id, close_date: inPeriod, crm_account: accountId, ...over,
});

const sweep = async (who: Person) => {
  await verify.flows.run('forecast_snapshot', {}, { as: admin });
  const rows = await verify.rows('crm_forecast', { owner_id: who.id });
  expect(rows, 'the sweep opened a second row').toHaveLength(1);
  return rows[0]!;
};

describe('forecast_snapshot — CEL accumulators (#1984)', () => {
  it('sums a null amount as 0 instead of failing the owner\'s sweep', async () => {
    const { who, accountId } = await owner();
    // No deal carries a null amount: the engine refuses the write.
    for (const over of [
      { stage: 'negotiation', amount: null },
      { stage: 'closed_won', win_reason: 'better_price', amount: null },
    ]) {
      await expect(verify.seed('crm_opportunity', [opp(who, accountId, over)]), 'a null amount was stored')
        .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    }
    await verify.seed('crm_opportunity', [opp(who, accountId, { stage: 'negotiation', amount: 30_000 })]);
    const row = await sweep(who);

    // Every bucket was rewritten — including the one no deal falls in — and
    // the snapshot was restamped, so the write ran.
    expect(row.pipeline_amount).toBe(30_000);
    expect(row.best_case_amount).toBe(30_000);
    expect(row.commit_amount).toBe(30_000);
    expect(row.closed_amount).toBe(0);
    expect(row.snapshot_date).toBe(isoUtc(nowUtc));
  });

  it('keeps the decimals of a non-integer amount', async () => {
    const { who, accountId } = await owner();
    await verify.seed('crm_opportunity', [
      opp(who, accountId, { stage: 'qualification', amount: 1_000.25 }),
      opp(who, accountId, { stage: 'negotiation', amount: 0.5 }),
      opp(who, accountId, { stage: 'closed_won', win_reason: 'better_price', amount: 70_000.75 }),
    ]);
    const row = await sweep(who);

    expect(row.pipeline_amount).toBe(1_000.75);
    expect(row.best_case_amount).toBe(0.5);
    expect(row.commit_amount).toBe(0.5);
    expect(row.closed_amount).toBe(70_000.75);
    expect(typeof row.pipeline_amount, 'the accumulator produced a non-number').toBe('number');
  });
});
