// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { SeedLoaderService } from '@objectstack/runtime';
import { claimSeedOwnership } from '@objectstack/plugin-security';
import { SeedLoaderRequestSchema } from '@objectstack/spec/data';
import { CrmSeedData } from '../objectstack.composition';
import artifact from '../objectstack.config';
import { CrmFlows as allFlows } from './helpers/src-roster';
import { regionsOf } from './helpers/flow-regions';
import {
  hotcrmStack, bootOptions, signUpPerson, systemUpdate, notificationsTo, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Runtime tests for the SCHEDULED sweeps.
 *
 * Scheduled flows were previously untested at runtime, and they are the
 * hardest flows to get right for exactly the reason that makes them hard to
 * test: they select their own work. A sweep whose filter matches nothing is
 * indistinguishable from a sweep with nothing to do — it runs, logs nothing,
 * and stays green forever. Every case below therefore writes BOTH rows that
 * must be picked up and rows that must be left alone, so a filter that
 * silently matches everything (or nothing) fails.
 *
 * These run on the shipped app booted by `@objectstack/verify`: the fixture
 * rows are written through the real engine (as a person, or as the system
 * where the row's state is not one a person can produce), each sweep is
 * started through the trigger door as the admin (`flows.run`), and its effects
 * are read back off the engine — rows, and the notifications it handed the
 * messaging outbox (`notificationsTo`). The boot replays the app's seed data
 * and a sweep processes every match, seed rows included; so every reading is
 * taken over THIS case's own rows (by id, or by the action URL a notification
 * points at), never as a count over a whole object.
 */

/**
 * UTC calendar throughout — `setUTCDate`, not `setDate`. The flows under test
 * filter on a bare `{TODAY()}`, which the engine resolves on UTC; doing the
 * day arithmetic on the local calendar and rendering it with `toISOString()`
 * mixes two calendars and lands one UTC day late across a DST spring-forward.
 * `test/helpers/verify-stack.ts`'s `daysFromNow` carries the full reasoning.
 */
const iso = (daysFromNow: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString();
};
const day = (daysFromNow: number): string => iso(daysFromNow).slice(0, 10);

let verify: VerifyStack;
let admin: string;
let rep: Person;
let agent: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@flow-scheduled.test', {
    name: 'Sweep Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  // Service grants, but NOT on the `service_agent` rota: a case the agent
  // opens stays the agent's (`case_auto_assign` round-robins the rota).
  agent = await signUpPerson(verify, 'agent@flow-scheduled.test', {
    name: 'Sweep Agent', permissionSets: ['service_agent'],
  });
}, 120_000);

/** Run a scheduled sweep once, as the admin, through the trigger door. */
const sweep = (flowName: string) => verify.flows.run(flowName, {}, { as: admin });

/** The notifications of `topic` addressed to `userId` about the record at `url`. */
const notified = async (userId: string, topic: string, url: string) =>
  (await notificationsTo(verify, userId, topic)).filter((n) => n.payload?.actionUrl === url);

/** The stored rows of `object` with the given ids, keyed by `keys[i]`. */
const readBack = async (object: string, ids: Record<string, string>): Promise<Record<string, Rec>> => {
  const out: Record<string, Rec> = {};
  for (const [key, id] of Object.entries(ids)) out[key] = (await verify.rows(object, { id }))[0]!;
  return out;
};

/** An account of the rep's, at `tier`. */
const account = async (tier = 'smb'): Promise<Rec> =>
  (await verify.seed('crm_account', [{ name: `Sweep Co ${++k}`, tier, owner_id: rep.id }]))[0]!;

describe('case_sla_monitor — hourly breach sweep', () => {
  /**
   * The agent's cases, each opened for real (the case hooks stamp its SLA
   * clock from the priority × tier matrix) and then put in the state the
   * sweep is about by a system write — a clock already run out, a status
   * already settled — which no person's form produces directly.
   *
   * `high`, not `critical`: a critical case is escalated by
   * `case_escalation_on_create` the moment it is opened, which would satisfy
   * the escalation assertions below before the sweep ever ran.
   */
  const openCase = async (priority: string, stored: Rec): Promise<string> => {
    const acct = await account();
    const kase = await verify.hooks.run('crm_case', 'insert', {
      subject: `Server down ${++k}`, description: 'It is down.', crm_account: acct.id, status: 'new', priority,
    }, { as: agent.token });
    await systemUpdate(verify, 'crm_case', { id: kase.id, ...stored });
    return String(kase.id);
  };

  const seedCases = async () => ({
    // Breached and still open — MUST be flagged.
    c_breached: await openCase('high', { status: 'in_progress', sla_due_date: iso(-2) }),
    // Due in the future — must be left alone.
    c_future: await openCase('high', { status: 'in_progress', sla_due_date: iso(+2) }),
    // Past due but already resolved: work is finished, so this is NOT a breach.
    c_resolved: await openCase('high', { status: 'resolved', resolution: 'Fixed.', sla_due_date: iso(-5) }),
    // Past due but closed — likewise excluded.
    c_closed: await openCase('low', { status: 'closed', resolution: 'Fixed.', sla_due_date: iso(-9) }),
    // Already flagged — must not be re-processed (or re-notified).
    c_already: await openCase('high', { status: 'escalated', is_sla_violated: true, sla_due_date: iso(-3) }),
  });

  let ids: Record<string, string>;
  let before: Record<string, Rec>;
  let byId: Record<string, Rec>;
  beforeAll(async () => {
    ids = await seedCases();
    before = await readBack('crm_case', ids);
    await sweep('case_sla_monitor');
    byId = await readBack('crm_case', ids);
  }, 120_000);

  it('flags and escalates exactly the open, past-due, not-yet-flagged cases', () => {
    const breached = byId.c_breached!;
    expect(Boolean(breached.is_sla_violated)).toBe(true);
    expect(Boolean(breached.is_escalated)).toBe(true);
    expect(breached.status).toBe('escalated');
    // `escalation_reason` must accompany `is_escalated` or the object's
    // `escalation_reason_required` validation (severity: error) rejects the
    // whole write and the sweep becomes a silent no-op.
    expect(breached.escalation_reason, 'missing escalation_reason ⇒ write rejected').toBeTruthy();
    expect(breached.escalated_date).toBeTruthy();
  });

  it('leaves future-due, resolved and closed cases untouched', () => {
    for (const id of ['c_future', 'c_resolved', 'c_closed']) {
      expect(Boolean(byId[id]!.is_sla_violated), `${id} was wrongly flagged`).toBe(false);
      expect(Boolean(byId[id]!.is_escalated), `${id} was wrongly escalated`).toBe(false);
    }
    // Specifically: a resolved case has met its SLA. The filter used to read
    // `is_closed: false`, which only flips on `closed`, so resolved cases were
    // dragged back to `escalated`.
    expect(byId.c_resolved!.status).toBe('resolved');
  });

  it('does not re-process a case already marked as violated', () => {
    // The sweep wrote nothing to it: the row is exactly as it stood before.
    expect(byId.c_already!.updated_at, 'already-flagged case was re-written').toBe(before.c_already!.updated_at);
    expect(byId.c_already!.escalation_reason).toBe(before.c_already!.escalation_reason);
  });

  it('alerts the case owner, and only for the newly-breached case', async () => {
    const [alert, ...more] = await notified(agent.id, 'case_sla_breach', `/crm_case/${ids.c_breached}`);
    expect(alert, 'the owner of the breached case was not alerted').toBeDefined();
    expect(more, 'expected exactly one alert').toHaveLength(0);
    for (const id of ['c_future', 'c_resolved', 'c_closed', 'c_already']) {
      expect(await notified(agent.id, 'case_sla_breach', `/crm_case/${ids[id]}`), `${id} was alerted`).toHaveLength(0);
    }
    // `{currentCase.owner_id.manager}` dot-walks a lookup, which flow templates
    // interpolate as the literal string "undefined" — a silently undeliverable
    // notification. Guard against that shape reappearing anywhere in the payload.
    expect(JSON.stringify(alert), 'a template dot-walked a lookup').not.toContain('undefined');
    expect(alert!.payload.severity).toBe('critical');
    expect(String(alert!.payload.templateData.case_number)).toBe(byId.c_breached!.case_number);
  });

  it('is a clean no-op when nothing has breached', async () => {
    const id = await openCase('medium', { status: 'in_progress', sla_due_date: iso(+5) });
    await sweep('case_sla_monitor');
    expect(Boolean((await verify.rows('crm_case', { id }))[0]!.is_sla_violated)).toBe(false);
    expect(await notified(agent.id, 'case_sla_breach', `/crm_case/${id}`)).toHaveLength(0);
  });
});

describe('case_sla_monitor — non-critical breaches (#595)', () => {
  /**
   * The acceptance criterion of #595, asserted rather than reasoned about.
   *
   * The sweep's filter has always been priority-blind — it selects on
   * `sla_due_date < now` and nothing else — so "it can't fire for High cases"
   * was never a property of this flow. It was a property of the HOOK: nothing
   * stamped `sla_due_date` below `critical`, and a blank date is never in the
   * past. Proving the fix therefore means running BOTH halves for real: the
   * shipped `case_sla_defaults` handler stamps the deadline on a real insert,
   * and the shipped `case_sla_monitor` flow sweeps it.
   *
   * The clock (`Date` only — the stack's timers keep running) is moved back to
   * the moment of creation so the matrix's own offset is what puts the case
   * past due — no hand-written date anywhere in this test, which is what keeps
   * it honest if a cell ever changes.
   */
  const NON_CRITICAL: Array<{ priority: string; tier: string; hours: number }> = [
    { priority: 'high', tier: 'strategic', hours: 6 },
    { priority: 'high', tier: 'enterprise', hours: 8 },
    { priority: 'medium', tier: 'mid_market', hours: 48 },
    { priority: 'low', tier: 'smb', hours: 168 },
  ];

  /** Open a case as the agent as if it had been created `hoursAgo` hours ago. */
  const openAt = async (priority: string, tier: string, hoursAgo: number): Promise<Rec> => {
    const acct = await account(tier);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(Date.now() - hoursAgo * 3_600_000));
      return await verify.hooks.run('crm_case', 'insert', {
        subject: `Slow burn ${++k}`, description: 'Not urgent, until it is.', crm_account: acct.id,
        status: 'new', priority,
      }, { as: agent.token });
    } finally {
      vi.useRealTimers();
    }
  };

  it.each(NON_CRITICAL)(
    'flags and escalates a breached $priority case on a $tier account',
    async ({ priority, tier, hours }) => {
      const kase = await openAt(priority, tier, hours + 1);
      const due = String(kase.sla_due_date);
      expect(kase.sla_due_date, `${priority} got no SLA clock at all`).toBeTruthy();
      expect(new Date(due).getTime(), 'the matrix offset should put this case past due')
        .toBeLessThan(Date.now());

      await sweep('case_sla_monitor');

      const [swept] = await verify.rows('crm_case', { id: kase.id });
      expect(Boolean(swept!.is_sla_violated), `a breached ${priority} case was not flagged`).toBe(true);
      expect(Boolean(swept!.is_escalated)).toBe(true);
      expect(swept!.status).toBe('escalated');
      expect(swept!.escalation_reason, 'missing reason ⇒ the write is rejected').toBeTruthy();
      expect(await notified(agent.id, 'case_sla_breach', `/crm_case/${kase.id}`), 'the owner must be alerted').toHaveLength(1);
    },
  );

  it('still leaves a non-critical case alone while it is inside its window', async () => {
    // The other half of the guard: a High case that has NOT breached must not
    // be swept just because it finally has a due date.
    const kase = await openAt('high', 'enterprise', 0);
    expect(kase.sla_due_date, 'high got no SLA clock at all').toBeTruthy();
    await sweep('case_sla_monitor');
    const [swept] = await verify.rows('crm_case', { id: kase.id });
    expect(Boolean(swept!.is_sla_violated)).toBe(false);
    expect(await notified(agent.id, 'case_sla_breach', `/crm_case/${kase.id}`)).toHaveLength(0);
  });
});

/** A deal of the rep's, on its own account. */
const deal = async (over: Rec = {}): Promise<Rec> => {
  const acct = await account();
  return (await verify.seed('crm_opportunity', [{
    name: `Sweep Deal ${++k}`, amount: 50_000, stage: 'proposal', close_date: '2030-06-30',
    crm_account: acct.id, owner_id: rep.id, ...over,
  }]))[0]!;
};

/** An account of the rep's with a contact — the two parties every quote and contract names. */
const parties = async (): Promise<{ account: Rec; contact: Rec }> => {
  const acct = await account();
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Cara', last_name: `Signer ${++k}`, email: `cara${k}@flow-scheduled.test`, crm_account: acct.id, owner_id: rep.id,
  }]);
  return { account: acct, contact: contact! };
};

describe('quote_expiration — daily auto-expiry', () => {
  /** Quotes in every state the sweep has to tell apart, written as the system. */
  const run = async () => {
    const { account: acct, contact } = await parties();
    const [opp] = await verify.seed('crm_opportunity', [{
      name: `Quoted Deal ${++k}`, amount: 50_000, stage: 'proposal', close_date: '2030-06-30',
      crm_account: acct.id, primary_contact: contact.id, owner_id: rep.id,
    }]);
    const quote = async (status: string, expirationDays: number) => String((await verify.seed('crm_quote', [{
      name: `Q ${status} ${++k}`, status, expiration_date: day(expirationDays), quote_date: day(-60),
      crm_opportunity: opp!.id, crm_account: acct.id, crm_contact: contact.id, owner_id: rep.id,
    }]))[0]!.id);
    const ids = {
      q_past: await quote('presented', -1),       // expire
      q_draft_past: await quote('draft', -30),    // expire
      q_future: await quote('presented', +7),     // keep
      q_accepted: await quote('accepted', -9),    // settled
      q_rejected: await quote('rejected', -9),    // settled
      q_expired: await quote('expired', -9),      // already
    };
    await sweep('quote_expiration');
    return readBack('crm_quote', ids);
  };

  let byId: Record<string, Rec>;
  beforeAll(async () => { byId = await run(); }, 120_000);

  it('expires open quotes past their expiration_date', () => {
    expect(byId.q_past!.status).toBe('expired');
    expect(byId.q_draft_past!.status).toBe('expired');
  });

  it('leaves future-dated and already-settled quotes alone', () => {
    expect(byId.q_future!.status).toBe('presented');
    expect(byId.q_accepted!.status).toBe('accepted');
    expect(byId.q_rejected!.status).toBe('rejected');
    expect(byId.q_expired!.status).toBe('expired');
  });
});

/** A contract of the rep's in the state `over` describes, written as the system. */
const contract = async (over: Rec = {}): Promise<Rec> => {
  const { account: acct, contact } = await parties();
  const endDays = over.endDays ?? 20;
  const { endDays: _drop, ...rest } = over;
  return (await verify.seed('crm_contract', [{
    status: 'activated', crm_account: acct.id, crm_contact: contact.id, owner_id: rep.id,
    contract_type: 'subscription', contract_value: 90_000, auto_renewal: false, renewal_notice_days: 30,
    contract_term_months: 12, start_date: day(endDays - 365), end_date: day(endDays),
    billing_frequency: 'monthly', payment_terms: 'net_30', ...rest,
  }]))[0]!;
};

describe('contract_expiration — daily auto-expiry', () => {
  let ids: Record<string, string>;
  let byId: Record<string, Rec>;
  beforeAll(async () => {
    ids = {
      k_past: String((await contract({ endDays: -1 })).id),
      k_future: String((await contract({ endDays: +30 })).id),
      k_draft: String((await contract({ status: 'draft', endDays: -30 })).id),
      k_expired: String((await contract({ status: 'expired', endDays: -60 })).id),
    };
    await sweep('contract_expiration');
    byId = await readBack('crm_contract', ids);
  }, 120_000);

  it('expires only activated contracts past their end_date', () => {
    expect(byId.k_past!.status).toBe('expired');
    expect(byId.k_future!.status).toBe('activated');
    expect(byId.k_draft!.status, 'a draft contract must not be auto-expired').toBe('draft');
  });

  it('notifies the owner once, with a resolved contract number', async () => {
    const [alert, ...more] = await notified(rep.id, 'contract_expired', `/crm_contract/${ids.k_past}`);
    expect(alert, 'the owner was not notified').toBeDefined();
    expect(more).toHaveLength(0);
    for (const id of ['k_future', 'k_draft', 'k_expired']) {
      expect(await notified(rep.id, 'contract_expired', `/crm_contract/${ids[id]}`), `${id} was notified`).toHaveLength(0);
    }
    expect(String(alert!.payload.templateData.contract_number)).toBe(byId.k_past!.contract_number);
    expect(JSON.stringify(alert), 'a template failed to interpolate').not.toContain('undefined');
  });
});

describe('campaign_completion — daily auto-completion', () => {
  it('completes ended in_progress campaigns and leaves the rest', async () => {
    const campaign = async (status: string, endDays: number) => String((await verify.seed('crm_campaign', [{
      name: `Campaign ${status} ${++k}`, status, start_date: day(endDays - 30), end_date: day(endDays), owner_id: rep.id,
    }]))[0]!.id);
    const ids = {
      cmp_ended: await campaign('in_progress', -1),
      cmp_running: await campaign('in_progress', +10),
      cmp_planning: await campaign('planning', -10),
      cmp_done: await campaign('completed', -10),
    };
    await sweep('campaign_completion');

    const byId = await readBack('crm_campaign', ids);
    expect(byId.cmp_ended!.status).toBe('completed');
    expect(byId.cmp_running!.status).toBe('in_progress');
    // A campaign still in planning never ran, so "ended" does not apply.
    expect(byId.cmp_planning!.status).toBe('planning');
    expect(byId.cmp_done!.status).toBe('completed');
  });
});

describe('task_due_reminder — hourly reminder sweep', () => {
  const task = async (over: Rec) => String((await verify.seed('crm_task', [{
    subject: `Task ${++k}`, status: 'not_started', priority: 'normal', owner_id: rep.id, ...over,
  }]))[0]!.id);
  const run = async () => {
    const ids = {
      t_due: await task({ subject: `Call Acme ${k}`, reminder_date: iso(-1) }),
      t_future: await task({ subject: 'Later', reminder_date: iso(+3) }),
      t_done: await task({ subject: 'Done', status: 'completed', reminder_date: iso(-5) }),
      t_none: await task({ subject: 'No reminder', reminder_date: null }),
    };
    await sweep('task_due_reminder');
    return ids;
  };
  const reminders = (id: string) => notified(rep.id, 'task_reminder', `/crm_task/${id}`);

  it('notifies the owner of a task whose reminder time has arrived', async () => {
    const ids = await run();
    const [alert, ...more] = await reminders(ids.t_due);
    expect(alert, 'the owner was not reminded').toBeDefined();
    expect(more).toHaveLength(0);
    expect(String(alert!.payload.templateData.subject)).toContain('Call Acme');
    expect(alert!.payload.severity).toBe('warning');
  });

  it('clears reminder_date so the same task is never alerted twice', async () => {
    const ids = await run();
    const byId = await readBack('crm_task', ids);
    expect(Boolean(byId.t_due!.reminder_sent)).toBe(true);
    // Clearing the date is what de-dups: the row stops matching `$lte` next tick.
    expect(byId.t_due!.reminder_date).toBeNull();
  });

  it('is idempotent across consecutive ticks', async () => {
    const id = await task({ subject: 'Call Acme', reminder_date: iso(-1) });
    await sweep('task_due_reminder');
    await sweep('task_due_reminder');
    expect(await reminders(id), 'the same task was alerted twice').toHaveLength(1);
  });

  it('skips future, completed and reminder-less tasks', async () => {
    const ids = await run();
    const byId = await readBack('crm_task', ids);
    for (const id of ['t_future', 't_done', 't_none'] as const) {
      expect(Boolean(byId[id]!.reminder_sent), `${id} was wrongly reminded`).toBe(false);
      expect(await reminders(ids[id]), `${id} was wrongly reminded`).toHaveLength(0);
    }
  });
});

describe('opportunity_stagnation — daily stalled-deal nudge', () => {
  // The sweep predicates on the STORED `stage_entry_date`, not on the
  // `days_in_stage` FORMULA — a formula is evaluated after the query, so it
  // cannot be a filter key (#489). `stage_entry_date < TODAY() - 14` is the
  // same test, resolved by the flow template engine.
  const seedOpps = async () => {
    const ids = {
      o_stalled: String((await deal({ name: `Stalled Deal ${++k}`, stage: 'proposal', stage_entry_date: day(-30) })).id),
      o_fresh: String((await deal({ stage: 'proposal', stage_entry_date: day(-3) })).id),
      // Exactly at the threshold: the filter is `$lt`, so a deal that entered its
      // stage exactly 14 days ago must NOT fire.
      o_boundary: String((await deal({ stage: 'proposal', stage_entry_date: day(-14) })).id),
      o_won: String((await deal({ stage: 'closed_won', win_reason: 'better_price', stage_entry_date: day(-99) })).id),
      o_lost: String((await deal({ stage: 'closed_lost', loss_reason: 'competitor', stage_entry_date: day(-99) })).id),
      o_nullclock: String((await deal({ stage: 'proposal' })).id),
    };
    // A row with a null clock does not satisfy `$lt` and is skipped. An insert
    // has its clock stamped by the opportunity hook, so a legacy unstamped row
    // is reproduced by clearing it.
    await systemUpdate(verify, 'crm_opportunity', { id: ids.o_nullclock, stage_entry_date: null });
    return ids;
  };
  const tasksFor = (id: string) => verify.rows('crm_task', { related_to_opportunity: id });
  const nudges = (id: string) => notified(rep.id, 'deal_stalled', `/crm_opportunity/${id}`);

  it('nudges exactly the open deals past the 14-day threshold', async () => {
    const ids = await seedOpps();
    await sweep('opportunity_stagnation');
    const [stalled] = await verify.rows('crm_opportunity', { id: ids.o_stalled });

    const tasks = await tasksFor(ids.o_stalled);
    expect(tasks).toHaveLength(1);
    const [task] = tasks;
    expect(task!.subject).toBe(`Advance stalled deal: ${stalled!.name}`);
    expect(task!.related_to_opportunity).toBe(ids.o_stalled);
    expect(task!.related_to_type).toBe('crm_opportunity');
    expect(task!.owner_id).toBe(rep.id);
    expect(task!.priority).toBe('high');
    expect(task!.status).toBe('not_started');

    const sent = await nudges(ids.o_stalled);
    expect(sent).toHaveLength(1);
    expect(String(sent[0]!.payload.templateData.name)).toContain(stalled!.name);
    expect(JSON.stringify(sent[0]), 'a template dot-walked a lookup').not.toContain('undefined');
  });

  it('skips fresh, boundary, closed and null-clock deals', async () => {
    const ids = await seedOpps();
    await sweep('opportunity_stagnation');
    for (const id of ['o_fresh', 'o_boundary', 'o_won', 'o_lost', 'o_nullclock'] as const) {
      expect(await tasksFor(ids[id]), `${id} should not have been nudged`).toHaveLength(0);
    }
  });

  it('is idempotent: a second sweep does not pile up duplicate nudges', async () => {
    // Without the "already nudged?" gate the daily sweep re-notified and
    // re-created an identical task every morning for as long as the deal stayed
    // stalled — an unbounded duplicate pile-up.
    const ids = await seedOpps();
    await sweep('opportunity_stagnation');
    await sweep('opportunity_stagnation');

    expect(await tasksFor(ids.o_stalled), 'duplicate stall task on the second sweep').toHaveLength(1);
    expect(await nudges(ids.o_stalled), 'duplicate nudge on the second sweep').toHaveLength(1);
  });

  it('re-arms once the previous stall task is completed', async () => {
    const ids = await seedOpps();
    const [stalled] = await verify.rows('crm_opportunity', { id: ids.o_stalled });
    await verify.seed('crm_task', [{
      related_to_type: 'crm_opportunity', related_to_opportunity: ids.o_stalled, owner_id: rep.id,
      subject: `Advance stalled deal: ${stalled!.name}`, type: 'follow_up', priority: 'high', status: 'completed',
    }]);
    await sweep('opportunity_stagnation');
    expect((await tasksFor(ids.o_stalled)).filter((t) => t.status === 'not_started')).toHaveLength(1);
  });
});

describe('contract_renewal — daily notice-window sweep', () => {
  const renewalTasks = (k: Rec) =>
    verify.rows('crm_task', { related_to_account: k.crm_account, subject: `Renewal due: contract ${k.contract_number}` });
  const renewalDeals = (k: Rec) =>
    verify.rows('crm_opportunity', { crm_account: k.crm_account, type: 'existing_renewal' });
  const notices = (k: Rec) => notified(rep.id, 'contract_renewal', `/crm_contract/${k.id}`);

  it('pre-filters to activated contracts ending within the next 120 days', async () => {
    // The 120-day span must cover the LARGEST renewal_notice_days in use (seeds
    // go to 90). A narrower pre-filter silently truncates the longest notice
    // periods, so pin the window itself — at both of its edges, with contracts
    // whose own notice period would otherwise reach them.
    const today = await contract({ endDays: 0, renewal_notice_days: 30 });
    const lastDay = await contract({ endDays: 120, renewal_notice_days: 120 });
    const beyond = await contract({ endDays: 121, renewal_notice_days: 200 });
    await sweep('contract_renewal');
    expect(await renewalTasks(today), 'a contract ending today is inside the pre-filter').toHaveLength(1);
    expect(await renewalTasks(lastDay), 'pre-filter must span 120 days').toHaveLength(1);
    expect(await renewalTasks(beyond), 'pre-filter must end at 120 days').toHaveLength(0);
  });

  it('selects nothing outside the pre-filter window', async () => {
    const outside = [
      await contract({ endDays: 200 }),
      await contract({ endDays: -5 }),
      await contract({ status: 'draft' }),
    ];
    await sweep('contract_renewal');
    for (const k of outside) {
      expect(await renewalTasks(k)).toHaveLength(0);
      expect(await notices(k)).toHaveLength(0);
    }
  });

  it('books a renewal task and notifies the owner inside the notice window', async () => {
    const k = await contract({ endDays: 20, renewal_notice_days: 30 });
    await sweep('contract_renewal');

    const tasks = await renewalTasks(k);
    expect(tasks).toHaveLength(1);
    const [task] = tasks;
    expect(task!.subject).toBe(`Renewal due: contract ${k.contract_number}`);
    expect(task!.related_to_account).toBe(k.crm_account);
    expect(task!.owner_id).toBe(rep.id);
    expect(task!.priority).toBe('high');

    const sent = await notices(k);
    expect(sent).toHaveLength(1);
    expect(String(sent[0]!.payload.templateData.contract_number)).toContain(k.contract_number);
  });

  it('honours each contract’s own renewal_notice_days, not a shared constant', async () => {
    // The pre-filter spans 120 days precisely so a 90-day notice period is not
    // silently truncated; the per-record decision applies the real window.
    const early = await contract({ endDays: 80, renewal_notice_days: 90 });
    const late = await contract({ endDays: 80, renewal_notice_days: 30 });
    await sweep('contract_renewal');
    expect(await renewalTasks(early), 'the 90-day-notice contract is in window').toHaveLength(1);
    expect(await renewalTasks(late), 'the 30-day-notice contract is still 80 days out').toHaveLength(0);
  });

  it('opens a pre-filled renewal opportunity only when auto_renewal is on', async () => {
    const withAuto = await contract({ auto_renewal: true });
    const withoutAuto = await contract({ auto_renewal: false });
    await sweep('contract_renewal');

    const deals = await renewalDeals(withAuto);
    expect(deals).toHaveLength(1);
    const [opp] = deals;
    expect(opp!.name).toBe(`Renewal — ${withAuto.contract_number}`);
    expect(opp!.crm_account).toBe(withAuto.crm_account);
    expect(opp!.type).toBe('existing_renewal');
    expect(Number(opp!.amount)).toBe(90_000);
    expect(opp!.stage).toBe('proposal');

    expect(await renewalDeals(withoutAuto)).toHaveLength(0);
  });

  it('never opens a second renewal deal while one is still in flight', async () => {
    const auto = await contract({ auto_renewal: true });
    await verify.seed('crm_opportunity', [{
      name: `In-flight renewal ${++k}`, crm_account: auto.crm_account, type: 'existing_renewal', stage: 'negotiation',
      amount: 90_000, close_date: '2030-06-30', owner_id: rep.id,
    }]);
    await sweep('contract_renewal');
    expect(await renewalDeals(auto), 'duplicate renewal deal opened').toHaveLength(1);
  });

  it('is idempotent across repeated sweeps within the same window', async () => {
    const k = await contract({ auto_renewal: true });
    await sweep('contract_renewal');
    await sweep('contract_renewal');
    expect(await renewalTasks(k), 'duplicate renewal task').toHaveLength(1);
    expect(await renewalDeals(k), 'duplicate renewal deal').toHaveLength(1);
    expect(await notices(k), 'duplicate renewal notification').toHaveLength(1);
  });

  it('ignores contracts that are not activated', async () => {
    const inactive = [await contract({ status: 'draft' }), await contract({ status: 'expired' })];
    await sweep('contract_renewal');
    for (const k of inactive) {
      expect(await renewalTasks(k)).toHaveLength(0);
      expect(await notices(k)).toHaveLength(0);
    }
  });
});

describe('forecast_snapshot — nightly per-owner pipeline snapshot', () => {
  // Calendar-quarter maths in UTC, mirroring forecast.hook.ts and the seed
  // module. The flow itself does none of this — that is the point: a flow
  // template cannot express a quarter boundary, so the hook owns it and the
  // flow reads the window back off the row it created.
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const nowUtc = new Date();
  const qStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), Math.floor(nowUtc.getUTCMonth() / 3) * 3, 1));
  const qEnd = new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() + 3, 0));
  const inPeriod = isoUtc(qStart);
  const beforePeriod = isoUtc(new Date(qStart.getTime() - 86_400_000));
  const quarterLabel = `Q${Math.floor(qStart.getUTCMonth() / 3) + 1} ${qStart.getUTCFullYear()}`;

  /**
   * Four people the sweep's `sys_user` read reaches — two active deal owners,
   * one who owns nothing, one who owns only a lost deal — and their deals.
   * Both rows that MUST be counted and rows that must be left out: a sweep
   * whose window or bucket filter silently matches everything looks identical
   * to a correct one otherwise. Fresh people per case, since a snapshot row is
   * per owner and per period.
   */
  const world = async () => {
    const n = ++k;
    const person = (who: string) => signUpPerson(verify, `${who}.${n}@forecast.flow-scheduled.test`, { name: `${who} ${n}` });
    const people = {
      rep1: await person('rep1'),
      rep2: await person('rep2'),
      rep3: await person('no-deals'),
      rep4: await person('only-lost'),
    };
    const acct = await account();
    const opp = (owner: Person, stage: string, amount: unknown, close_date: string, extra: Rec = {}) => ({
      name: `Forecast ${stage} ${++k}`, owner_id: owner.id, stage, amount, close_date, crm_account: acct.id, ...extra,
    });
    await verify.seed('crm_opportunity', [
      // rep1 — one deal per bucket, plus two that must not count.
      opp(people.rep1, 'qualification', 100_000, inPeriod, { approval_status: 'approved' }),
      opp(people.rep1, 'needs_analysis', 50_000, inPeriod),
      opp(people.rep1, 'negotiation', 30_000, inPeriod),
      opp(people.rep1, 'closed_won', 70_000, inPeriod, { win_reason: 'better_price' }),
      // Closes in the PREVIOUS quarter — outside every bucket, but still makes
      // rep1 an active owner.
      opp(people.rep1, 'proposal', 999_999, beforePeriod, { approval_status: 'approved' }),
      // Lost deals are neither open nor won.
      opp(people.rep1, 'closed_lost', 12_345, inPeriod, { loss_reason: 'competitor' }),
      // rep2 — the second amount is handed over as a STRING, the shape a
      // currency column takes coming back from some drivers. Without the `* 1`
      // coercion in the accumulator the template CONCATENATES and pipeline
      // reads "020000" + "25000" instead of 45000.
      opp(people.rep2, 'proposal', 20_000, inPeriod),
      opp(people.rep2, 'qualification', '25000', inPeriod),
      // rep4 owns nothing but a lost deal — not a forecast owner.
      opp(people.rep4, 'closed_lost', 88_000, inPeriod, { loss_reason: 'competitor' }),
    ]);
    return people;
  };
  type World = Awaited<ReturnType<typeof world>>;

  /** The snapshot rows of `w`'s people, by person key. */
  const rowsOf = async (w: World): Promise<Record<string, Rec[]>> => {
    const out: Record<string, Rec[]> = {};
    for (const [key, who] of Object.entries(w)) out[key] = await verify.rows('crm_forecast', { owner_id: who.id });
    return out;
  };
  const currentOf = (rows: Rec[]) =>
    rows.filter((r) => r.period === 'quarter' && String(r.period_start) === isoUtc(qStart));

  it('opens a current-period row for every active opportunity owner, and only for them', async () => {
    const w = await world();
    await sweep('forecast_snapshot');
    const rows = await rowsOf(w);

    expect(rows.rep1, 'rep1 owns live deals').toHaveLength(1);
    expect(rows.rep2, 'rep2 owns live deals').toHaveLength(1);
    // A user with no opportunities at all, and one whose only deal is lost,
    // must not collect an empty snapshot row.
    expect(rows.rep3, 'rep3 owns nothing').toHaveLength(0);
    expect(rows.rep4, 'rep4 owns only a lost deal').toHaveLength(0);
  });

  it('lands on a calendar-true quarter, derived by the hook rather than the flow', async () => {
    const w = await world();
    await sweep('forecast_snapshot');
    const [snap] = (await rowsOf(w)).rep1!;

    expect(snap!.period).toBe('quarter');
    // The invariant #530 pinned for the seeds now also holds for every
    // runtime snapshot: exact boundaries, and the label dialect the hook and
    // the seeds both speak.
    expect(snap!.period_start).toBe(isoUtc(qStart));
    expect(snap!.period_end).toBe(isoUtc(qEnd));
    expect(snap!.period_label).toBe(quarterLabel);
    expect(snap!.snapshot_date).toBe(isoUtc(nowUtc));
    expect(snap!.source).toBe('scheduled');
  });

  it('sums the cumulative buckets from forecast_category', async () => {
    const w = await world();
    await sweep('forecast_snapshot');
    const [snap] = (await rowsOf(w)).rep1!;

    // pipeline = every open deal in the window: 100k + 50k + 30k.
    expect(Number(snap!.pipeline_amount)).toBe(180_000);
    // best case = best_case ∪ commit: 50k + 30k. A strict partition would
    // read 50k here, so this pins the ladder, not just "some sum happened".
    expect(Number(snap!.best_case_amount)).toBe(80_000);
    expect(Number(snap!.commit_amount)).toBe(30_000);
    expect(Number(snap!.closed_amount)).toBe(70_000);
  });

  it('excludes deals closing outside the period, and lost deals', async () => {
    const w = await world();
    await sweep('forecast_snapshot');
    const [snap] = (await rowsOf(w)).rep1!;
    // The 999,999 last-quarter deal and the 12,345 lost deal are the only way
    // any total could exceed these.
    for (const field of ['pipeline_amount', 'best_case_amount', 'commit_amount', 'closed_amount']) {
      expect(Number(snap![field]), `${field} swallowed an out-of-scope deal`).toBeLessThan(200_000);
    }
  });

  it('coerces a string amount instead of concatenating it', async () => {
    // ⚠️ What this can and cannot show on the real engine: the string is
    // handed to the engine, and the SQLite datasource stores and returns it as
    // the number 25000 (measured) — so the `* 1` guard for a driver that
    // returns currency as a string is not exercised here. What IS pinned is
    // the outcome on the shape this datasource returns: a sum, never a
    // concatenation.
    const w = await world();
    await sweep('forecast_snapshot');
    const [snap] = (await rowsOf(w)).rep2!;
    expect(Number(snap!.pipeline_amount)).toBe(45_000);
    expect(typeof snap!.pipeline_amount, 'the accumulator produced a string').toBe('number');
  });

  it('is idempotent: a second sweep refreshes the row instead of duplicating it', async () => {
    const w = await world();
    await sweep('forecast_snapshot');
    await sweep('forecast_snapshot');
    const rows = await rowsOf(w);

    expect(rows.rep1, 'the sweep inserted a second row for the same period').toHaveLength(1);
    expect(rows.rep2, 'the sweep inserted a second row for the same period').toHaveLength(1);
    // Re-running must RECOMPUTE, not accumulate: a sweep that added to the
    // stored totals would read 360,000 here.
    expect(Number(rows.rep1![0]!.pipeline_amount)).toBe(180_000);
  });

  /** A snapshot row of `owner`'s from an earlier night, written as the system. */
  const earlierRow = async (owner: Person, over: Rec) => (await verify.seed('crm_forecast', [{
    owner_id: owner.id, period: 'quarter',
    period_start: isoUtc(qStart), period_end: isoUtc(qEnd), period_label: quarterLabel,
    snapshot_date: beforePeriod, source: 'scheduled', ...over,
  }]))[0]!;

  it('overwrites stale amounts when the pipeline moves', async () => {
    // A pre-existing row from an earlier night, carrying numbers that no
    // longer reflect the pipeline. The whole point of a nightly upsert is
    // that amounts can go DOWN, which a create-once writer never achieves.
    const w = await world();
    const stale = await earlierRow(w.rep1, {
      pipeline_amount: 9_999_999, best_case_amount: 9_999_999,
      commit_amount: 9_999_999, closed_amount: 9_999_999,
    });
    await sweep('forecast_snapshot');

    const rows = (await rowsOf(w)).rep1!;
    expect(rows).toHaveLength(1);
    const [snap] = rows;
    expect(snap!.id, 'the existing row was replaced rather than refreshed').toBe(stale.id);
    expect(Number(snap!.pipeline_amount)).toBe(180_000);
    expect(Number(snap!.closed_amount)).toBe(70_000);
    expect(snap!.snapshot_date).toBe(isoUtc(nowUtc));
  });

  it('never writes quota — the manually-maintained attainment denominator', async () => {
    const w = await world();
    await earlierRow(w.rep1, { quota: 1_500_000 });
    await sweep('forecast_snapshot');

    const rows = await rowsOf(w);
    expect(Number(rows.rep1![0]!.quota), 'the sweep clobbered a hand-maintained quota').toBe(1_500_000);
    // And a freshly opened row leaves quota NULL rather than zeroing it — the
    // column the sweep never writes, as a materialising driver returns it — so
    // `attainment_pct` guards on quota > 0 instead of dividing by a lie.
    expect(rows.rep2![0]!.quota).toBeNull();
  });

  it('does not touch a snapshot belonging to a different period', async () => {
    const w = await world();
    const previousQuarterEnd = isoUtc(new Date(qStart.getTime() - 86_400_000));
    const old = await earlierRow(w.rep1, {
      period_start: isoUtc(new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() - 3, 1))),
      period_end: previousQuarterEnd, period_label: 'previous',
      snapshot_date: previousQuarterEnd, closed_amount: 1_485_000,
    });
    await sweep('forecast_snapshot');

    const [after] = await verify.rows('crm_forecast', { id: old.id });
    expect(Number(after!.closed_amount), 'a closed period was rewritten').toBe(1_485_000);
    // rep1 still gets a NEW row for the current quarter.
    const rows = await rowsOf(w);
    expect(rows.rep1, 'rep1 has its old row and a new current one').toHaveLength(2);
    expect(currentOf(rows.rep1!)).toHaveLength(1);
  });

  it('is a clean no-op when nobody owns a live deal', async () => {
    const idle = await signUpPerson(verify, `idle.${++k}@forecast.flow-scheduled.test`, { name: 'Idle' });
    const acct = await account();
    await verify.seed('crm_opportunity', [{
      name: `Lost ${k}`, owner_id: idle.id, stage: 'closed_lost', loss_reason: 'competitor', amount: 10,
      close_date: inPeriod, crm_account: acct.id,
    }]);
    await sweep('forecast_snapshot');
    expect(await verify.rows('crm_forecast', { owner_id: idle.id })).toHaveLength(0);
  });
});

/**
 * Re-seed × snapshot: one row per (owner, period, window) — #702.
 *
 * The reported defect needs three ordinary behaviours and no bug in any of
 * them: seeds land ownerless (seed writes are `isSystem`, so the platform's
 * `owner_id` stamp never fires), a warm boot replays them, and the sweep's
 * current-window lookup is owner-scoped. Put a seeded row in the window the
 * sweep writes and the sweep cannot see it — so it opens a SECOND row beside
 * it, and every owner-grouped consumer shows a phantom ownerless duplicate for
 * the current quarter after every re-seeded boot.
 *
 * The fix is in the seed data — the current quarter is no longer seeded — and
 * this block's job is to show that the invariant survives the ownership claim
 * and the scheduled sweep in EITHER ORDER. That matters because the obvious
 * alternative fix (claim `crm_forecast` and let the sweep adopt the claimed
 * row) holds only while the claim reaches the window before `forecast_snapshot`
 * does, and a duplicate opened by losing that race never heals.
 *
 * Each ordering gets a stack of its own (`bootStack`): the cold boot is the
 * platform's own — the seed loader writes the app's REAL seed records and
 * `claimSeedOwnership` runs on `app:seeded`. On top of it, each ordering runs
 * its two steps, replays the seeds the way a warm boot does — the platform's
 * own `SeedLoaderService`, `mode: 'upsert'` on `seed_key`, a PARTIAL write over
 * the columns the seed declares (the seeds declare no `owner_id`, so a claimed
 * owner SURVIVES the replay; if it did not, the ownerless state would return
 * on every boot and no claim could ever settle it) — and runs the two steps
 * again. The claim is the platform's `claimSeedOwnership` (objectstack#17872,
 * shipped in 17.6.0), on the booted engine, for the admin. The last case
 * restores a current-quarter seed row and reproduces the duplicate, so a green
 * run here can never be green for want of a mechanism.
 */
describe('re-seed × snapshot leaves one row per (owner, period, window) (#702)', () => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const nowUtc = new Date();
  const qStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), Math.floor(nowUtc.getUTCMonth() / 3) * 3, 1));
  const qEnd = new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() + 3, 0));
  const today = isoUtc(nowUtc);

  /** The forecast dataset the seed loader actually ships, read from the app. */
  const forecastSeed = (CrmSeedData as unknown as Array<{ object: string; records: Rec[] }>)
    .find((d) => d.object === 'crm_forecast')!;
  const seedRecords = forecastSeed.records ?? [];

  const silent = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined };

  /**
   * A stack of the ordering's own, with two deal owners (the admin — the
   * claim's target and the demo's first administrator — and a rep) holding a
   * live current-quarter deal each, and one person the sweep must skip.
   */
  const bootWorld = async () => {
    const stack = await bootStack(artifact, bootOptions());
    const adminToken = await stack.signIn();
    const adminId = String((await stack.contextFor(adminToken)).userId);
    const repTwo = await signUpPerson(stack, 'rep.two@reseed.flow-scheduled.test', { name: 'Rep Two' });
    const idle = await signUpPerson(stack, 'idle@reseed.flow-scheduled.test', { name: 'No Deals At All' });
    const [acct] = await stack.seed('crm_account', [{ name: 'Reseed Co', owner_id: adminId }]);
    await stack.seed('crm_opportunity', [
      { name: 'Admin Q deal', owner_id: adminId, stage: 'negotiation', amount: 200_000, approval_status: 'approved', close_date: isoUtc(qStart), crm_account: acct!.id },
      { name: 'Rep Two Q deal', owner_id: repTwo.id, stage: 'proposal', amount: 90_000, close_date: isoUtc(qStart), crm_account: acct!.id },
    ]);
    const ql = stack.kernel.getService<Rec>('objectql');
    const steps: Record<string, () => Promise<unknown>> = {
      claim: () => claimSeedOwnership(ql, adminId, { logger: silent }),
      forecast_snapshot: () => stack.flows.run('forecast_snapshot', {}, { as: adminToken }),
    };
    const replaySeeds = () => new SeedLoaderService(ql as never, stack.kernel.getService('metadata') as never, silent as never)
      .load(SeedLoaderRequestSchema.parse({ seeds: [forecastSeed], config: { defaultMode: 'upsert', multiPass: true } }));
    return { stack, adminId, repTwo, idle, steps, replaySeeds };
  };

  const inCurrentQuarter = (r: Rec) =>
    r.period === 'quarter' && String(r.period_start) <= today && today <= String(r.period_end);

  const ORDERINGS = [
    ['claim first — the seed settles before the snapshot sweep runs', ['claim', 'forecast_snapshot']],
    ['sweep first — a boot minutes before 03:00', ['forecast_snapshot', 'claim']],
  ] as const;

  for (const [label, order] of ORDERINGS) {
    describe(label, () => {
      let w: Awaited<ReturnType<typeof bootWorld>>;
      let rows: Rec[];
      beforeAll(async () => {
        w = await bootWorld();
        for (const name of order) await w.steps[name]!();
        await w.replaySeeds();
        for (const name of order) await w.steps[name]!();
        rows = await w.stack.rows('crm_forecast', {});
      }, 120_000);

      it('leaves no forecast row owned by nobody', () => {
        const ownerless = rows
          .filter((r) => r.owner_id == null)
          .map((r) => `${String(r.seed_key ?? r.id)} (${String(r.period)} ${String(r.period_start)})`);
        expect(
          ownerless,
          'these rows render with a blank Owner in every owner-grouped surface, and\n'
            + "under sharingModel:'private' are readable by no rep at all:\n  "
            + ownerless.join('\n  '),
        ).toEqual([]);
      });

      it('leaves exactly one row per (owner, period, period_start)', () => {
        const keys = rows.map(
          (r) => `${String(r.owner_id)}|${String(r.period)}|${String(r.period_start)}`,
        );
        const dupes = [...new Set(keys.filter((key, i) => keys.indexOf(key) !== i))];
        expect(
          dupes,
          `two rows share one snapshot identity — a quota/closed double count:\n  ${dupes.join('\n  ')}`,
        ).toEqual([]);
      });

      it('gives the current quarter one row per ACTIVE deal owner and no other', () => {
        const current = rows.filter(inCurrentQuarter);
        for (const [who, id] of [['the admin', w.adminId], ['rep two', w.repTwo.id]] as const) {
          expect(current.filter((r) => r.owner_id === id), `${who} has no single current-quarter row`).toHaveLength(1);
        }
        expect(current.filter((r) => r.owner_id === w.idle.id), 'a person with no deals got a row').toHaveLength(0);
        expect(
          current.map((r) => r.seed_key).filter(Boolean),
          'a seeded row opened in the window forecast_snapshot writes',
        ).toEqual([]);
      });

      it('leaves the current-quarter numbers the sweep computed, not seeded ones', () => {
        // The other half of the warm-boot story: the replay must not stomp a
        // runtime writer's row. It cannot, because the seeds no longer declare
        // one in this window — this asserts the outcome rather than the reason.
        const two = rows.find((r) => inCurrentQuarter(r) && r.owner_id === w.repTwo.id)!;
        expect(two, 'no current-quarter row for rep two').toBeTruthy();
        expect(Number(two.commit_amount)).toBe(90_000);
        expect(Number(two.pipeline_amount)).toBe(90_000);
        expect(two.period_start).toBe(isoUtc(qStart));
        expect(two.period_end).toBe(isoUtc(qEnd));
        const mine = rows.find((r) => inCurrentQuarter(r) && r.owner_id === w.adminId)!;
        expect(mine.seed_key ?? null, 'the admin’s current-quarter row is a seeded one').toBeNull();
        expect(mine.source).toBe('scheduled');
      });

      it('claims every settled seed row for the first user', () => {
        const seeded = rows.filter((r) => r.seed_key != null);
        expect(seeded, 'the seed replay inserted duplicates').toHaveLength(seedRecords.length);
        expect(seeded.map((r) => String(r.owner_id))).toEqual(seedRecords.map(() => w.adminId));
      });
    });
  }

  it('reproduces the phantom when a current-quarter row IS seeded', async () => {
    // Non-vacuity, and the reported mechanism end to end. Restore the row the
    // seeds used to ship — written as the seed loader writes it, ownerless —
    // and run the sweep before the claim: the sweep's owner-scoped lookup
    // cannot match an ownerless row, so it opens a second one; the claim then
    // stamps the first, leaving TWO rows for ONE owner in ONE window.
    // Predicted direction, and the one that makes the guards above
    // meaningful — the duplicate is what they would report.
    const w = await bootWorld();
    await w.stack.seed('crm_forecast', [{
      seed_key: 'demo_quarter_current', owner_id: null,
      period: 'quarter', period_start: isoUtc(qStart), period_end: isoUtc(qEnd),
      snapshot_date: today, source: 'scheduled', quota: 1_500_000, closed_amount: 820_000,
    }]);
    await w.steps.forecast_snapshot!();
    await w.steps.claim!();

    const adminRows = async () =>
      (await w.stack.rows('crm_forecast', { owner_id: w.adminId })).filter(inCurrentQuarter);
    expect(await adminRows(), 'the sweep adopted the ownerless row instead of duplicating it').toHaveLength(2);
    // And it is terminal: the sweep's findOne refreshes whichever row it
    // reaches first and never sees, let alone merges, the other.
    await w.steps.forecast_snapshot!();
    await w.steps.claim!();
    expect(await adminRows(), 'a later pass healed the duplicate — then the seed guard would be optional').toHaveLength(2);
  }, 120_000);
});

/**
 * Regression guard — a bare string condition inside a `loop` body WAS inert.
 *
 * `AutomationEngine.registerFlow` runs `applyConversionsToFlow`, which rewrites
 * a bare string `condition` into a `{ dialect: 'cel', source }` envelope. That
 * pass only walks a flow's TOP-LEVEL `edges`; it does not recurse into the
 * structured control-flow regions introduced by ADR-0031 (`loop.config.body`).
 *
 * A condition left as a bare string in there falls through to the engine's
 * legacy template path, which substitutes `{var}` templates (there are none)
 * and then STRING-compares the leftover expression text:
 *
 *     'existingStallTask == null'  →  'existingStallTask' === 'null'  →  false
 *
 * The gate never opens, and the failure is silent: the sweep runs, selects the
 * right records, and does nothing. `opportunity_stagnation`, `contract_renewal`
 * and `campaign_enrollment` all shipped in that state.
 *
 * The fix was to author nested conditions as explicit envelopes.
 *
 * ─── The platform closed the asymmetry in 17.0.0-rc.2 (#4336) ────────────
 *
 * `evaluateCondition` now decides its dialect from the SOURCE rather than from
 * the caller, so a bare string is parsed as CEL wherever it appears — inside a
 * loop body included — and the two forms agree. The first test below used to
 * assert the gap and was written to fail when it closed; it now pins the fixed
 * behaviour, which is the deliberate review that assertion existed to force.
 *
 * The explicit envelopes STAY. They are the authored form in every flow here,
 * they say which dialect the predicate is in at the point a reader needs to
 * know, and they are what makes these conditions correct on any runtime that
 * still carries the old path. The second test keeps them in place, so a bare
 * string reintroduced inside a loop body is still a failure here rather than a
 * silent dependency on one specific engine version.
 */
describe('loop-nested conditions must be explicit CEL envelopes', () => {
  it('the engine evaluates a bare string and an envelope identically', () => {
    // The booted stack's own automation service — a kernel service the handle
    // does not front — asked directly.
    const automation = verify.kernel.getService<{
      evaluateCondition(c: unknown, v: Map<string, unknown>): boolean;
    }>('automation');
    const evaluate = (condition: unknown) =>
      automation.evaluateCondition(condition, new Map([['existingStallTask', null]]));

    // Both forms open the gate as of 17.0.0-rc.2 (#4336). If the bare-string
    // case ever flips back to `false`, the legacy string-compare path has
    // returned and the envelopes below are load-bearing again.
    expect(evaluate('existingStallTask == null'), 'bare string, CEL-parsed').toBe(true);
    expect(
      evaluate({ dialect: 'cel', source: 'existingStallTask == null' }),
      'explicit CEL envelope',
    ).toBe(true);
  });

  it('no flow carries a bare string condition inside a loop body', () => {
    /** Every condition reachable inside a `loop` node's body, with its path. */
    const nestedConditions: Array<{ flow: string; where: string; condition: unknown }> = [];

    const visitBody = (flowName: string, loopId: string, body: Rec | undefined) => {
      if (!body) return;
      for (const node of (body.nodes ?? []) as Rec[]) {
        if (node?.config?.condition !== undefined) {
          nestedConditions.push({
            flow: flowName,
            where: `${loopId}/node:${node.id}`,
            condition: node.config.condition,
          });
        }
        // Any region nested inside this one is subject to the same rule: a loop
        // in a loop, and — since `src/flows/_guarded-iteration.ts` — the
        // `try_catch` guard every loop body now opens with, whose `try` region
        // holds what used to sit here directly. `regionsOf` reads the
        // platform's own slot map, so a region type added later is descended
        // into without this walk being remembered.
        for (const nested of regionsOf(node)) {
          visitBody(flowName, `${loopId}/${node.id}`, nested as Rec);
        }
      }
      for (const edge of (body.edges ?? []) as Rec[]) {
        if (edge?.condition !== undefined) {
          nestedConditions.push({
            flow: flowName,
            where: `${loopId}/edge:${edge.id}`,
            condition: edge.condition,
          });
        }
      }
    };

    for (const flow of Object.values(allFlows) as Rec[]) {
      if (!flow || typeof flow !== 'object' || !Array.isArray(flow.nodes)) continue;
      for (const node of flow.nodes as Rec[]) {
        if (node?.type === 'loop') visitBody(flow.name, node.id, node.config?.body);
      }
    }

    // Guards the guard: if the walk finds nothing, it is asserting nothing.
    expect(nestedConditions.length, 'no loop-nested conditions found — the walk broke').toBeGreaterThan(0);

    const bare = nestedConditions
      .filter((c) => typeof c.condition === 'string')
      .map((c) => `${c.flow} ${c.where}: ${JSON.stringify(c.condition)}`);
    expect(
      bare,
      'bare string condition(s) inside a loop body — these never evaluate.\n' +
        "Wrap as { dialect: 'cel', source: '…' }:\n  " + bare.join('\n  '),
    ).toEqual([]);
  });
});
