// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { declaredRow, makeFlowHarness, type Rec } from './helpers/flow-harness';
import { ForecastSnapshotFlow } from '../src/sales/flows/forecast-snapshot.flow';
import forecastDerive from '../src/sales/objects/forecast.hook';

/**
 * `forecast_snapshot`'s four bucket accumulators are CEL value envelopes
 * (#1984), run here through the REAL `AutomationEngine`: each one is an
 * `assignment` inside a `loop` body inside the owner loop's `try_catch`, so
 * this is also the proof that a value envelope in that position is evaluated
 * at all rather than written into the variable verbatim.
 *
 * Two operand shapes the old `{… * 1}` template absorbed and CEL types
 * instead:
 *
 *  - a NULL amount. `double(null)` errors, so an unguarded accumulator would
 *    throw, the owner's `try_catch` would swallow the iteration, and the row
 *    would keep whatever it held before. That is why the row here starts with
 *    STALE amounts: a sweep that died on the null deal leaves them in place,
 *    one that summed it as 0 overwrites them. A freshly opened row could not
 *    tell the two apart — it is born with zeros either way.
 *  - a DECIMAL amount. The cents must survive the sum. 1,000.25 and 0.5 are
 *    exact in binary, so the expected totals carry no floating-point tail.
 *
 * (An ABSENT key — the sparse-driver shape — is not reachable here: the harness
 * materialises every declared column as `null`. The guard is `has()`-first,
 * which reads absent and null alike.)
 */

const pad = (n: number) => String(n).padStart(2, '0');
const isoUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const nowUtc = new Date();
const qStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), Math.floor(nowUtc.getUTCMonth() / 3) * 3, 1));
const qEnd = new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() + 3, 0));
const inPeriod = isoUtc(qStart);

const STALE = 9_999_999;

const opp = (id: string, over: Rec): Rec => ({
  id, owner_id: 'rep1', close_date: inPeriod, ...over,
});

const sweep = async (opps: Rec[]) => {
  const h = makeFlowHarness(
    { forecast_snapshot: ForecastSnapshotFlow },
    {
      sys_user: [{ id: 'rep1', name: 'Rep One' }],
      crm_opportunity: opps,
      crm_forecast: [declaredRow('crm_forecast', {
        id: 'f_rep1', owner_id: 'rep1', period: 'quarter',
        period_start: inPeriod, period_end: isoUtc(qEnd),
        snapshot_date: '2026-01-02', source: 'scheduled',
        pipeline_amount: STALE, best_case_amount: STALE,
        commit_amount: STALE, closed_amount: STALE,
      })],
    },
    { hooks: [forecastDerive] },
  );
  await h.run('forecast_snapshot', {}, { event: 'schedule' });
  expect(h.store.crm_forecast, 'the sweep opened a second row').toHaveLength(1);
  return h.store.crm_forecast[0];
};

describe('forecast_snapshot — CEL accumulators (#1984)', () => {
  it('sums a null amount as 0 instead of failing the owner\'s sweep', async () => {
    const row = await sweep([
      opp('o1', { stage: 'negotiation', forecast_category: 'commit', amount: null }),
      opp('o2', { stage: 'negotiation', forecast_category: 'commit', amount: 30_000 }),
      opp('o3', { stage: 'closed_won', forecast_category: 'closed', amount: null }),
    ]);

    // Every bucket was rewritten — including the two whose only or first deal
    // has no amount — and the snapshot was restamped, so the write ran.
    expect(row.pipeline_amount).toBe(30_000);
    expect(row.best_case_amount).toBe(30_000);
    expect(row.commit_amount).toBe(30_000);
    expect(row.closed_amount).toBe(0);
    expect(row.snapshot_date).toBe(isoUtc(nowUtc));
  });

  it('keeps the decimals of a non-integer amount', async () => {
    const row = await sweep([
      opp('o1', { stage: 'qualification', forecast_category: 'pipeline', amount: 1_000.25 }),
      opp('o2', { stage: 'negotiation', forecast_category: 'commit', amount: 0.5 }),
      opp('o3', { stage: 'closed_won', forecast_category: 'closed', amount: 70_000.75 }),
    ]);

    expect(row.pipeline_amount).toBe(1_000.75);
    expect(row.best_case_amount).toBe(0.5);
    expect(row.commit_amount).toBe(0.5);
    expect(row.closed_amount).toBe(70_000.75);
    expect(typeof row.pipeline_amount, 'the accumulator produced a non-number').toBe('number');
  });
});
