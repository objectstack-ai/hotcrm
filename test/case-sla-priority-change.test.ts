// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import caseHooks from '../src/service/objects/case.hook';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, signUpPerson, runShippedHook, runScheduledFlow, type Person,
} from './helpers/verify-stack';

/**
 * A priority change re-derives `sla_due_date` when it tightens the window
 * (#2073 item 4).
 *
 * `case_sla_defaults` used to stamp the deadline once: a case that already had
 * one kept it, whatever happened to its priority. Measured on the hosted shape
 * and again here before the fix: a Medium case on an Enterprise account
 * escalated through **Escalate Case** stayed on its 36-hour clock, and a Low
 * case raised to High inline kept its 7-day one.
 *
 * The rule pinned below, on the shipped app booted by `@objectstack/verify`
 * (and, at the end, on the lowered body `objectstack build` ships):
 *
 *   - a change that TIGHTENS the window re-derives the deadline as now + the
 *     new priority's cell, on the case's own tier — the same clock the first
 *     stamp uses, so a case escalated late is not born breached;
 *   - the re-derived date only ever moves the deadline earlier, so a raise near
 *     the end of the old window, or on a case already past due, keeps the
 *     stored date (and the breach it carries);
 *   - a change that LOOSENS the window, an edit that does not change the
 *     priority, and a write that carries its own `sla_due_date` all leave the
 *     deadline as it stands.
 *
 * Every expected number is written out from the matrix (`_case-sla.ts`), not
 * recomputed from it.
 */

type Rec = Record<string, any>;

const HOUR = 3_600_000;
const hook = (caseHooks as Rec[]).find((h) => h.name === 'case_sla_defaults') as Rec;

let verify: VerifyStack;
let agent: Person;
const accountByTier: Record<string, string> = {};
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  agent = await signUpPerson(verify, 'agent@case-sla-priority-change.test', {
    name: 'Priority Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  for (const tier of ['strategic', 'enterprise', 'mid_market', 'smb']) {
    const [account] = await verify.seed('crm_account', [{ name: `Priority ${tier} Co`, tier, owner_id: agent.id }]);
    accountByTier[tier] = String(account!.id);
  }
  // The boot replays the demo cases, and many of them are open and past due.
  // One sweep here takes that backlog, so a sweep inside a test below handles
  // only the cases that test wrote.
  await runScheduledFlow(verify, 'case_sla_monitor');
}, 120_000);

afterEach(() => {
  vi.useRealTimers();
});

/** A case the agent opens on an account of `tier`, `hoursAgo` hours ago (`Date` only is faked). */
const openCase = async (priority: string, tier: string, hoursAgo = 0): Promise<Rec> => {
  if (hoursAgo) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.now() - hoursAgo * HOUR));
  }
  try {
    return await verify.hooks.run('crm_case', 'insert', {
      subject: `Priority change ${++k}`, description: 'It stopped working.',
      crm_account: accountByTier[tier], status: 'new', priority,
    }, { as: agent.token });
  } finally {
    vi.useRealTimers();
  }
};

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0]!;
const dueMs = (row: Rec): number => Date.parse(String(row.sla_due_date));

/** The first stamp: `hours` after the case was created (the hook reads its clock a beat after the audit stamp). */
const expectWindow = (row: Rec, hours: number): void => {
  const offset = dueMs(row) - Date.parse(String(row.created_at)) - hours * HOUR;
  expect(Math.abs(offset), `expected created_at + ${hours}h, got ${String(row.sla_due_date)}`).toBeLessThan(60_000);
};

/** The shipped Escalate Case action: the agent starts the screen flow on the case and submits a reason. */
const escalate = async (id: string): Promise<void> => {
  const run = await verify.flows.run('escalate_case', { recordId: id }, { as: agent.token });
  await verify.flows.resume(run, { reason: 'Customer is blocked in production' }, { as: agent.token });
};

/** The console's inline edit: `PATCH /data/crm_case/:id` as the agent. */
const patch = async (id: string, body: Rec): Promise<void> => {
  const res = await verify.apiAs(agent.token, 'PATCH', `/data/crm_case/${id}`, body);
  expect(res.status, `PATCH ${JSON.stringify(body)} refused: ${await res.clone().text()}`).toBe(200);
};

/** Run `write`, and assert the stored deadline is `hours` after the instant it ran. */
const expectRederived = async (id: string, hours: number, write: () => Promise<void>): Promise<Rec> => {
  const from = Date.now();
  await write();
  const to = Date.now();
  const row = await stored(id);
  expect(dueMs(row), `expected now + ${hours}h, got ${String(row.sla_due_date)}`).toBeGreaterThanOrEqual(from + hours * HOUR);
  expect(dueMs(row), `expected now + ${hours}h, got ${String(row.sla_due_date)}`).toBeLessThanOrEqual(to + hours * HOUR);
  return row;
};

describe('a priority raise puts the case on the new window (the card’s two cases)', () => {
  it('Escalate Case on a Medium case of an Enterprise account: 36 h → 4 h', async () => {
    const kase = await openCase('medium', 'enterprise');
    const before = await stored(kase.id);
    expectWindow(before, 36);
    const after = await expectRederived(kase.id, 4, () => escalate(kase.id));
    expect(after.priority).toBe('critical');
    expect(after.status).toBe('escalated');
  });

  it('an inline Low → High on a Mid-Market account: 168 h → 8 h', async () => {
    const kase = await openCase('low', 'mid_market');
    const before = await stored(kase.id);
    expectWindow(before, 168);
    await expectRederived(kase.id, 8, () => patch(kase.id, { priority: 'high' }));
  });

  it('reads the new cell on the case’s own tier: Low → Medium on a Strategic account is 24 h, not 48', async () => {
    const kase = await openCase('low', 'strategic');
    await expectRederived(kase.id, 24, () => patch(kase.id, { priority: 'medium' }));
  });
});

describe('the new window runs from the change, and only ever pulls the deadline in', () => {
  it('a case escalated 30 h into a 36 h window gets 4 h from the escalation — not a deadline 26 h in the past', async () => {
    const kase = await openCase('medium', 'enterprise', 30);
    const createdAt = Date.parse(String((await stored(kase.id)).created_at));
    const after = await expectRederived(kase.id, 4, () => escalate(kase.id));
    expect(dueMs(after), 'counted from creation, the deadline would already have passed').toBeGreaterThan(createdAt + 4 * HOUR);

    // Not born breached: the sweep passes it over, and closing it inside the
    // new window records no breach.
    await runScheduledFlow(verify, 'case_sla_monitor');
    const swept = await stored(kase.id);
    expect(swept.is_sla_violated).toBe(false);
    expect(swept.escalation_reason, 'the sweep’s breach write would have replaced the agent’s reason').toBe('Customer is blocked in production');
    await verify.hooks.run('crm_case', 'update', { id: kase.id, status: 'closed', resolution: 'Patched' }, { as: agent.token });
    expect((await stored(kase.id)).is_sla_violated).toBe(false);
  });

  it('a case escalated 34 h into a 36 h window keeps the sooner deadline', async () => {
    const kase = await openCase('medium', 'enterprise', 34);
    const before = await stored(kase.id);
    await escalate(kase.id);
    expect((await stored(kase.id)).sla_due_date).toBe(before.sla_due_date);
  });

  it('a case already past due stays past due when it is escalated, and its breach is still recorded', async () => {
    const kase = await openCase('medium', 'enterprise', 40);
    const before = await stored(kase.id);
    expect(dueMs(before)).toBeLessThan(Date.now());
    await escalate(kase.id);
    expect((await stored(kase.id)).sla_due_date, 'a raise must not erase a breach').toBe(before.sla_due_date);
    await runScheduledFlow(verify, 'case_sla_monitor');
    expect((await stored(kase.id)).is_sla_violated).toBe(true);
  });
});

describe('what leaves the deadline alone', () => {
  it('a change that loosens the window: Critical → Low, and High → Low', async () => {
    for (const [from, tier] of [['critical', 'smb'], ['high', 'enterprise']] as const) {
      const kase = await openCase(from, tier);
      const before = await stored(kase.id);
      await patch(kase.id, { priority: 'low' });
      const after = await stored(kase.id);
      expect(after.priority).toBe('low');
      expect(after.sla_due_date, `${from} → low moved the deadline`).toBe(before.sla_due_date);
    }
  });

  it('an edit that does not change the priority — without it, or carrying the stored value', async () => {
    const kase = await openCase('medium', 'enterprise');
    const before = await stored(kase.id);
    await patch(kase.id, { subject: `Renamed ${++k}` });
    // A whole-form save sends the priority the case already has.
    await patch(kase.id, { priority: 'medium', description: 'Still broken.' });
    expect((await stored(kase.id)).sla_due_date).toBe(before.sla_due_date);
  });

  it('a date set by hand survives an unrelated edit; a raise pulls it in only when the new window is sooner', async () => {
    const later = new Date(Date.now() + 10 * 24 * HOUR).toISOString();
    const agreed = await openCase('medium', 'enterprise');
    await patch(agreed.id, { sla_due_date: later });
    await patch(agreed.id, { subject: `Agreed date ${++k}` });
    expect((await stored(agreed.id)).sla_due_date).toBe(later);
    await expectRederived(agreed.id, 8, () => patch(agreed.id, { priority: 'high' }));

    const sooner = new Date(Date.now() + HOUR).toISOString();
    const pinned = await openCase('medium', 'enterprise');
    await patch(pinned.id, { sla_due_date: sooner });
    await patch(pinned.id, { priority: 'critical' });
    expect((await stored(pinned.id)).sla_due_date, 'a raise moved a deadline later').toBe(sooner);
  });

  it('a write that carries its own sla_due_date beside the priority keeps the writer’s date', async () => {
    const own = new Date(Date.now() + 2 * HOUR).toISOString();
    const kase = await openCase('low', 'smb');
    await patch(kase.id, { priority: 'critical', sla_due_date: own });
    expect((await stored(kase.id)).sla_due_date).toBe(own);
  });
});

describe('the lowered body — what `objectstack build` ships — applies the same rule', () => {
  const previous = (over: Rec): Rec => ({
    id: 'case-under-test', status: 'in_progress', crm_account: accountByTier.enterprise, ...over,
  });

  it('re-derives on a tightening change, earlier only', async () => {
    const from = Date.now();
    const raised = await runShippedHook(verify, hook, {
      event: 'beforeUpdate', input: { priority: 'critical' }, as: agent.token,
      previous: previous({ priority: 'medium', sla_due_date: new Date(from + 30 * HOUR).toISOString() }),
    });
    expect(Date.parse(String(raised.sla_due_date))).toBeGreaterThanOrEqual(from + 4 * HOUR);
    expect(Date.parse(String(raised.sla_due_date))).toBeLessThanOrEqual(Date.now() + 4 * HOUR);

    const late = await runShippedHook(verify, hook, {
      event: 'beforeUpdate', input: { priority: 'critical' }, as: agent.token,
      previous: previous({ priority: 'medium', sla_due_date: new Date(from + HOUR).toISOString() }),
    });
    expect('sla_due_date' in late, 'a raise moved a deadline later').toBe(false);
  });

  it('leaves a loosening change and an unchanged priority alone', async () => {
    const due = new Date(Date.now() + 2 * HOUR).toISOString();
    for (const input of [{ priority: 'low' }, { priority: 'critical', subject: 'Renamed' }]) {
      const out = await runShippedHook(verify, hook, {
        event: 'beforeUpdate', input, as: agent.token, previous: previous({ priority: 'critical', sla_due_date: due }),
      });
      expect('sla_due_date' in out, `${JSON.stringify(input)} touched the deadline`).toBe(false);
    }
  });
});
