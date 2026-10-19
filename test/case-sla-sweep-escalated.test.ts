// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, signUpPerson, runScheduledFlow, notificationsTo, recordEngineWrites, type Person,
} from './helpers/verify-stack';

/**
 * The SLA sweep keeps the escalation a breached case already has (#2073 item 9).
 *
 * `case_sla_monitor` used to write one update on every breached case, and that
 * update carried `escalation_reason: 'Auto-escalated: SLA due date breached'`
 * and `escalated_date: now`. On a case an agent had already escalated, the
 * reason they typed on **Escalate Case** was replaced, and the Escalated Date
 * moved from the escalation to the sweep. `escalation_reason` has no history,
 * so the agent's words were gone. Measured here before the fix: a Medium case
 * escalated with "Customer CFO called: invoices blocked" and past due read
 * "Auto-escalated: SLA due date breached" after one sweep.
 *
 * Every case below is put in its state through the shipped doors: opened by
 * the agent (the `case_sla_defaults` hook stamps its clock from the matrix, and
 * `Date` alone is moved back so the clock has run out), escalated through the
 * `escalate_case` screen flow with a typed reason, put back to work by the
 * agent's own `PATCH`, and swept the way the schedule trigger starts the sweep.
 * The one exception is the seed-shaped case, written through the seed door
 * because the shipped seed was the only writer of that shape. It wrote it until
 * #2163, and a demo database seeded before then still holds it: the dataset is
 * insert-once (`mode: 'ignore'`), so no later boot adds the date.
 *
 * The sweep processes every breached case in the database, the boot's seed
 * backlog included, so every reading is taken by id.
 */

type Rec = Record<string, any>;

const HOUR = 3_600_000;
const AGENT_REASON = 'Customer CFO called: invoices blocked';
const WORKED_REASON = 'Tier 2 is on it; customer agreed to wait';
const SEEDED_REASON = 'Escalated to tier-2 engineering for SLA-risk review.';
const AUTO_REASON = 'Auto-escalated: SLA due date breached';

let verify: VerifyStack;
let agent: Person;
let accountId: string;
let k = 0;

/** Open a Medium case on the Enterprise account as the agent, `hoursAgo` hours ago (36 h window). */
const openAt = async (hoursAgo: number): Promise<string> => {
  vi.useFakeTimers({ toFake: ['Date'] });
  try {
    vi.setSystemTime(new Date(Date.now() - hoursAgo * HOUR));
    const kase = await verify.hooks.run('crm_case', 'insert', {
      subject: `Invoices blocked ${++k}`, description: 'The customer cannot send invoices.',
      crm_account: accountId, status: 'new', priority: 'medium',
    }, { as: agent.token });
    return String(kase.id);
  } finally {
    vi.useRealTimers();
  }
};

/** The shipped Escalate Case action: the agent starts the screen flow and submits a reason. */
const escalate = async (id: string, reason: string): Promise<void> => {
  const run = await verify.flows.run('escalate_case', { recordId: id }, { as: agent.token });
  await verify.flows.resume(run, { reason }, { as: agent.token });
};

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0]!;

const alertsAbout = async (id: string): Promise<Rec[]> =>
  (await notificationsTo(verify, agent.id, 'case_sla_breach')).filter((n) => n.payload?.actionUrl === `/crm_case/${id}`);

let ids: Record<'escalated' | 'worked' | 'seeded' | 'fresh', string>;
let before: Record<string, Rec>;
let after: Record<string, Rec>;
let sweepWrites: Record<string, Rec[]>;
let sweptFrom: number;
let sweptTo: number;

beforeAll(async () => {
  verify = await hotcrmStack();
  // Service grants, but NOT on the `service_agent` rota: a case the agent
  // opens stays the agent's (`case_auto_assign` round-robins the rota).
  agent = await signUpPerson(verify, 'agent@case-sla-sweep-escalated.test', {
    name: 'Escalating Agent', permissionSets: ['service_agent'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Escalated Sweep Co', tier: 'enterprise', owner_id: agent.id }]);
  accountId = String(account!.id);

  // Opened 40 h ago on a 36 h window, so each is 4 h past due. Escalating to
  // Critical keeps a deadline that has already passed (#2073 item 4), so the
  // escalated ones stay past due too.
  const escalated = await openAt(40);
  await escalate(escalated, AGENT_REASON);

  const worked = await openAt(40);
  await escalate(worked, WORKED_REASON);
  const res = await verify.apiAs(agent.token, 'PATCH', `/data/crm_case/${worked}`, { status: 'in_progress' });
  expect(res.status, `the agent could not put the case back to work: ${await res.clone().text()}`).toBe(200);

  // The shape `src/service/data/service.seed.ts` wrote for an escalated demo
  // case before #2163: the flag and a reason, and no Escalated Date.
  const [seeded] = await verify.seed('crm_case', [{
    subject: `Seeded escalation ${++k}`, description: 'A demo case.', crm_account: accountId,
    status: 'escalated', priority: 'high', is_escalated: true, escalation_reason: SEEDED_REASON,
    sla_due_date: new Date(Date.now() - 2 * HOUR).toISOString(), owner_id: agent.id,
  }]);

  const fresh = await openAt(40);

  ids = { escalated, worked, seeded: String(seeded!.id), fresh };
  before = {};
  for (const [key, id] of Object.entries(ids)) before[key] = await stored(id);

  const recorder = recordEngineWrites(verify);
  try {
    sweptFrom = Date.now();
    await runScheduledFlow(verify, 'case_sla_monitor');
    sweptTo = Date.now();
  } finally {
    recorder.restore();
  }
  sweepWrites = {};
  after = {};
  for (const [key, id] of Object.entries(ids)) {
    sweepWrites[key] = recorder.of('crm_case', 'update')
      .filter((w) => (w.args[2] as Rec | undefined)?.where?.id === id)
      .map((w) => w.args[1] as Rec);
    after[key] = await stored(id);
  }
}, 120_000);

describe('a breached case that is already escalated keeps its escalation', () => {
  it('fixture: each case went into the sweep breached, unflagged, and in the state its name says', () => {
    for (const [key, row] of Object.entries(before)) {
      expect(Date.parse(String(row.sla_due_date)), `${key} is not past due`).toBeLessThan(sweptFrom);
      expect(row.is_sla_violated, `${key} was flagged before the sweep`).toBe(false);
    }
    expect(before.escalated).toMatchObject({ status: 'escalated', is_escalated: true, escalation_reason: AGENT_REASON });
    expect(before.escalated!.escalated_date).toBeTruthy();
    expect(before.worked).toMatchObject({ status: 'in_progress', is_escalated: true, escalation_reason: WORKED_REASON });
    expect(before.seeded).toMatchObject({ status: 'escalated', is_escalated: true, escalation_reason: SEEDED_REASON });
    expect(before.seeded!.escalated_date ?? null).toBeNull();
    expect(before.fresh).toMatchObject({ status: 'new', is_escalated: false });
  });

  it('keeps the reason the agent typed and the original Escalated Date', () => {
    expect(after.escalated!.escalation_reason).toBe(AGENT_REASON);
    expect(after.escalated!.escalated_date, 'the sweep moved the Escalated Date').toBe(before.escalated!.escalated_date);
  });

  it('records the breach on it, and alerts its owner once, as before', async () => {
    expect(after.escalated).toMatchObject({ is_sla_violated: true, is_escalated: true, status: 'escalated' });
    expect(await alertsAbout(ids.escalated)).toHaveLength(1);
  });

  it('a case escalated once and then put back to work keeps its reason and date, and is escalated again', async () => {
    expect(after.worked!.escalation_reason).toBe(WORKED_REASON);
    expect(after.worked!.escalated_date).toBe(before.worked!.escalated_date);
    expect(after.worked).toMatchObject({ is_sla_violated: true, is_escalated: true, status: 'escalated' });
    expect(await alertsAbout(ids.worked)).toHaveLength(1);
  });

  it('an escalated case with no Escalated Date (the seed’s shape) keeps its reason, and no date is invented', async () => {
    expect(after.seeded!.escalation_reason).toBe(SEEDED_REASON);
    expect(after.seeded!.escalated_date ?? null).toBeNull();
    expect(after.seeded).toMatchObject({ is_sla_violated: true, status: 'escalated' });
    expect(await alertsAbout(ids.seeded)).toHaveLength(1);
  });

  it('the breach write names no escalation field: it leaves them out rather than writing the stored values back', () => {
    for (const key of ['escalated', 'worked', 'seeded'] as const) {
      const [write, ...more] = sweepWrites[key]!;
      expect(write, `${key}: the sweep wrote nothing`).toBeDefined();
      expect(more, `${key}: expected one write`).toHaveLength(0);
      expect(Object.keys(write!).sort(), `${key}: the breach write carried other keys`).toEqual(['is_sla_violated', 'status']);
    }
  });
});

describe('a breached case never escalated is escalated as before', () => {
  it('gets the auto reason and the sweep’s date, the flag and the status, and its owner is alerted once', async () => {
    expect(after.fresh).toMatchObject({
      is_sla_violated: true, is_escalated: true, status: 'escalated', escalation_reason: AUTO_REASON,
    });
    const date = Date.parse(String(after.fresh!.escalated_date));
    expect(date).toBeGreaterThanOrEqual(sweptFrom);
    expect(date).toBeLessThanOrEqual(sweptTo);
    expect(await alertsAbout(ids.fresh)).toHaveLength(1);
  });
});
