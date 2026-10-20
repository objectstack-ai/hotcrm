// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { cases } from '../src/service/data/service.seed';
import { hotcrmStack, flowRuns } from './helpers/verify-stack';

/**
 * Every seeded escalated case carries the Escalated Date its escalation would
 * have stamped (#2163).
 *
 * The seed used to write its escalated cases with the flag and a reason and no
 * `escalated_date`. `case_escalation` reads a missing date as "never
 * escalated" (its start condition, and the note beside it on why it cannot
 * read the boolean), so the one such case it can reach, Critical and not in
 * Escalated, was escalated a second time by the next edit anyone made to it:
 * "Mobile app crashes on iOS 17" (CASE-00007). Measured here before the fix:
 * an admin `PATCH` of its description answered 200, and the case then read
 * "Auto-escalated: critical priority", a new Escalated Date, and `escalated`.
 *
 * Read on the booted app, which replays the shipped seed, so every check is of
 * what the seed loader stored, and every edit goes through the REST door.
 */

type Rec = Record<string, any>;

const CASE_00007 = 'Mobile app crashes on iOS 17';

/** The seed's escalated cases, by subject, read off the dataset itself. */
const SEEDED_ESCALATED = (cases.records as readonly Rec[])
  .filter((r) => r.is_escalated === true)
  .map((r) => String(r.subject));

/** A stored datetime as epoch milliseconds. */
const instant = (v: unknown): number => (typeof v === 'number' ? v : Date.parse(String(v)));

let verify: VerifyStack;
let admin: string;
const stored: Record<string, Rec> = {};

const read = async (subject: string): Promise<Rec> => {
  const [row] = await verify.rows('crm_case', { subject });
  expect(row, `fixture: the seed holds the case '${subject}'`).toBeDefined();
  return row!;
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  for (const subject of SEEDED_ESCALATED) stored[subject] = await read(subject);
}, 120_000);

describe('every seeded escalated case carries its Escalated Date (#2163)', () => {
  it('fixture: the seed escalates both hand-written cases and some generated ones', () => {
    expect(SEEDED_ESCALATED).toContain(CASE_00007);
    expect(SEEDED_ESCALATED).toContain('Data export timing out for large datasets');
    expect(SEEDED_ESCALATED.filter((s) => s.startsWith('Demo case ')).length).toBeGreaterThan(0);
    for (const [subject, row] of Object.entries(stored)) {
      expect(Boolean(row.is_escalated), `${subject} is not stored escalated`).toBe(true);
      expect(row.escalation_reason, `${subject} has no reason`).toBeTruthy();
    }
  });

  it('stores an Escalated Date after the case was created and no later than now', () => {
    const now = Date.now();
    const problems: string[] = [];
    for (const [subject, row] of Object.entries(stored)) {
      if (row.escalated_date == null) {
        problems.push(`${subject}: no Escalated Date`);
        continue;
      }
      const escalated = instant(row.escalated_date);
      if (!(escalated > instant(row.created_at))) problems.push(`${subject}: escalated ${String(row.escalated_date)}, not after its creation ${String(row.created_at)}`);
      if (!(escalated <= now)) problems.push(`${subject}: escalated ${String(row.escalated_date)}, after now`);
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

describe('an admin edit of a seeded escalated case keeps its escalation (#2163)', () => {
  it('CASE-00007 keeps its reason, its date and its status, and case_escalation does not run', async () => {
    const before = stored[CASE_00007]!;
    expect(before, 'fixture: the case went in worked, not in Escalated').toMatchObject({
      priority: 'critical', status: 'in_progress', escalation_reason: 'Affects 30% of mobile users',
    });
    const res = await verify.apiAs(admin, 'PATCH', `/data/crm_case/${before.id}`, {
      description: 'App crashes on launch for users running iOS 17.2+; reproduced on 17.3 too.',
    });
    expect(res.status, `the admin's edit was refused: ${await res.clone().text()}`).toBe(200);
    const after = await read(CASE_00007);
    expect(after.escalation_reason).toBe('Affects 30% of mobile users');
    expect(after.escalated_date).toBe(before.escalated_date);
    expect(after.status).toBe('in_progress');
    expect(await flowRuns(verify, 'case_escalation', String(before.id)), 'case_escalation escalated it again').toHaveLength(0);
  });

  it('every other seeded escalated case keeps its reason, its date and its status', async () => {
    const problems: string[] = [];
    for (const subject of SEEDED_ESCALATED.filter((s) => s !== CASE_00007)) {
      const before = stored[subject]!;
      const res = await verify.apiAs(admin, 'PATCH', `/data/crm_case/${before.id}`, { description: `${String(before.description)} (Edited.)` });
      if (res.status !== 200) {
        problems.push(`${subject}: the edit answered ${res.status}: ${await res.text()}`);
        continue;
      }
      const after = await read(subject);
      for (const field of ['escalation_reason', 'escalated_date', 'status'] as const) {
        if (after[field] !== before[field]) problems.push(`${subject}: ${field} ${String(before[field])} became ${String(after[field])}`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
