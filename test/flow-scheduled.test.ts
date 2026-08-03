// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CampaignCompletionFlow } from '../src/flows/campaign-completion.flow';
import { CaseSlaMonitorFlow } from '../src/flows/case-sla-monitor.flow';
import { ContractExpirationFlow } from '../src/flows/contract-expiration.flow';
import { ContractRenewalFlow } from '../src/flows/contract-renewal.flow';
import { DemoBootstrapFlow } from '../src/flows/demo-bootstrap.flow';
import { ForecastSnapshotFlow } from '../src/flows/forecast-snapshot.flow';
import { OpportunityStagnationFlow } from '../src/flows/opportunity-stagnation.flow';
import { QuoteExpirationFlow } from '../src/flows/quote-expiration.flow';
import forecastDerive from '../src/objects/forecast.hook';
import { TaskDueReminderFlow } from '../src/flows/task-due-reminder.flow';
import * as allFlows from '../src/flows';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

/**
 * Runtime tests for the SCHEDULED sweeps.
 *
 * All six scheduled flows were previously untested at runtime, and they are the
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
      is_sla_violated: false, sla_due_date: iso(-2), owner: 'rep1',
    },
    // Due in the future — must be left alone.
    {
      id: 'c_future', case_number: 'CASE-2', status: 'working', priority: 'high',
      is_sla_violated: false, sla_due_date: iso(+2), owner: 'rep1',
    },
    // Past due but already resolved: work is finished, so this is NOT a breach.
    {
      id: 'c_resolved', case_number: 'CASE-3', status: 'resolved', priority: 'high',
      is_sla_violated: false, sla_due_date: iso(-5), owner: 'rep1',
    },
    // Past due but closed — likewise excluded.
    {
      id: 'c_closed', case_number: 'CASE-4', status: 'closed', priority: 'low',
      is_sla_violated: false, sla_due_date: iso(-9), owner: 'rep1',
    },
    // Already flagged — must not be re-processed (or re-notified).
    {
      id: 'c_already', case_number: 'CASE-5', status: 'escalated', priority: 'critical',
      is_sla_violated: true, sla_due_date: iso(-3), owner: 'rep1',
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
    expect(already.escalation_reason, 'already-flagged case was re-written').toBeUndefined();
  });

  it('alerts the case owner, and only for the newly-breached case', async () => {
    const h = await runSweep();
    expect(h.notifications.length, 'expected exactly one alert').toBe(1);

    const [alert] = h.notifications;
    const recipients = JSON.stringify(alert.to);
    expect(recipients).toContain('rep1');
    // `{currentCase.owner.manager}` dot-walks a lookup, which flow templates
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
          is_sla_violated: false, sla_due_date: iso(+5), owner: 'rep1',
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
        { id: 'k_past', contract_number: 'CTR-1', status: 'activated', end_date: day(-1), owner: 'rep1' },
        { id: 'k_future', contract_number: 'CTR-2', status: 'activated', end_date: day(+30), owner: 'rep1' },
        { id: 'k_draft', contract_number: 'CTR-3', status: 'draft', end_date: day(-30), owner: 'rep1' },
        { id: 'k_expired', contract_number: 'CTR-4', status: 'expired', end_date: day(-60), owner: 'rep1' },
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
        { id: 't_due', subject: 'Call Acme', owner: 'rep1', is_completed: false, reminder_date: iso(-1) },
        { id: 't_future', subject: 'Later', owner: 'rep1', is_completed: false, reminder_date: iso(+3) },
        { id: 't_done', subject: 'Done', owner: 'rep1', is_completed: true, reminder_date: iso(-5) },
        { id: 't_none', subject: 'No reminder', owner: 'rep1', is_completed: false, reminder_date: null },
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
      crm_task: [{ id: 't_due', subject: 'Call Acme', owner: 'rep1', is_completed: false, reminder_date: iso(-1) }],
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
    { id: 'o_stalled', name: 'Stalled Deal', stage: 'proposal', stage_entry_date: day(-30), owner: 'rep1' },
    { id: 'o_fresh', name: 'Fresh Deal', stage: 'proposal', stage_entry_date: day(-3), owner: 'rep1' },
    // Exactly at the threshold: the filter is `$lt`, so a deal that entered its
    // stage exactly 14 days ago must NOT fire.
    { id: 'o_boundary', name: 'Boundary Deal', stage: 'proposal', stage_entry_date: day(-14), owner: 'rep1' },
    { id: 'o_won', name: 'Won Deal', stage: 'closed_won', stage_entry_date: day(-99), owner: 'rep1' },
    { id: 'o_lost', name: 'Lost Deal', stage: 'closed_lost', stage_entry_date: day(-99), owner: 'rep1' },
    // A row with a null clock does not satisfy `$lt` and is skipped.
    { id: 'o_nullclock', name: 'No Clock', stage: 'proposal', stage_entry_date: null, owner: 'rep1' },
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
    expect(task.owner).toBe('rep1');
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
    owner: 'rep1', contract_value: 90_000, auto_renewal: false, renewal_notice_days: 30,
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
    expect(task.owner).toBe('rep1');
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
    { id: 'o1', owner: 'rep1', stage: 'qualification',  forecast_category: 'pipeline',  amount: 100_000, close_date: inPeriod },
    { id: 'o2', owner: 'rep1', stage: 'needs_analysis', forecast_category: 'best_case', amount: 50_000,  close_date: inPeriod },
    { id: 'o3', owner: 'rep1', stage: 'negotiation',    forecast_category: 'commit',    amount: 30_000,  close_date: inPeriod },
    { id: 'o4', owner: 'rep1', stage: 'closed_won',     forecast_category: 'closed',    amount: 70_000,  close_date: inPeriod },
    // Closes in the PREVIOUS quarter — outside every bucket, but still makes
    // rep1 an active owner.
    { id: 'o5', owner: 'rep1', stage: 'proposal',       forecast_category: 'commit',    amount: 999_999, close_date: beforePeriod },
    // Lost deals are neither open nor won.
    { id: 'o6', owner: 'rep1', stage: 'closed_lost',    forecast_category: 'omitted',   amount: 12_345,  close_date: inPeriod },
    // rep2 — the second amount arrives as a STRING, the shape a currency
    // column takes coming back from some drivers. Without the `* 1` coercion
    // in the accumulator the template CONCATENATES and pipeline reads
    // "020000" + "25000" instead of 45000.
    { id: 'o7', owner: 'rep2', stage: 'proposal',       forecast_category: 'commit',    amount: 20_000,  close_date: inPeriod },
    { id: 'o8', owner: 'rep2', stage: 'qualification',  forecast_category: 'pipeline',  amount: '25000', close_date: inPeriod },
    // rep4 owns nothing but a lost deal — not a forecast owner.
    { id: 'o9', owner: 'rep4', stage: 'closed_lost',    forecast_category: 'omitted',   amount: 88_000,  close_date: inPeriod },
  ];

  const harness = (forecasts: Rec[] = []) =>
    makeFlowHarness(
      { forecast_snapshot: ForecastSnapshotFlow },
      { sys_user: users(), crm_opportunity: opps(), crm_forecast: forecasts },
      { hooks: [forecastDerive] },
    );

  const run = async (forecasts: Rec[] = []) => {
    const h = harness(forecasts);
    await h.run('forecast_snapshot', {}, { event: 'schedule' });
    return h;
  };

  const byOwner = (h: ReturnType<typeof harness>) =>
    Object.fromEntries(h.store.crm_forecast.map((f) => [f.owner, f]));

  it('opens a current-period row for every active opportunity owner, and only for them', async () => {
    const h = await run();

    expect(h.store.crm_forecast).toHaveLength(2);
    const owners = h.store.crm_forecast.map((f) => f.owner).sort();
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
      id: 'f_rep1', owner: 'rep1', period: 'quarter',
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
      id: 'f_rep1', owner: 'rep1', period: 'quarter',
      period_start: isoUtc(qStart), period_end: isoUtc(qEnd), period_label: quarterLabel,
      snapshot_date: beforePeriod, source: 'scheduled', quota: 1_500_000,
    }]);

    const snap = byOwner(h).rep1;
    expect(Number(snap.quota), 'the sweep clobbered a hand-maintained quota').toBe(1_500_000);
    // And a freshly opened row leaves quota unset rather than zeroing it,
    // so `attainment_pct` guards on quota > 0 instead of dividing by a lie.
    expect(byOwner(h).rep2.quota).toBeUndefined();
  });

  it('does not touch a snapshot belonging to a different period', async () => {
    const previousQuarterEnd = isoUtc(new Date(qStart.getTime() - 86_400_000));
    const h = await run([{
      id: 'f_old', owner: 'rep1', period: 'quarter',
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
        crm_opportunity: [{ id: 'ox', owner: 'rep9', stage: 'closed_lost', amount: 10, close_date: inPeriod }],
        crm_forecast: [],
      },
      { hooks: [forecastDerive] },
    );
    await h.run('forecast_snapshot', {}, { event: 'schedule' });
    expect(h.store.crm_forecast).toHaveLength(0);
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
        // A loop nested in a loop is subject to the same rule.
        if (node?.type === 'loop') visitBody(flowName, `${loopId}/${node.id}`, node.config?.body);
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
 * demo_bootstrap — the post-seed ownership claim (#622).
 *
 * The failure this guards against is silent by construction. A seeded row can
 * reach the database with the PLATFORM ownership column (`owner_id`) empty:
 * seed writes run `{ isSystem: true }`, which by the seeder's documented
 * contract disables auto-injection of `owner_id`, and these seeds cannot
 * declare one (`cel`os.user.id`` does not resolve at seed time — that is why
 * this flow exists). `owner_id` is the only column the sharing service reads,
 * so under `sharingModel: 'private'` such a row is editable by NOBODY, the
 * admin included: `PATCH` answers 403, and the attachment surface — which
 * gates on `canEdit(parent)` — answers 403 ATTACHMENT_PARENT_ACCESS.
 *
 * Stamping only the app-level `owner` lookup hid it perfectly: the record LOOKS
 * claimed everywhere a human would check, the "My …" views fill up, and the
 * sweep's own filter (`owner != null`) then excludes the row forever, so the
 * broken state is terminal. Shipped that way, `crm_contract` was read-only for
 * every user on every demo org.
 *
 * These cases therefore assert the OUTCOME — every claimed object comes out of
 * bootstrap with a real platform owner — over the object list read from the
 * flow itself, so a newly claimed object is covered the day it is added.
 */
describe('demo_bootstrap — post-seed ownership claim', () => {
  const USER = 'usr_first';

  /** The platform ownership column; injected by ObjectQL, read by sharing. */
  const PLATFORM_OWNER = 'owner_id';
  /** The app's own lookup; drives "My …" views and owner-addressed notify. */
  const APP_OWNER = 'owner';

  /** Every object the flow claims, read off the flow's own `get_record` nodes. */
  const claimedObjects = (): string[] => {
    const nodes = (DemoBootstrapFlow.nodes ?? []) as Rec[];
    const names = nodes
      .filter((n) => n.type === 'get_record' && n.config?.objectName !== 'sys_user')
      .map((n) => String(n.config.objectName));
    return [...new Set(names)];
  };

  /**
   * One row per ownerless SHAPE, for each claimed object:
   *  - `both`      — a fresh seed row, ownerless on both columns.
   *  - `app_only`  — the platform stamp fired, the app lookup is still empty.
   *  - `plat_only` — THE #622 STATE: the app lookup reads as claimed while the
   *                  platform column is empty. A sweep keyed on `owner` alone
   *                  can never see this row again.
   * Plus `owned`, already claimed by a real rep — must be left alone.
   */
  const seedStore = (): Record<string, Rec[]> => {
    const store: Record<string, Rec[]> = { sys_user: [{ id: USER, email: 'admin@objectos.ai' }] };
    for (const object of claimedObjects()) {
      store[object] = [
        { id: `${object}_both`, [APP_OWNER]: null, [PLATFORM_OWNER]: null },
        { id: `${object}_app_only`, [APP_OWNER]: null, [PLATFORM_OWNER]: USER },
        { id: `${object}_plat_only`, [APP_OWNER]: USER, [PLATFORM_OWNER]: null },
        { id: `${object}_owned`, [APP_OWNER]: 'rep_9', [PLATFORM_OWNER]: 'rep_9' },
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
    ]) {
      expect(claimed, `demo_bootstrap never claims ${object}`).toContain(object);
    }
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

  it('claims BOTH ownership columns on every row it touches', async () => {
    const h = await runBootstrap();

    for (const object of claimedObjects()) {
      const byId = Object.fromEntries((h.store[object] ?? []).map((r) => [r.id, r]));
      for (const shape of ['both', 'app_only', 'plat_only']) {
        const row = byId[`${object}_${shape}`];
        expect(row, `${object}_${shape} vanished`).toBeTruthy();
        expect(row[PLATFORM_OWNER], `${object}_${shape}: platform ${PLATFORM_OWNER} not claimed`).toBe(USER);
        expect(row[APP_OWNER], `${object}_${shape}: app ${APP_OWNER} not claimed`).toBe(USER);
      }
    }
  });

  it('repairs a row the app lookup already calls claimed (the #622 state)', async () => {
    // The regression in one case: `owner` set, `owner_id` empty. A sweep keyed
    // on `owner` alone reports success and never touches the row again, which
    // is why this shipped invisibly.
    const h = await runBootstrap();
    const contract = (h.store.crm_contract ?? []).find((r) => r.id === 'crm_contract_plat_only');
    expect(contract?.[PLATFORM_OWNER], 'half-claimed contract still ownerless to sharing').toBe(USER);
  });

  it('never reassigns a record that already has a real owner', async () => {
    const h = await runBootstrap();
    for (const object of claimedObjects()) {
      const owned = (h.store[object] ?? []).find((r) => r.id === `${object}_owned`);
      expect(owned?.[APP_OWNER], `${object}: stole an owned record`).toBe('rep_9');
      expect(owned?.[PLATFORM_OWNER], `${object}: overwrote a real platform owner`).toBe('rep_9');
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
      const both = (h.store[object] ?? []).find((r) => r.id === `${object}_both`);
      expect(both?.[APP_OWNER], `${object}: claimed with no user present`).toBeNull();
      expect(both?.[PLATFORM_OWNER], `${object}: claimed with no user present`).toBeNull();
    }
  });
});
