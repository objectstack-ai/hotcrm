// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { CrmSeedData } from '../src/data/index';
import caseHooks from '../src/objects/case.hook';
import {
  makeHarness as makeHookHarness, makeCtx as makeHookCtx, hookNamed,
} from './helpers/hook-harness';
import { CampaignCompletionFlow } from '../src/flows/campaign-completion.flow';
import { CaseSlaMonitorFlow } from '../src/flows/case-sla-monitor.flow';
import { ContractExpirationFlow } from '../src/flows/contract-expiration.flow';
import { ContractRenewalFlow } from '../src/flows/contract-renewal.flow';
import { DemoBootstrapFlow } from '../src/flows/demo-bootstrap.flow';
import { ForecastSnapshotFlow } from '../src/flows/forecast-snapshot.flow';
import * as CrmObjects from '../src/objects';
import { MarketingUserProfile } from '../src/profiles/marketing-user.profile';
import { ServiceAgentProfile } from '../src/profiles/service-agent.profile';
import { OpportunityStagnationFlow } from '../src/flows/opportunity-stagnation.flow';
import { QuoteExpirationFlow } from '../src/flows/quote-expiration.flow';
import forecastDerive from '../src/objects/forecast.hook';
import { TaskDueReminderFlow } from '../src/flows/task-due-reminder.flow';
import * as allFlows from '../src/flows';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';
import { regionsOf } from './helpers/flow-regions';

/**
 * Runtime tests for the SCHEDULED sweeps.
 *
 * Scheduled flows were previously untested at runtime, and they are the
 * hardest flows to get right for exactly the reason that makes them hard to
 * test: they select their own work. A sweep whose filter matches nothing is
 * indistinguishable from a sweep with nothing to do — it runs, logs nothing,
 * and stays green forever. Every case below therefore seeds BOTH rows that must
 * be picked up and rows that must be left alone, so a filter that silently
 * matches everything (or nothing) fails.
 *
 * These run the real `AutomationEngine` over the in-memory data engine in
 * `test/helpers/flow-harness.ts`, which — unlike the equality-only engines the
 * older flow tests carried — implements `$lt` / `$lte` / `$nin` / `$in`.
 */

const iso = (daysFromNow: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
};
const day = (daysFromNow: number): string => iso(daysFromNow).slice(0, 10);

describe('case_sla_monitor — hourly breach sweep', () => {
  const seedCases = (): Rec[] => [
    // Breached and still open — MUST be flagged.
    {
      id: 'c_breached', case_number: 'CASE-1', status: 'working', priority: 'critical',
      is_sla_violated: false, sla_due_date: iso(-2), owner_id: 'rep1',
    },
    // Due in the future — must be left alone.
    {
      id: 'c_future', case_number: 'CASE-2', status: 'working', priority: 'high',
      is_sla_violated: false, sla_due_date: iso(+2), owner_id: 'rep1',
    },
    // Past due but already resolved: work is finished, so this is NOT a breach.
    {
      id: 'c_resolved', case_number: 'CASE-3', status: 'resolved', priority: 'high',
      is_sla_violated: false, sla_due_date: iso(-5), owner_id: 'rep1',
    },
    // Past due but closed — likewise excluded.
    {
      id: 'c_closed', case_number: 'CASE-4', status: 'closed', priority: 'low',
      is_sla_violated: false, sla_due_date: iso(-9), owner_id: 'rep1',
    },
    // Already flagged — must not be re-processed (or re-notified).
    {
      id: 'c_already', case_number: 'CASE-5', status: 'escalated', priority: 'critical',
      is_sla_violated: true, sla_due_date: iso(-3), owner_id: 'rep1',
    },
  ];

  const runSweep = async () => {
    const h = makeFlowHarness({ case_sla_monitor: CaseSlaMonitorFlow }, { crm_case: seedCases() });
    await h.run('case_sla_monitor', {}, { event: 'schedule' });
    return h;
  };

  it('flags and escalates exactly the open, past-due, not-yet-flagged cases', async () => {
    const h = await runSweep();
    const byId = Object.fromEntries(h.store.crm_case.map((c) => [c.id, c]));

    const breached = byId.c_breached;
    expect(breached.is_sla_violated).toBe(true);
    expect(breached.is_escalated).toBe(true);
    expect(breached.status).toBe('escalated');
    // `escalation_reason` must accompany `is_escalated` or the object's
    // `escalation_reason_required` validation (severity: error) rejects the
    // whole write and the sweep becomes a silent no-op.
    expect(breached.escalation_reason, 'missing escalation_reason ⇒ write rejected').toBeTruthy();
    expect(breached.escalated_date).toBeTruthy();
  });

  it('leaves future-due, resolved and closed cases untouched', async () => {
    const h = await runSweep();
    const byId = Object.fromEntries(h.store.crm_case.map((c) => [c.id, c]));

    for (const id of ['c_future', 'c_resolved', 'c_closed']) {
      expect(byId[id].is_sla_violated, `${id} was wrongly flagged`).toBe(false);
      expect(byId[id].is_escalated, `${id} was wrongly escalated`).toBeFalsy();
    }
    // Specifically: a resolved case has met its SLA. The filter used to read
    // `is_closed: false`, which only flips on `closed`, so resolved cases were
    // dragged back to `escalated`.
    expect(byId.c_resolved.status).toBe('resolved');
  });

  it('does not re-process a case already marked as violated', async () => {
    const h = await runSweep();
    const already = h.store.crm_case.find((c) => c.id === 'c_already')!;
    expect(already.escalation_reason, 'already-flagged case was re-written').toBeNull();
  });

  it('alerts the case owner, and only for the newly-breached case', async () => {
    const h = await runSweep();
    expect(h.notifications.length, 'expected exactly one alert').toBe(1);

    const [alert] = h.notifications;
    const recipients = JSON.stringify(alert.to);
    expect(recipients).toContain('rep1');
    // `{currentCase.owner_id.manager}` dot-walks a lookup, which flow templates
    // interpolate as the literal string "undefined" — a silently undeliverable
    // notification. Guard against that shape reappearing anywhere in the payload.
    expect(JSON.stringify(alert), 'a template dot-walked a lookup').not.toContain('undefined');
    expect(alert.severity).toBe('critical');
    expect(String(alert.title)).toContain('CASE-1');
  });

  it('is a clean no-op when nothing has breached', async () => {
    const h = makeFlowHarness(
      { case_sla_monitor: CaseSlaMonitorFlow },
      {
        crm_case: [{
          id: 'c1', case_number: 'CASE-9', status: 'working',
          is_sla_violated: false, sla_due_date: iso(+5), owner_id: 'rep1',
        }],
      },
    );
    await h.run('case_sla_monitor', {}, { event: 'schedule' });
    expect(h.store.crm_case[0].is_sla_violated).toBe(false);
    expect(h.notifications).toHaveLength(0);
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
   * shipped `case_sla_defaults` handler stamps the deadline, and the shipped
   * `case_sla_monitor` flow sweeps it.
   *
   * The clock is moved back to the moment of creation so the matrix's own
   * offset is what puts the case past due — no hand-written date anywhere in
   * this test, which is what keeps it honest if a cell ever changes.
   */
  const NON_CRITICAL: Array<{ priority: string; tier: string; hours: number }> = [
    { priority: 'high', tier: 'strategic', hours: 6 },
    { priority: 'high', tier: 'enterprise', hours: 8 },
    { priority: 'medium', tier: 'mid_market', hours: 48 },
    { priority: 'low', tier: 'smb', hours: 168 },
  ];

  const slaHook = hookNamed(caseHooks as Record<string, any>[], 'case_sla_defaults');

  /** Stamp a case as if it had been created `hours + 1` hours ago. */
  const stampInThePast = async (priority: string, tier: string, hours: number): Promise<string> => {
    const harness = makeHookHarness({ crm_account: [{ id: 'acct_1', tier }] });
    const input: Rec = { priority, crm_account: 'acct_1', status: 'working' };
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(Date.now() - (hours + 1) * 3_600_000));
      await slaHook.handler(
        makeHookCtx({ event: 'beforeInsert', input, user: { id: 'rep1' }, api: harness.api }),
      );
    } finally {
      vi.useRealTimers();
    }
    return input.sla_due_date as string;
  };

  it.each(NON_CRITICAL)(
    'flags and escalates a breached $priority case on a $tier account',
    async ({ priority, tier, hours }) => {
      const due = await stampInThePast(priority, tier, hours);
      expect(due, `${priority} got no SLA clock at all`).toBeTruthy();
      expect(new Date(due).getTime(), 'the matrix offset should put this case past due')
        .toBeLessThan(Date.now());

      const h = makeFlowHarness(
        { case_sla_monitor: CaseSlaMonitorFlow },
        {
          crm_case: [{
            id: 'c_1', case_number: 'CASE-595', status: 'working', priority,
            is_sla_violated: false, sla_due_date: due, owner_id: 'rep1',
          }],
        },
      );
      await h.run('case_sla_monitor', {}, { event: 'schedule' });

      const swept = h.store.crm_case[0];
      expect(swept.is_sla_violated, `a breached ${priority} case was not flagged`).toBe(true);
      expect(swept.is_escalated).toBe(true);
      expect(swept.status).toBe('escalated');
      expect(swept.escalation_reason, 'missing reason ⇒ the write is rejected').toBeTruthy();
      expect(h.notifications, 'the owner must be alerted').toHaveLength(1);
    },
  );

  it('still leaves a non-critical case alone while it is inside its window', async () => {
    // The other half of the guard: a High case that has NOT breached must not
    // be swept just because it finally has a due date.
    const harness = makeHookHarness({ crm_account: [{ id: 'acct_1', tier: 'enterprise' }] });
    const input: Rec = { priority: 'high', crm_account: 'acct_1', status: 'working' };
    await slaHook.handler(
      makeHookCtx({ event: 'beforeInsert', input, user: { id: 'rep1' }, api: harness.api }),
    );

    const h = makeFlowHarness(
      { case_sla_monitor: CaseSlaMonitorFlow },
      {
        crm_case: [{
          id: 'c_1', case_number: 'CASE-596', status: 'working', priority: 'high',
          is_sla_violated: false, sla_due_date: input.sla_due_date as string, owner_id: 'rep1',
        }],
      },
    );
    await h.run('case_sla_monitor', {}, { event: 'schedule' });
    expect(h.store.crm_case[0].is_sla_violated).toBe(false);
    expect(h.notifications).toHaveLength(0);
  });
});

describe('quote_expiration — daily auto-expiry', () => {
  const run = async () => {
    const h = makeFlowHarness({ quote_expiration: QuoteExpirationFlow }, {
      crm_quote: [
        { id: 'q_past', status: 'presented', expiration_date: day(-1) },   // expire
        { id: 'q_draft_past', status: 'draft', expiration_date: day(-30) }, // expire
        { id: 'q_future', status: 'presented', expiration_date: day(+7) },  // keep
        { id: 'q_accepted', status: 'accepted', expiration_date: day(-9) }, // settled
        { id: 'q_rejected', status: 'rejected', expiration_date: day(-9) }, // settled
        { id: 'q_expired', status: 'expired', expiration_date: day(-9) },   // already
      ],
    });
    await h.run('quote_expiration', {}, { event: 'schedule' });
    return Object.fromEntries(h.store.crm_quote.map((q) => [q.id, q]));
  };

  it('expires open quotes past their expiration_date', async () => {
    const byId = await run();
    expect(byId.q_past.status).toBe('expired');
    expect(byId.q_draft_past.status).toBe('expired');
  });

  it('leaves future-dated and already-settled quotes alone', async () => {
    const byId = await run();
    expect(byId.q_future.status).toBe('presented');
    expect(byId.q_accepted.status).toBe('accepted');
    expect(byId.q_rejected.status).toBe('rejected');
    expect(byId.q_expired.status).toBe('expired');
  });
});

describe('contract_expiration — daily auto-expiry', () => {
  const run = async () => {
    const h = makeFlowHarness({ contract_expiration: ContractExpirationFlow }, {
      crm_contract: [
        { id: 'k_past', contract_number: 'CTR-1', status: 'activated', end_date: day(-1), owner_id: 'rep1' },
        { id: 'k_future', contract_number: 'CTR-2', status: 'activated', end_date: day(+30), owner_id: 'rep1' },
        { id: 'k_draft', contract_number: 'CTR-3', status: 'draft', end_date: day(-30), owner_id: 'rep1' },
        { id: 'k_expired', contract_number: 'CTR-4', status: 'expired', end_date: day(-60), owner_id: 'rep1' },
      ],
    });
    await h.run('contract_expiration', {}, { event: 'schedule' });
    return h;
  };

  it('expires only activated contracts past their end_date', async () => {
    const h = await run();
    const byId = Object.fromEntries(h.store.crm_contract.map((k) => [k.id, k]));
    expect(byId.k_past.status).toBe('expired');
    expect(byId.k_future.status).toBe('activated');
    expect(byId.k_draft.status, 'a draft contract must not be auto-expired').toBe('draft');
  });

  it('notifies the owner once, with a resolved contract number', async () => {
    const h = await run();
    expect(h.notifications).toHaveLength(1);
    const [alert] = h.notifications;
    expect(alert.to).toContain('rep1');
    expect(String(alert.title)).toContain('CTR-1');
    expect(JSON.stringify(alert), 'a template failed to interpolate').not.toContain('undefined');
  });
});

describe('campaign_completion — daily auto-completion', () => {
  it('completes ended in_progress campaigns and leaves the rest', async () => {
    const h = makeFlowHarness({ campaign_completion: CampaignCompletionFlow }, {
      crm_campaign: [
        { id: 'cmp_ended', status: 'in_progress', end_date: day(-1) },
        { id: 'cmp_running', status: 'in_progress', end_date: day(+10) },
        { id: 'cmp_planning', status: 'planning', end_date: day(-10) },
        { id: 'cmp_done', status: 'completed', end_date: day(-10) },
      ],
    });
    await h.run('campaign_completion', {}, { event: 'schedule' });

    const byId = Object.fromEntries(h.store.crm_campaign.map((c) => [c.id, c]));
    expect(byId.cmp_ended.status).toBe('completed');
    expect(byId.cmp_running.status).toBe('in_progress');
    // A campaign still in planning never ran, so "ended" does not apply.
    expect(byId.cmp_planning.status).toBe('planning');
    expect(byId.cmp_done.status).toBe('completed');
  });
});

describe('task_due_reminder — hourly reminder sweep', () => {
  const run = async () => {
    const h = makeFlowHarness({ task_due_reminder: TaskDueReminderFlow }, {
      crm_task: [
        { id: 't_due', subject: 'Call Acme', owner_id: 'rep1', is_completed: false, reminder_date: iso(-1) },
        { id: 't_future', subject: 'Later', owner_id: 'rep1', is_completed: false, reminder_date: iso(+3) },
        { id: 't_done', subject: 'Done', owner_id: 'rep1', is_completed: true, reminder_date: iso(-5) },
        { id: 't_none', subject: 'No reminder', owner_id: 'rep1', is_completed: false, reminder_date: null },
      ],
    });
    await h.run('task_due_reminder', {}, { event: 'schedule' });
    return h;
  };

  it('notifies the owner of a task whose reminder time has arrived', async () => {
    const h = await run();
    expect(h.notifications).toHaveLength(1);
    const [alert] = h.notifications;
    expect(alert.to).toContain('rep1');
    expect(String(alert.title)).toContain('Call Acme');
    expect(alert.severity).toBe('warning');
  });

  it('clears reminder_date so the same task is never alerted twice', async () => {
    const h = await run();
    const byId = Object.fromEntries(h.store.crm_task.map((t) => [t.id, t]));
    expect(byId.t_due.reminder_sent).toBe(true);
    // Clearing the date is what de-dups: the row stops matching `$lte` next tick.
    expect(byId.t_due.reminder_date).toBeNull();
  });

  it('is idempotent across consecutive ticks', async () => {
    const h = makeFlowHarness({ task_due_reminder: TaskDueReminderFlow }, {
      crm_task: [{ id: 't_due', subject: 'Call Acme', owner_id: 'rep1', is_completed: false, reminder_date: iso(-1) }],
    });
    await h.run('task_due_reminder', {}, { event: 'schedule' });
    await h.run('task_due_reminder', {}, { event: 'schedule' });
    expect(h.notifications, 'the same task was alerted twice').toHaveLength(1);
  });

  it('skips future, completed and reminder-less tasks', async () => {
    const h = await run();
    const byId = Object.fromEntries(h.store.crm_task.map((t) => [t.id, t]));
    for (const id of ['t_future', 't_done', 't_none']) {
      expect(byId[id].reminder_sent, `${id} was wrongly reminded`).toBeFalsy();
    }
  });
});

describe('opportunity_stagnation — daily stalled-deal nudge', () => {
  // The sweep predicates on the STORED `stage_entry_date`, not on the
  // `days_in_stage` FORMULA — a formula is evaluated after the query, so it
  // cannot be a filter key (#489). `stage_entry_date < TODAY() - 14` is the
  // same test, resolved by the flow template engine.
  const seedOpps = (): Rec[] => [
    { id: 'o_stalled', name: 'Stalled Deal', stage: 'proposal', stage_entry_date: day(-30), owner_id: 'rep1' },
    { id: 'o_fresh', name: 'Fresh Deal', stage: 'proposal', stage_entry_date: day(-3), owner_id: 'rep1' },
    // Exactly at the threshold: the filter is `$lt`, so a deal that entered its
    // stage exactly 14 days ago must NOT fire.
    { id: 'o_boundary', name: 'Boundary Deal', stage: 'proposal', stage_entry_date: day(-14), owner_id: 'rep1' },
    { id: 'o_won', name: 'Won Deal', stage: 'closed_won', stage_entry_date: day(-99), owner_id: 'rep1' },
    { id: 'o_lost', name: 'Lost Deal', stage: 'closed_lost', stage_entry_date: day(-99), owner_id: 'rep1' },
    // A row with a null clock does not satisfy `$lt` and is skipped.
    { id: 'o_nullclock', name: 'No Clock', stage: 'proposal', stage_entry_date: null, owner_id: 'rep1' },
  ];

  const run = async () => {
    const h = makeFlowHarness(
      { opportunity_stagnation: OpportunityStagnationFlow },
      { crm_opportunity: seedOpps(), crm_task: [] },
    );
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });
    return h;
  };

  it('nudges exactly the open deals past the 14-day threshold', async () => {
    const h = await run();

    expect(h.store.crm_task).toHaveLength(1);
    const [task] = h.store.crm_task;
    expect(task.subject).toBe('Advance stalled deal: Stalled Deal');
    expect(task.related_to_opportunity).toBe('o_stalled');
    expect(task.related_to_type).toBe('crm_opportunity');
    expect(task.owner_id).toBe('rep1');
    expect(task.priority).toBe('high');
    expect(task.status).toBe('not_started');

    expect(h.notifications).toHaveLength(1);
    expect(h.notifications[0].to).toContain('rep1');
    expect(String(h.notifications[0].title)).toContain('Stalled Deal');
    expect(
      JSON.stringify(h.notifications[0]),
      'a template dot-walked a lookup',
    ).not.toContain('undefined');
  });

  it('skips fresh, boundary, closed and null-clock deals', async () => {
    const h = await run();
    const touched = h.store.crm_task.map((t) => t.related_to_opportunity);
    for (const id of ['o_fresh', 'o_boundary', 'o_won', 'o_lost', 'o_nullclock']) {
      expect(touched, `${id} should not have been nudged`).not.toContain(id);
    }
  });

  it('is idempotent: a second sweep does not pile up duplicate nudges', async () => {
    // Without the "already nudged?" gate the daily sweep re-notified and
    // re-created an identical task every morning for as long as the deal stayed
    // stalled — an unbounded duplicate pile-up.
    const h = makeFlowHarness(
      { opportunity_stagnation: OpportunityStagnationFlow },
      { crm_opportunity: seedOpps(), crm_task: [] },
    );
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });

    expect(h.store.crm_task, 'duplicate stall task on the second sweep').toHaveLength(1);
    expect(h.notifications, 'duplicate nudge on the second sweep').toHaveLength(1);
  });

  it('re-arms once the previous stall task is completed', async () => {
    const h = makeFlowHarness(
      { opportunity_stagnation: OpportunityStagnationFlow },
      {
        crm_opportunity: seedOpps(),
        crm_task: [{
          id: 't_done', related_to_opportunity: 'o_stalled',
          subject: 'Advance stalled deal: Stalled Deal', status: 'completed',
        }],
      },
    );
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });
    expect(h.store.crm_task.filter((t) => t.status === 'not_started')).toHaveLength(1);
  });
});

describe('contract_renewal — daily notice-window sweep', () => {
  const contract = (over: Rec): Rec => ({
    id: 'k1', contract_number: 'CTR-1', status: 'activated', crm_account: 'acc1',
    owner_id: 'rep1', contract_value: 90_000, auto_renewal: false, renewal_notice_days: 30,
    end_date: day(+20), ...over,
  });

  const run = async (contracts: Rec[], seed: Rec = {}) => {
    const h = makeFlowHarness({ contract_renewal: ContractRenewalFlow }, {
      crm_contract: contracts, crm_task: [], crm_opportunity: [], ...seed,
    });
    await h.run('contract_renewal', {}, { event: 'schedule' });
    return h;
  };

  it('pre-filters to activated contracts ending within the next 120 days', async () => {
    // The 120-day span must cover the LARGEST renewal_notice_days in use (seeds
    // go to 90). A narrower pre-filter silently truncates the longest notice
    // periods, so pin the window itself.
    const h = await run([contract({})]);
    const q = h.queries.find((x) => x.object === 'crm_contract');
    expect(q, 'the sweep issued no contract query').toBeTruthy();
    expect(q!.where.status).toBe('activated');
    expect(q!.where.end_date).toMatchObject({ $gte: expect.any(String), $lte: expect.any(String) });

    const span =
      (Date.parse(`${String(q!.where.end_date.$lte).slice(0, 10)}T00:00:00Z`) -
        Date.parse(`${String(q!.where.end_date.$gte).slice(0, 10)}T00:00:00Z`)) / 86_400_000;
    expect(span, 'pre-filter must span 120 days').toBe(120);
  });

  it('selects nothing outside the pre-filter window', async () => {
    const h = await run([
      contract({ id: 'k_far', end_date: day(+200) }),
      contract({ id: 'k_past', end_date: day(-5) }),
      contract({ id: 'k_draft', status: 'draft' }),
    ]);
    expect(h.store.crm_task).toHaveLength(0);
    expect(h.notifications).toHaveLength(0);
  });

  it('books a renewal task and notifies the owner inside the notice window', async () => {
    const h = await run([contract({ end_date: day(+20), renewal_notice_days: 30 })]);

    expect(h.store.crm_task).toHaveLength(1);
    const [task] = h.store.crm_task;
    expect(task.subject).toBe('Renewal due: contract CTR-1');
    expect(task.related_to_account).toBe('acc1');
    expect(task.owner_id).toBe('rep1');
    expect(task.priority).toBe('high');

    expect(h.notifications).toHaveLength(1);
    expect(h.notifications[0].to).toContain('rep1');
    expect(String(h.notifications[0].title)).toContain('CTR-1');
  });

  it('honours each contract’s own renewal_notice_days, not a shared constant', async () => {
    // The pre-filter spans 120 days precisely so a 90-day notice period is not
    // silently truncated; the per-record decision applies the real window.
    const h = await run([
      contract({ id: 'k_early', contract_number: 'CTR-90', end_date: day(+80), renewal_notice_days: 90 }),
      contract({ id: 'k_late', contract_number: 'CTR-30', end_date: day(+80), renewal_notice_days: 30 }),
    ]);
    const subjects = h.store.crm_task.map((t) => t.subject);
    expect(subjects, 'the 90-day-notice contract is in window').toContain('Renewal due: contract CTR-90');
    expect(subjects, 'the 30-day-notice contract is still 80 days out').not.toContain('Renewal due: contract CTR-30');
  });

  it('opens a pre-filled renewal opportunity only when auto_renewal is on', async () => {
    const withAuto = await run([contract({ auto_renewal: true })]);
    expect(withAuto.store.crm_opportunity).toHaveLength(1);
    const [opp] = withAuto.store.crm_opportunity;
    expect(opp.name).toBe('Renewal — CTR-1');
    expect(opp.crm_account).toBe('acc1');
    expect(opp.type).toBe('existing_renewal');
    expect(Number(opp.amount)).toBe(90_000);
    expect(opp.stage).toBe('proposal');

    const withoutAuto = await run([contract({ auto_renewal: false })]);
    expect(withoutAuto.store.crm_opportunity).toHaveLength(0);
  });

  it('never opens a second renewal deal while one is still in flight', async () => {
    const h = await run([contract({ auto_renewal: true })], {
      crm_opportunity: [{
        id: 'o_open', crm_account: 'acc1', type: 'existing_renewal', stage: 'negotiation',
      }],
    });
    expect(h.store.crm_opportunity, 'duplicate renewal deal opened').toHaveLength(1);
  });

  it('is idempotent across repeated sweeps within the same window', async () => {
    const h = makeFlowHarness({ contract_renewal: ContractRenewalFlow }, {
      crm_contract: [contract({ auto_renewal: true })], crm_task: [], crm_opportunity: [],
    });
    await h.run('contract_renewal', {}, { event: 'schedule' });
    await h.run('contract_renewal', {}, { event: 'schedule' });
    expect(h.store.crm_task, 'duplicate renewal task').toHaveLength(1);
    expect(h.store.crm_opportunity, 'duplicate renewal deal').toHaveLength(1);
    expect(h.notifications, 'duplicate renewal notification').toHaveLength(1);
  });

  it('ignores contracts that are not activated', async () => {
    const h = await run([
      contract({ status: 'draft' }),
      contract({ id: 'k2', status: 'expired' }),
    ]);
    expect(h.store.crm_task).toHaveLength(0);
    expect(h.notifications).toHaveLength(0);
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

  const users = (): Rec[] => [
    { id: 'rep1', name: 'Rep One' },
    { id: 'rep2', name: 'Rep Two' },
    { id: 'rep3', name: 'No Deals At All' },
    { id: 'rep4', name: 'Only Lost Deals' },
  ];

  // Both rows that MUST be counted and rows that must be left out — a sweep
  // whose window or bucket filter silently matches everything looks identical
  // to a correct one otherwise.
  const opps = (): Rec[] => [
    // rep1 — one deal per bucket, plus two that must not count.
    { id: 'o1', owner_id: 'rep1', stage: 'qualification',  forecast_category: 'pipeline',  amount: 100_000, close_date: inPeriod },
    { id: 'o2', owner_id: 'rep1', stage: 'needs_analysis', forecast_category: 'best_case', amount: 50_000,  close_date: inPeriod },
    { id: 'o3', owner_id: 'rep1', stage: 'negotiation',    forecast_category: 'commit',    amount: 30_000,  close_date: inPeriod },
    { id: 'o4', owner_id: 'rep1', stage: 'closed_won',     forecast_category: 'closed',    amount: 70_000,  close_date: inPeriod },
    // Closes in the PREVIOUS quarter — outside every bucket, but still makes
    // rep1 an active owner.
    { id: 'o5', owner_id: 'rep1', stage: 'proposal',       forecast_category: 'commit',    amount: 999_999, close_date: beforePeriod },
    // Lost deals are neither open nor won.
    { id: 'o6', owner_id: 'rep1', stage: 'closed_lost',    forecast_category: 'omitted',   amount: 12_345,  close_date: inPeriod },
    // rep2 — the second amount arrives as a STRING, the shape a currency
    // column takes coming back from some drivers. Without the `* 1` coercion
    // in the accumulator the template CONCATENATES and pipeline reads
    // "020000" + "25000" instead of 45000.
    { id: 'o7', owner_id: 'rep2', stage: 'proposal',       forecast_category: 'commit',    amount: 20_000,  close_date: inPeriod },
    { id: 'o8', owner_id: 'rep2', stage: 'qualification',  forecast_category: 'pipeline',  amount: '25000', close_date: inPeriod },
    // rep4 owns nothing but a lost deal — not a forecast owner.
    { id: 'o9', owner_id: 'rep4', stage: 'closed_lost',    forecast_category: 'omitted',   amount: 88_000,  close_date: inPeriod },
  ];

  const harness = (forecasts: Rec[] = []) =>
    makeFlowHarness(
      { forecast_snapshot: ForecastSnapshotFlow },
      {
        sys_user: users(),
        crm_opportunity: opps(),
        crm_forecast: forecasts,
      },
      { hooks: [forecastDerive] },
    );

  const run = async (forecasts: Rec[] = []) => {
    const h = harness(forecasts);
    await h.run('forecast_snapshot', {}, { event: 'schedule' });
    return h;
  };

  const byOwner = (h: ReturnType<typeof harness>) =>
    Object.fromEntries(h.store.crm_forecast.map((f) => [f.owner_id, f]));

  it('opens a current-period row for every active opportunity owner, and only for them', async () => {
    const h = await run();

    expect(h.store.crm_forecast).toHaveLength(2);
    const owners = h.store.crm_forecast.map((f) => f.owner_id).sort();
    expect(owners).toEqual(['rep1', 'rep2']);
    // A user with no opportunities at all, and one whose only deal is lost,
    // must not collect an empty snapshot row.
    expect(owners, 'rep3 owns nothing').not.toContain('rep3');
    expect(owners, 'rep4 owns only a lost deal').not.toContain('rep4');
  });

  it('lands on a calendar-true quarter, derived by the hook rather than the flow', async () => {
    const h = await run();
    const snap = byOwner(h).rep1;

    expect(snap.period).toBe('quarter');
    // The invariant #530 pinned for the seeds now also holds for every
    // runtime snapshot: exact boundaries, and the label dialect the hook and
    // the seeds both speak.
    expect(snap.period_start).toBe(isoUtc(qStart));
    expect(snap.period_end).toBe(isoUtc(qEnd));
    expect(snap.period_label).toBe(quarterLabel);
    expect(snap.snapshot_date).toBe(isoUtc(nowUtc));
    expect(snap.source).toBe('scheduled');
  });

  it('sums the cumulative buckets from forecast_category', async () => {
    const h = await run();
    const snap = byOwner(h).rep1;

    // pipeline = every open deal in the window: 100k + 50k + 30k.
    expect(Number(snap.pipeline_amount)).toBe(180_000);
    // best case = best_case ∪ commit: 50k + 30k. A strict partition would
    // read 50k here, so this pins the ladder, not just "some sum happened".
    expect(Number(snap.best_case_amount)).toBe(80_000);
    expect(Number(snap.commit_amount)).toBe(30_000);
    expect(Number(snap.closed_amount)).toBe(70_000);
  });

  it('excludes deals closing outside the period, and lost deals', async () => {
    const h = await run();
    const snap = byOwner(h).rep1;
    // The 999,999 last-quarter deal and the 12,345 lost deal are the only way
    // any total could exceed these.
    for (const field of ['pipeline_amount', 'best_case_amount', 'commit_amount', 'closed_amount']) {
      expect(Number(snap[field]), `${field} swallowed an out-of-scope deal`).toBeLessThan(200_000);
    }
  });

  it('coerces a string amount instead of concatenating it', async () => {
    const h = await run();
    const snap = byOwner(h).rep2;
    expect(Number(snap.pipeline_amount)).toBe(45_000);
    expect(typeof snap.pipeline_amount, 'the accumulator produced a string').toBe('number');
  });

  it('is idempotent: a second sweep refreshes the row instead of duplicating it', async () => {
    const h = harness();
    await h.run('forecast_snapshot', {}, { event: 'schedule' });
    await h.run('forecast_snapshot', {}, { event: 'schedule' });

    expect(h.store.crm_forecast, 'the sweep inserted a second row for the same period').toHaveLength(2);
    const snap = byOwner(h).rep1;
    // Re-running must RECOMPUTE, not accumulate: a sweep that added to the
    // stored totals would read 360,000 here.
    expect(Number(snap.pipeline_amount)).toBe(180_000);
  });

  it('overwrites stale amounts when the pipeline moves', async () => {
    // A pre-existing row from an earlier night, carrying numbers that no
    // longer reflect the pipeline. The whole point of a nightly upsert is
    // that amounts can go DOWN, which a create-once writer never achieves.
    const h = await run([{
      id: 'f_rep1', owner_id: 'rep1', period: 'quarter',
      period_start: isoUtc(qStart), period_end: isoUtc(qEnd), period_label: quarterLabel,
      snapshot_date: beforePeriod, source: 'scheduled',
      pipeline_amount: 9_999_999, best_case_amount: 9_999_999,
      commit_amount: 9_999_999, closed_amount: 9_999_999,
    }]);

    expect(h.store.crm_forecast).toHaveLength(2);
    const snap = byOwner(h).rep1;
    expect(snap.id, 'the existing row was replaced rather than refreshed').toBe('f_rep1');
    expect(Number(snap.pipeline_amount)).toBe(180_000);
    expect(Number(snap.closed_amount)).toBe(70_000);
    expect(snap.snapshot_date).toBe(isoUtc(nowUtc));
  });

  it('never writes quota — the manually-maintained attainment denominator', async () => {
    const h = await run([{
      id: 'f_rep1', owner_id: 'rep1', period: 'quarter',
      period_start: isoUtc(qStart), period_end: isoUtc(qEnd), period_label: quarterLabel,
      snapshot_date: beforePeriod, source: 'scheduled', quota: 1_500_000,
    }]);

    const snap = byOwner(h).rep1;
    expect(Number(snap.quota), 'the sweep clobbered a hand-maintained quota').toBe(1_500_000);
    // And a freshly opened row leaves quota NULL rather than zeroing it — the
    // column the sweep never writes, as a materialising driver returns it — so
    // `attainment_pct` guards on quota > 0 instead of dividing by a lie.
    expect(byOwner(h).rep2.quota).toBeNull();
  });

  it('does not touch a snapshot belonging to a different period', async () => {
    const previousQuarterEnd = isoUtc(new Date(qStart.getTime() - 86_400_000));
    const h = await run([{
      id: 'f_old', owner_id: 'rep1', period: 'quarter',
      period_start: isoUtc(new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() - 3, 1))),
      period_end: previousQuarterEnd, period_label: 'previous',
      snapshot_date: previousQuarterEnd, source: 'scheduled', closed_amount: 1_485_000,
    }]);

    const old = h.store.crm_forecast.find((f) => f.id === 'f_old')!;
    expect(Number(old.closed_amount), 'a closed period was rewritten').toBe(1_485_000);
    // rep1 still gets a NEW row for the current quarter.
    expect(h.store.crm_forecast).toHaveLength(3);
  });

  it('is a clean no-op when nobody owns a live deal', async () => {
    const h = makeFlowHarness(
      { forecast_snapshot: ForecastSnapshotFlow },
      {
        sys_user: [{ id: 'rep9', name: 'Idle' }],
        crm_opportunity: [
          { id: 'ox', owner_id: 'rep9', stage: 'closed_lost', amount: 10, close_date: inPeriod },
        ],
        crm_forecast: [],
      },
      { hooks: [forecastDerive] },
    );
    await h.run('forecast_snapshot', {}, { event: 'schedule' });
    expect(h.store.crm_forecast).toHaveLength(0);
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
 * this file's job is to show that the invariant survives the two scheduled
 * sweeps in EITHER ORDER. That matters because the obvious alternative fix
 * (claim `crm_forecast` and let the sweep adopt the claimed row) holds only
 * while `demo_bootstrap` reaches the window before `forecast_snapshot` does,
 * and a duplicate opened by losing that race never heals. Both orders are run
 * below over the REAL seed records; the last case restores a current-quarter
 * seed row and reproduces the duplicate, so a green run here can never be green
 * for want of a mechanism.
 */
describe('re-seed × snapshot leaves one row per (owner, period, window) (#702)', () => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const nowUtc = new Date();
  const qStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), Math.floor(nowUtc.getUTCMonth() / 3) * 3, 1));
  const qEnd = new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() + 3, 0));
  const today = isoUtc(nowUtc);

  /** The forecast rows the seed loader actually ships, read from the app. */
  const seedRecords = ((CrmSeedData as unknown as Array<{ object: string; records: Rec[] }>)
    .find((d) => d.object === 'crm_forecast')?.records ?? []);

  const users = (): Rec[] => [
    // `get_user` takes an unordered first row; the demo's first user is the
    // dev admin, and `demo_bootstrap` claims every ownerless row for them.
    { id: 'usr_admin', name: 'Dev Admin' },
    { id: 'rep_two', name: 'Rep Two' },
    { id: 'rep_idle', name: 'No Deals At All' },
  ];

  /** Two active deal owners and one user the sweep must skip. */
  const opps = (): Rec[] => [
    { id: 'o1', owner_id: 'usr_admin', stage: 'negotiation', forecast_category: 'commit', amount: 200_000, close_date: isoUtc(qStart) },
    { id: 'o2', owner_id: 'rep_two', stage: 'proposal', forecast_category: 'commit', amount: 90_000, close_date: isoUtc(qStart) },
  ];

  /**
   * One seed-loader pass, faithful to what the loader does rather than to what
   * "re-seed" sounds like: `mode: 'upsert'` on `seed_key` resolves to
   * `engine.update({ ...record, id })` for a row that already exists — a
   * PARTIAL write over the columns the seed declares — and to an insert
   * otherwise (`@objectstack/metadata-protocol`, `SeedLoaderService.writeRecord`).
   *
   * Partial is the load-bearing word: the seeds declare no `owner_id`, so a
   * claimed owner SURVIVES a warm-boot replay. If it did not, the ownerless
   * state would return on every boot and no claim could ever settle it.
   *
   * A fresh insert lands with `owner_id: null`, not with the key absent — the
   * registry injects the column into every user-owned object, and the seed
   * write only skips the security plugin's insert-time STAMP. That distinction
   * decides whether `demo_bootstrap` can see the row at all: its filter is
   * `{ owner_id: null }`, and an absent key is not null. The row below states
   * neither `owner_id` nor `organization_id` any more; the harness store
   * materialises every declared column the way a driver does (#1458), so the
   * fixture no longer has to name the columns the filters happen to read.
   */
  const loadSeeds = (store: Record<string, Rec[]>) => {
    const rows = (store.crm_forecast ??= []);
    for (const rec of seedRecords) {
      const existing = rows.find((r) => r.seed_key === rec.seed_key);
      if (existing) Object.assign(existing, rec);
      else rows.push({ id: `seed_${String(rec.seed_key)}`, ...rec });
    }
  };

  const makeHarness = (forecasts: Rec[] = []) =>
    makeFlowHarness(
      { demo_bootstrap: DemoBootstrapFlow, forecast_snapshot: ForecastSnapshotFlow },
      {
        sys_user: users(),
        crm_opportunity: opps(),
        crm_forecast: forecasts,
      },
      { hooks: [forecastDerive] },
    );

  /** A cold boot and a warm one, both running the sweeps in `order`. */
  const boot = async (order: readonly string[]) => {
    const h = makeHarness();
    loadSeeds(h.store);
    for (const flow of order) await h.run(flow, {}, { event: 'schedule' });
    loadSeeds(h.store);
    for (const flow of order) await h.run(flow, {}, { event: 'schedule' });
    return h;
  };

  const inCurrentQuarter = (r: Rec) =>
    r.period === 'quarter' && String(r.period_start) <= today && today <= String(r.period_end);

  const ORDERINGS = [
    ['claim first — the ten-minute sweep reaches the window first', ['demo_bootstrap', 'forecast_snapshot']],
    ['sweep first — a boot minutes before 03:00', ['forecast_snapshot', 'demo_bootstrap']],
  ] as const;

  for (const [label, order] of ORDERINGS) {
    describe(label, () => {
      let h: Awaited<ReturnType<typeof boot>>;
      beforeAll(async () => { h = await boot(order); });

      it('leaves no forecast row owned by nobody', async () => {
        const ownerless = h.store.crm_forecast
          .filter((r) => r.owner_id == null)
          .map((r) => `${String(r.seed_key ?? r.id)} (${String(r.period)} ${String(r.period_start)})`);
        expect(
          ownerless,
          'these rows render with a blank Owner in every owner-grouped surface, and\n'
            + "under sharingModel:'private' are readable by no rep at all:\n  "
            + ownerless.join('\n  '),
        ).toEqual([]);
      });

      it('leaves exactly one row per (owner, period, period_start)', async () => {
        const keys = h.store.crm_forecast.map(
          (r) => `${String(r.owner_id)}|${String(r.period)}|${String(r.period_start)}`,
        );
        const dupes = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
        expect(
          dupes,
          `two rows share one snapshot identity — a quota/closed double count:\n  ${dupes.join('\n  ')}`,
        ).toEqual([]);
      });

      it('gives the current quarter one row per ACTIVE deal owner and no other', async () => {
        const current = h.store.crm_forecast.filter(inCurrentQuarter);
        expect(current.map((r) => String(r.owner_id)).sort()).toEqual(['rep_two', 'usr_admin']);
        expect(
          current.map((r) => r.seed_key).filter(Boolean),
          'a seeded row opened in the window forecast_snapshot writes',
        ).toEqual([]);
      });

      it('leaves the current-quarter numbers the sweep computed, not seeded ones', async () => {
        // The other half of the warm-boot story: the replay must not stomp a
        // runtime writer's row. It cannot, because the seeds no longer declare
        // one in this window — this asserts the outcome rather than the reason.
        const admin = h.store.crm_forecast.find((r) => inCurrentQuarter(r) && r.owner_id === 'usr_admin')!;
        expect(admin, 'no current-quarter row for the admin').toBeTruthy();
        expect(Number(admin.commit_amount)).toBe(200_000);
        expect(Number(admin.pipeline_amount)).toBe(200_000);
        expect(admin.period_start).toBe(isoUtc(qStart));
        expect(admin.period_end).toBe(isoUtc(qEnd));
      });

      it('claims every settled seed row for the first user', async () => {
        const seeded = h.store.crm_forecast.filter((r) => r.seed_key != null);
        expect(seeded, 'the seed replay inserted duplicates').toHaveLength(seedRecords.length);
        expect(seeded.map((r) => String(r.owner_id))).toEqual(seedRecords.map(() => 'usr_admin'));
      });
    });
  }

  it('reproduces the phantom when a current-quarter row IS seeded', async () => {
    // Non-vacuity, and the reported mechanism end to end. Restore the row the
    // seeds used to ship and run the sweep before the claim: the sweep's
    // owner-scoped lookup cannot match an ownerless row, so it opens a second
    // one; the claim then stamps the first, leaving TWO rows for ONE owner in
    // ONE window. Predicted direction, and the one that makes the guards above
    // meaningful — the duplicate is what they would report.
    const phantom: Rec = {
      id: 'seed_demo_quarter_current', seed_key: 'demo_quarter_current', owner_id: null,
      period: 'quarter', period_start: isoUtc(qStart), period_end: isoUtc(qEnd),
      snapshot_date: today, source: 'scheduled', quota: 1_500_000, closed_amount: 820_000,
    };
    const h = makeHarness([phantom]);
    await h.run('forecast_snapshot', {}, { event: 'schedule' });
    await h.run('demo_bootstrap', {}, { event: 'schedule' });

    const adminRows = h.store.crm_forecast.filter((r) => inCurrentQuarter(r) && r.owner_id === 'usr_admin');
    expect(adminRows, 'the sweep adopted the ownerless row instead of duplicating it').toHaveLength(2);
    // And it is terminal: the sweep's findOne refreshes whichever row it
    // reaches first and never sees, let alone merges, the other.
    await h.run('forecast_snapshot', {}, { event: 'schedule' });
    await h.run('demo_bootstrap', {}, { event: 'schedule' });
    expect(
      h.store.crm_forecast.filter((r) => inCurrentQuarter(r) && r.owner_id === 'usr_admin'),
      'a later pass healed the duplicate — then the seed guard would be optional',
    ).toHaveLength(2);
  });
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
    const h = makeFlowHarness({}, {});
    const evaluate = (condition: unknown) =>
      (h.engine as unknown as {
        evaluateCondition(c: unknown, v: Map<string, unknown>): boolean;
      }).evaluateCondition(condition, new Map([['existingStallTask', null]]));

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

/**
 * demo_bootstrap — the post-seed ownership claim (#622, re-based on #548).
 *
 * The failure this guards against is silent by construction. A seeded row
 * reaches the database with the ownership column (`owner_id`) empty: seed
 * writes run `{ isSystem: true }`, which short-circuits the security
 * middleware, so its insert-time auto-stamp never fires — and these seeds
 * cannot declare an owner either (a seed cannot name a user; that is why this
 * flow exists). `owner_id` is the column the sharing service reads, so under
 * `sharingModel: 'private'` such a row is editable by NOBODY, the admin
 * included: `PATCH` answers 403, and the attachment surface — which gates on
 * `canEdit(parent)` — answers 403 ATTACHMENT_PARENT_ACCESS.
 *
 * #622 was the two-column version of this: the app also authored its own
 * `owner` lookup, the sweep stamped only that one, and the record LOOKED
 * claimed everywhere a human would check while the platform still owned it to
 * nobody — with the sweep's own filter (`owner != null`) then excluding the row
 * forever, so the broken state was terminal. #548 removed the second column, so
 * the half-claimed state is no longer reachable and there is nothing left for a
 * `plat_only` fixture to describe.
 *
 * What remains is one column and one question, and these cases assert the
 * OUTCOME — every claimed object comes out of bootstrap with a real owner —
 * over the object list read from the flow itself, so a newly claimed object is
 * covered the day it is added. The single-column claim is NOT weaker than the
 * two-column one it replaces: it is the same assertion with the column that
 * could disagree with it deleted.
 */
describe('demo_bootstrap — post-seed ownership claim', () => {
  const USER = 'usr_first';

  /** The app's ONE ownership column — the platform anchor sharing reads. */
  const PLATFORM_OWNER = 'owner_id';

  /** Every object the flow claims, read off the flow's own `get_record` nodes. */
  const claimedObjects = (): string[] => {
    const nodes = (DemoBootstrapFlow.nodes ?? []) as Rec[];
    const names = nodes
      .filter((n) => n.type === 'get_record' && n.config?.objectName !== 'sys_user')
      .map((n) => String(n.config.objectName));
    return [...new Set(names)];
  };

  /**
   * Two rows per claimed object:
   *  - `unowned` — a fresh seed row, `owner_id` empty. The sweep must claim it.
   *  - `owned`   — already claimed by a real rep. The sweep must leave it alone.
   *
   * The `app_only` / `plat_only` shapes this fixture used to carry described the
   * two columns DISAGREEING, which #548 made unrepresentable — there is one
   * column now, so "claimed here but not there" has no spelling. They are not
   * re-spelled onto `owner_id` (that would duplicate `unowned` / `owned` under
   * new names and assert nothing extra); they are deleted with the state they
   * described.
   */
  const seedStore = (): Record<string, Rec[]> => {
    const store: Record<string, Rec[]> = { sys_user: [{ id: USER, email: 'admin@objectos.ai' }] };
    for (const object of claimedObjects()) {
      store[object] = [
        { id: `${object}_unowned`, [PLATFORM_OWNER]: null },
        { id: `${object}_owned`, [PLATFORM_OWNER]: 'rep_9' },
      ];
    }
    return store;
  };

  const runBootstrap = async (store: Record<string, Rec[]> = seedStore()) => {
    const h = makeFlowHarness({ demo_bootstrap: DemoBootstrapFlow }, store);
    await h.run('demo_bootstrap', {}, { event: 'schedule' });
    return h;
  };

  it('claims every object the seed data ships an owner-scoped record for', () => {
    // Guards the cases below: they iterate this list, so an empty or truncated
    // one would make every assertion vacuous.
    const claimed = claimedObjects();
    for (const object of [
      'crm_lead', 'crm_account', 'crm_contact', 'crm_opportunity',
      'crm_case', 'crm_task', 'crm_quote', 'crm_contract',
      // #702: `crm_forecast` is `private` and `sales_rep` reads it with
      // `readScope: 'own'`, so an ownerless snapshot row is invisible to every
      // rep and editable by nobody — the same defect as the eight above, on the
      // one owner-scoped seeded object this list used to omit.
      'crm_forecast',
      // #716: the last two, and the ones that hid longest. Both are seeded and
      // both declare `owner_id`, but their OWD is `public_read` — so unlike the
      // nine above their ownerless rows READ fine for everybody and nothing
      // looked broken until somebody tried to WRITE one. `public_read` opens
      // the read baseline only; the write filter still needs owner-match, so
      // `marketing_user.crm_campaign.allowEdit` and
      // `service_agent.crm_knowledge_article.allowEdit` (both at
      // `modifyAllRecords: false`, i.e. write depth `own` → `owner_id ==
      // caller`) were granted permissions that answered 403 on every seeded
      // row for everyone but `system_admin`.
      'crm_campaign',
      'crm_knowledge_article',
      // #671: the activity model got demo rows, and `crm_event` declares
      // `owner_id` under a `private` OWD — so an unclaimed seeded interaction
      // is invisible to every rep (`sales_rep` reads it `own`-only), missing
      // from the owner axis of `event_metrics`, and editable by nobody. This is
      // the cross-table below going red the day the seeds landed, which is the
      // mechanism working.
      'crm_event',
    ]) {
      expect(claimed, `demo_bootstrap never claims ${object}`).toContain(object);
    }
  });

  /**
   * The other half of #671, and the direction that is easy to get wrong by
   * copying the line above: `crm_event_attendee` is seeded in the same commit
   * as `crm_event` but declares NO `owner_id` — its access derives from the
   * event it hangs off (`sharingModel: 'controlled_by_parent'`). Claiming it
   * would stamp a column the object does not have, on rows where ownership
   * means nothing. The computed cross-table below asserts this as a general
   * rule; this case names the record so a future edit cannot quietly add it.
   */
  it('does not claim the attendee junction — it has no ownership to claim', () => {
    expect(claimedObjects()).not.toContain('crm_event_attendee');
  });

  /**
   * The roster above is a list a human maintains, and #716 is what happens when
   * one falls behind: `crm_campaign` and `crm_knowledge_article` sat seeded,
   * owner-scoped and unclaimed for release after release because nothing ever
   * COMPUTED the question — and their `public_read` OWD meant the omission
   * showed up as a 403 on an edit nobody in a demo tries, rather than as an
   * empty list somebody would have reported.
   *
   * So compute it, from the app's own metadata. An object that is SEEDED and
   * declares `owner_id` reaches the database owned by nobody — seed writes run
   * `{ isSystem: true }`, which skips the security middleware's insert-time
   * stamp, and no seed can name a user — so this sweep is the ONLY thing that
   * can give it an owner, and it belongs in the list. Objects with no
   * `owner_id` (`crm_product`, and the `controlled_by_parent` children whose
   * access derives from their master) have no ownership to claim and must stay
   * out — stamping one would write a column the object does not have.
   */
  it('leaves no seeded owner-scoped object unclaimed — the cross-table, computed', () => {
    const seeded = new Set(
      (CrmSeedData as unknown as Array<{ object: string }>).map((d) => d.object),
    );
    const claimed = new Set(claimedObjects());
    const objects = Object.values(CrmObjects as unknown as Record<string, Rec>).filter(
      (o) => o != null && typeof o.name === 'string' && o.fields != null,
    );
    const ownerScoped = (o: Rec) =>
      Object.prototype.hasOwnProperty.call(o.fields as Rec, PLATFORM_OWNER);

    // Guard the guard: a broken walk would make every filter below empty and
    // the whole case vacuous.
    expect(objects.length, 'no objects read off the barrel — the walk broke').toBeGreaterThan(10);
    expect(
      objects.filter((o) => seeded.has(String(o.name)) && ownerScoped(o)).length,
      'no seeded owner-scoped object found at all — the cross-table is empty',
    ).toBeGreaterThan(5);

    const unclaimed = objects
      .filter((o) => seeded.has(String(o.name)) && ownerScoped(o) && !claimed.has(String(o.name)))
      .map((o) => `${String(o.name)} (sharingModel: ${String(o.sharingModel)})`);
    expect(
      unclaimed,
      'these objects ship seed records AND declare the ownership column, so their rows\n' +
        'reach the database owned by nobody and nothing else can claim them. Under any\n' +
        'OWD that leaves them uneditable by every user, `system_admin` aside — and under\n' +
        '`public_read` it does so while the rows still read normally, so the only symptom\n' +
        'is a 403 (#716). Add them to CLAIMED_OBJECTS:\n  ' + unclaimed.join('\n  '),
    ).toEqual([]);

    // The other direction: claiming an object with no ownership column would
    // stamp a field it does not declare, on rows where ownership means nothing.
    const byName = new Map(objects.map((o) => [String(o.name), o]));
    const claimedWithoutOwner = [...claimed].filter((name) => {
      const object = byName.get(name);
      return object != null && !ownerScoped(object);
    });
    expect(
      claimedWithoutOwner,
      `these claimed objects declare no ${PLATFORM_OWNER}:\n  ` + claimedWithoutOwner.join('\n  '),
    ).toEqual([]);
  });

  it('leaves no claimed object ownerless at the PLATFORM level', async () => {
    const h = await runBootstrap();

    const ownerless: string[] = [];
    for (const object of claimedObjects()) {
      for (const row of h.store[object] ?? []) {
        if (row[PLATFORM_OWNER] == null) ownerless.push(`${object}/${row.id as string}`);
      }
    }
    expect(
      ownerless,
      'these rows came out of demo_bootstrap owned by nobody at the platform level.\n' +
        `Under sharingModel:'private' that makes them read-only for EVERY user, admin\n` +
        'included, and blocks attachments on them:\n  ' + ownerless.join('\n  '),
    ).toEqual([]);
  });

  it('claims the ownership column on every row it touches', async () => {
    const h = await runBootstrap();

    for (const object of claimedObjects()) {
      const row = (h.store[object] ?? []).find((r) => r.id === `${object}_unowned`);
      expect(row, `${object}_unowned vanished`).toBeTruthy();
      expect(row![PLATFORM_OWNER], `${object}_unowned: ${PLATFORM_OWNER} not claimed`).toBe(USER);
    }
  });

  it('stamps no OTHER ownership-shaped column — one owner, or the #622 split is back', async () => {
    // The half-claimed state of #622 needed two columns to exist in. This is
    // the assertion that keeps it that way: a future sweep that starts writing
    // a second `owner`-ish key re-creates the state the fixture above no longer
    // has a shape for, and it would do so silently.
    const h = await runBootstrap();
    for (const object of claimedObjects()) {
      for (const row of h.store[object] ?? []) {
        const ownerish = Object.keys(row).filter((k) => k === 'owner' || k.endsWith('_owner'));
        expect(ownerish, `${object}/${row.id as string} grew a second ownership column`).toEqual([]);
      }
    }
  });

  it('never reassigns a record that already has a real owner', async () => {
    const h = await runBootstrap();
    for (const object of claimedObjects()) {
      const owned = (h.store[object] ?? []).find((r) => r.id === `${object}_owned`);
      expect(owned?.[PLATFORM_OWNER], `${object}: overwrote a real owner`).toBe('rep_9');
    }
  });

  it('is a no-op on a fully claimed org', async () => {
    const first = await runBootstrap();
    const settled = JSON.parse(JSON.stringify(first.store)) as Record<string, Rec[]>;

    const second = await runBootstrap(JSON.parse(JSON.stringify(settled)) as Record<string, Rec[]>);
    expect(second.store).toEqual(settled);
  });

  it('does nothing at all before the first user exists', async () => {
    const store = seedStore();
    store.sys_user = [];
    const h = await runBootstrap(store);

    // Every row keeps exactly the ownership it started with — in particular the
    // sweep must not stamp the literal `{firstUser.id}` placeholder.
    for (const object of claimedObjects()) {
      const unowned = (h.store[object] ?? []).find((r) => r.id === `${object}_unowned`);
      expect(unowned?.[PLATFORM_OWNER], `${object}: claimed with no user present`).toBeNull();
    }
  });
});

/**
 * #716 end to end: the two `public_read` families, over the records the seed
 * loader actually ships.
 *
 * The block above runs on a synthetic two-row fixture per claimed object. That
 * proves the sweep's MECHANICS and nothing about the real seed book — and #716
 * was not a mechanics bug: the sweep worked perfectly, it simply never looked
 * at these two objects. So this runs it over the actual `crm_campaign` and
 * `crm_knowledge_article` seed records, read from `src/data/` rather than
 * restated here, and asserts the outcome the issue is about.
 *
 * Why these two hid so long is worth keeping in the fixture: their OWD is
 * `public_read`, so every one of these rows READS normally for every user even
 * while owned by nobody. Nothing is empty, nothing errors, no list is short.
 * The only symptom is a write — and a demo org is read almost exclusively.
 */
describe('demo_bootstrap claims the real campaign and knowledge seeds (#716)', () => {
  const ADMIN = 'usr_admin';
  const PLATFORM_OWNER = 'owner_id';

  /** The two families, with the `externalId` their `defineSeed` upserts on. */
  const FAMILIES = [
    ['crm_campaign', 'name'],
    ['crm_knowledge_article', 'title'],
  ] as const;

  const seedRecordsOf = (object: string): Rec[] =>
    (CrmSeedData as unknown as Array<{ object: string; records: Rec[] }>).find(
      (d) => d.object === object,
    )?.records ?? [];

  /**
   * One seed-loader pass, faithful to what the loader does: `mode: 'upsert'` on
   * the dataset's `externalId` resolves to a PARTIAL update over the columns
   * the seed declares when the row already exists, and to an insert otherwise.
   *
   * Partial is load-bearing — the seeds declare no `owner_id`, so a claimed
   * owner survives a warm-boot replay. And a fresh insert lands with
   * `owner_id: null` rather than with the key absent: the registry injects the
   * column into every user-owned object, and the seed write only skips the
   * security plugin's insert-time STAMP. That distinction decides whether the
   * sweep can see the row at all — its filter is `{ owner_id: null }`, and an
   * absent key is not null. The pushed row no longer states the column: the
   * harness store materialises every declared column the way a driver does
   * (#1458), which is what makes the seeded row visible to that filter.
   */
  const loadSeeds = (store: Record<string, Rec[]>) => {
    for (const [object, externalId] of FAMILIES) {
      const rows = (store[object] ??= []);
      for (const rec of seedRecordsOf(object)) {
        const key = String(rec[externalId]);
        const existing = rows.find((r) => String(r[externalId]) === key);
        if (existing) Object.assign(existing, rec);
        else rows.push({ id: `seed_${object}_${key}`, ...rec });
      }
    }
  };

  const freshStore = (): Record<string, Rec[]> => {
    const store: Record<string, Rec[]> = { sys_user: [{ id: ADMIN, email: 'admin@objectos.ai' }] };
    loadSeeds(store);
    return store;
  };

  const sweep = async (store: Record<string, Rec[]>) => {
    const h = makeFlowHarness({ demo_bootstrap: DemoBootstrapFlow }, store);
    await h.run('demo_bootstrap', {}, { event: 'schedule' });
    return h;
  };

  const ownerless = (rows: Rec[]) => rows.filter((r) => r[PLATFORM_OWNER] == null);

  it('the seed book actually ships rows for both, and ships them ownerless', () => {
    // Guard the guard, twice over. An empty family makes every case below
    // vacuous, and a family that arrived already owned would mean the fixture
    // no longer presents the defect the sweep is supposed to fix.
    const store = freshStore();
    for (const [object] of FAMILIES) {
      expect(seedRecordsOf(object).length, `${object} ships no seed records`).toBeGreaterThan(0);
      expect(store[object].length, `${object} did not load`).toBe(seedRecordsOf(object).length);
      expect(
        ownerless(store[object]).length,
        `${object}: seeds arrived owned — the fixture no longer shows the defect`,
      ).toBe(store[object].length);
    }
  });

  it('leaves no seeded campaign or article ownerless after one pass', async () => {
    const h = await sweep(freshStore());

    const stillOwnerless: string[] = [];
    for (const [object, externalId] of FAMILIES) {
      for (const row of ownerless(h.store[object] ?? [])) {
        stillOwnerless.push(`${object}/${String(row[externalId])}`);
      }
    }
    expect(
      stillOwnerless,
      'these seeded rows came out of demo_bootstrap owned by nobody. Their OWD is\n' +
        '`public_read`, so they still READ fine — the failure is silent until an edit,\n' +
        'which answers 403 for every user but system_admin (#716):\n  ' +
        stillOwnerless.join('\n  '),
    ).toEqual([]);

    for (const [object] of FAMILIES) {
      for (const row of h.store[object]) {
        expect(row[PLATFORM_OWNER], `${object}/${String(row.id)}: wrong owner`).toBe(ADMIN);
      }
    }
  });

  /**
   * The permission half of #716, as far as this repo can honestly take it.
   *
   * This is a MODEL of the platform's write gate, not the platform's own code —
   * `@objectstack/plugin-security` is not a dependency of this app and standing
   * one up would test the platform rather than us. The model is one line of
   * documented behaviour: a grant with `modifyAllRecords: false` and no
   * `writeScope` resolves to the `own` write depth, whose write filter is
   * `owner_id == caller`, and `public_read` does NOT exempt writes from it
   * ("public_read is read-open but write-owned; only a fully public object is
   * write-open" — `@objectstack/plugin-sharing` 17.0.0-rc.2, `buildWriteFilter`).
   *
   * So what this pins is not "the 403 is gone" — only a running server shows
   * that. It pins the single input the app controls and #716 got wrong: the row
   * a granted editor is measured against has an owner at all. The grants are
   * read from the real profile metadata, so the case fails loudly if the
   * premise it reasons from (edit granted, `modifyAllRecords` off) ever moves.
   */
  it('turns a granted editor from zero editable rows into all of them', async () => {
    const GRANTS = [
      ['crm_campaign', (MarketingUserProfile.objects as Rec).crm_campaign, 'marketing_user'],
      ['crm_knowledge_article', (ServiceAgentProfile.objects as Rec).crm_knowledge_article, 'service_agent'],
    ] as const;

    for (const [object, grant, profile] of GRANTS) {
      expect(grant, `${profile} has no ${object} grant`).toBeTruthy();
      expect(grant.allowEdit, `${profile}.${object}: edit grant gone`).toBe(true);
      expect(grant.modifyAllRecords, `${profile}.${object}: now modifies all records`).toBe(false);
      expect(grant.writeScope, `${profile}.${object}: gained a writeScope`).toBeUndefined();
    }

    // The `own`-depth write filter, applied to the rows a granted editor faces.
    const editable = (rows: Rec[], userId: string) =>
      rows.filter((r) => r[PLATFORM_OWNER] === userId);

    const before = freshStore();
    for (const [object] of GRANTS) {
      expect(
        editable(before[object], ADMIN).length,
        `${object}: an editable row before the sweep — the fixture is wrong`,
      ).toBe(0);
    }

    const h = await sweep(before);
    for (const [object] of GRANTS) {
      expect(
        editable(h.store[object], ADMIN).length,
        `${object}: rows a granted editor still cannot reach`,
      ).toBe(seedRecordsOf(object).length);
    }
  });

  it('survives a warm boot — the replayed seed does not blank the claim', async () => {
    // The seeds re-run on every boot. They declare no `owner_id`, so the upsert
    // is a partial write and the claim must persist; if it did not, the sweep
    // would re-claim forever and any real reassignment would be undone by the
    // next restart.
    const h = await sweep(freshStore());
    loadSeeds(h.store);

    for (const [object] of FAMILIES) {
      expect(ownerless(h.store[object]).length, `${object}: re-seed blanked the owner`).toBe(0);
      expect(h.store[object].length, `${object}: re-seed duplicated rows`).toBe(
        seedRecordsOf(object).length,
      );
    }

    const settled = JSON.parse(JSON.stringify(h.store)) as Record<string, Rec[]>;
    const again = await sweep(JSON.parse(JSON.stringify(settled)) as Record<string, Rec[]>);
    expect(again.store).toEqual(settled);
  });
});
