// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack } from './helpers/verify-stack';
import { ServiceDashboard } from '../src/service/dashboards/service.dashboard';

type Rec = Record<string, any>;

/**
 * The open-case table's SLA column agrees with the Open Cases Past SLA tile
 * (#2525).
 *
 * Before: `my_open_cases_by_priority` read `avg_sla_violated`, the stored
 * flag, which only the hourly `case_sla_monitor` sweep writes on an open case,
 * and the sweep ships off. On a hosted tenant the tile counted 23 open cases
 * past SLA while the table beside it read 0.0% for the medium and low queues.
 *
 * After: the table reads `past_sla_count` and `past_sla_rate`, a read-time
 * count of the tile's own selection (flagged, or not yet resolved and past
 * `sla_due_date`), plus a resolved case's flag. Measured through the booted
 * `analytics` service, the one the dataset query route calls, with no sweep
 * run: nothing below is flagged by anything but the close-time stamp.
 */

let verify: VerifyStack;
const ids: string[] = [];

const widget = (id: string): Rec => (ServiceDashboard.widgets as Rec[]).find((w) => w.id === id)!;
const query = async (measures: string[], filter: Rec, dimensions?: string[]): Promise<Rec[]> => {
  const dataset = verify.metadata.items<Rec>('dataset').find((d) => d.name === 'case_metrics')!;
  const analytics = verify.kernel.getService<Rec>('analytics');
  const res = await analytics.queryDataset(dataset, {
    ...(dimensions ? { dimensions } : {}), measures, runtimeFilter: { ...filter, id: { $in: ids } },
  }, { isSystem: true });
  return (res.rows ?? []) as Rec[];
};

beforeAll(async () => {
  verify = await hotcrmStack();
  const hour = 3_600_000;
  const past = new Date(Date.now() - 24 * hour).toISOString();
  const future = new Date(Date.now() + 24 * hour).toISOString();
  const base = { subject: 'SLA table', description: 'It broke.', origin: 'web' };
  const rows = await verify.seed('crm_case', [
    // Past due, open, never flagged: the hosted 0.0% rows.
    { ...base, priority: 'medium', status: 'new', sla_due_date: past },
    { ...base, priority: 'medium', status: 'waiting_customer', sla_due_date: past },
    { ...base, priority: 'medium', status: 'in_progress', sla_due_date: future },
    { ...base, priority: 'low', status: 'in_progress', sla_due_date: past },
    { ...base, priority: 'low', status: 'new', sla_due_date: future },
    // Resolved on time: in the table's base (not closed), never past SLA.
    { ...base, priority: 'low', status: 'resolved', sla_due_date: future },
  ]);
  ids.push(...rows.map((r) => String(r.id)));
  const stored = await verify.rows('crm_case', { id: { $in: ids } });
  expect(stored.filter((r) => r.is_sla_violated === true), 'fixture: no case is flagged').toEqual([]);
}, 180_000);

describe('My Open Cases by Priority counts past SLA as the tile does (#2525)', () => {
  it('shows the count beside the rate, not the stored flag', () => {
    expect(widget('my_open_cases_by_priority').values).toEqual(['case_count', 'past_sla_count', 'past_sla_rate']);
  });

  it('counts the open past-due cases the sweep never flagged, per priority', async () => {
    const table = widget('my_open_cases_by_priority');
    const rows = await query(table.values, { is_closed: false }, table.dimensions);
    const by = Object.fromEntries(rows.map((r) => [String(r.priority).toLowerCase(), r]));
    expect([by.medium?.case_count, by.medium?.past_sla_count, Number(by.medium?.past_sla_rate)]).toEqual([3, 2, 2 / 3]);
    expect([by.low?.case_count, by.low?.past_sla_count, Number(by.low?.past_sla_rate)]).toEqual([3, 1, 1 / 3]);
    // The flag alone, what the column read before: 0 on both.
    const flagged = await query(['avg_sla_violated'], { is_closed: false }, ['priority']);
    expect(flagged.map((r) => Number(r.avg_sla_violated))).toEqual([0, 0]);
  });

  it('agrees with the Open Cases Past SLA tile over the cases both count', async () => {
    const tile = widget('sla_violations');
    const [tileRow] = await query(tile.values, tile.filter);
    const [tableRow] = await query(['past_sla_count'], { is_closed: false, status: { $nin: ['resolved', 'closed'] } });
    expect(Number(tileRow?.case_count)).toBe(3);
    expect(Number(tableRow?.past_sla_count)).toBe(Number(tileRow?.case_count));
  });
});
