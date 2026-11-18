// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, runScheduledFlow } from './helpers/verify-stack';

/**
 * A fresh demo seed shows a support desk that keeps most of its SLAs (#2288).
 *
 * The generated cases used to be created whole days ago while their due dates
 * are the matrix cell in HOURS, so every open one was past due on arrival.
 * Measured on a fresh boot before the fix: 13 of 38 cases arrived flagged
 * (9 of them settled, by their own late dates), the first `case_sla_monitor`
 * sweep flagged 16 more and escalated them, and the Cases list showed 29 of 38
 * rows tinted red (`rowColor` on `is_sla_violated`, #2107). Each escalation
 * opened its own urgent "Escalated: …" task due tomorrow for the account owner
 * — eleven near-identical rows in the dev admin's task list.
 *
 * Read on the booted app, which replays the shipped seed, then runs the sweep
 * once — what a fresh demo database shows after its first hour.
 */

type Rec = Record<string, any>;

const SETTLED = new Set(['resolved', 'closed']);
const instant = (v: unknown): number => (typeof v === 'number' ? v : Date.parse(String(v)));
const flagged = (c: Rec): boolean => c.is_sla_violated === true || c.is_sla_violated === 1;
const escalationTasks = (tasks: Rec[]): Rec[] => tasks.filter((t) => String(t.subject).startsWith('Escalated'));

/**
 * The service dashboard's `sla_violations` tile, applied to stored rows: a case
 * already flagged, or a live case whose due date has passed.
 */
const tileCounts = (c: Rec, now: number): boolean =>
  flagged(c) || (!SETTLED.has(String(c.status)) && c.sla_due_date != null && instant(c.sla_due_date) < now);

/**
 * The demo's deliberate breaches, sorted: open cases that arrive past their
 * matrix window and keep it. Three are hand-written — two arrive flagged, and
 * `Login issues after platform upgrade` is the one the first sweep flags and
 * escalates, so the escalation task shows — and four are the generated open
 * High/Critical rows on every third index. Every other open case takes the
 * seed's loosened target, its window plus two weeks (#2452), so this list is
 * the whole breached set from the seed to fourteen days after it.
 */
const DELIBERATE_BREACHES = [
  'Data export timing out for large datasets',
  'Demo case 10 — critical bug',
  'Demo case 13 — critical problem',
  'Demo case 19 — high problem',
  'Demo case 22 — high feature_request',
  'Login issues after platform upgrade',
  'Mobile app crashes on iOS 17',
];

let verify: VerifyStack;
let tileBefore: number;
let tasksBefore: Rec[];
let cases: Rec[];
let tasks: Rec[];

/** An instant no later than the seed's `now()`: read before the boot that seeds. */
let seededNoEarlierThan: number;

beforeAll(async () => {
  seededNoEarlierThan = Date.now();
  verify = await hotcrmStack();
  const seeded = (await verify.rows('crm_case', {})) as Rec[];
  tileBefore = seeded.filter((c) => tileCounts(c, Date.now())).length;
  tasksBefore = escalationTasks((await verify.rows('crm_task', {})) as Rec[]);
  await runScheduledFlow(verify, 'case_sla_monitor');
  cases = (await verify.rows('crm_case', {})) as Rec[];
  tasks = escalationTasks((await verify.rows('crm_task', {})) as Rec[]);
}, 120_000);

describe('a fresh demo seed after its first SLA sweep (#2288)', () => {
  it('shows 7 of 38 cases breached — between 10% and 20%', () => {
    const breached = cases.filter(flagged);
    expect(cases.length, 'fixture: the seed holds 38 cases').toBe(38);
    expect(
      breached.map((c) => String(c.subject)).sort(),
      'the deliberate breaches: three hand-written cases and the four generated open High/Critical ones',
    ).toEqual(DELIBERATE_BREACHES);
    const share = breached.length / cases.length;
    expect(share).toBeGreaterThanOrEqual(0.1);
    expect(share).toBeLessThan(0.2);
  });

  it('tints no settled case', () => {
    const settledBreaches = cases.filter((c) => SETTLED.has(String(c.status)) && flagged(c)).map((c) => String(c.subject));
    expect(settledBreaches).toEqual([]);
  });

  it('reads the same count on the SLA Violations tile before and after the sweep', () => {
    expect(tileBefore).toBe(cases.filter((c) => tileCounts(c, Date.now())).length);
    expect(tileBefore).toBe(cases.filter(flagged).length);
  });

  /**
   * Open work is young, so the timing puts the generated inflow closer to
   * today than one case per day. The daily volume chart and the Cases Opened
   * by Day matrix bucket `created_at` by day. Whatever hour of the
   * UTC day the seed loads, no day holds more than 5 of the 30 generated
   * cases. The first cut of this change put up to 12 on one day.
   */
  it('puts no more than 5 of the generated cases on any one day', () => {
    const perDay = new Map<string, number>();
    for (const c of cases.filter((r) => String(r.subject).startsWith('Demo case '))) {
      const day = new Date(instant(c.created_at)).toISOString().slice(0, 10);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const piled = [...perDay].filter(([, n]) => n > 5).map(([d, n]) => `${d}: ${n}`);
    expect(piled, piled.join('\n')).toEqual([]);
    expect([...perDay.values()].reduce((a, b) => a + b, 0), 'fixture: 30 generated cases').toBe(30);
  });

  /**
   * #2452: a fresh demo stays presentable for two weeks. #2431 measured 23 of
   * 23 open cases past SLA at +72 h. Read on the booted rows: at +72 h and at
   * +14 days the SLA Violations tile counts the deliberate breaches and
   * nothing else.
   */
  it.each([
    ['72 hours', 72],
    ['14 days', 14 * 24],
  ])('counts only the deliberate breaches on the SLA Violations tile %s after the seed (#2452)', (_label, hours) => {
    const at = seededNoEarlierThan + hours * 3_600_000;
    const counted = cases.filter((c) => tileCounts(c, at)).map((c) => String(c.subject)).sort();
    expect(counted).toEqual(DELIBERATE_BREACHES);
  });

  it('opens one escalation task, for the one case the sweep escalates', () => {
    expect(tasksBefore, 'fixture: the seed itself carries no escalation task').toEqual([]);
    expect(tasks.map((t) => String(t.subject))).toEqual([
      expect.stringMatching(/^Escalated: CASE-\d+ · Login issues after platform upgrade$/),
    ]);
  });
});
