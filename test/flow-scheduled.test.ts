// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CampaignCompletionFlow } from '../src/flows/campaign-completion.flow';
import { CaseSlaMonitorFlow } from '../src/flows/case-sla-monitor.flow';
import { ContractExpirationFlow } from '../src/flows/contract-expiration.flow';
import { ContractRenewalFlow } from '../src/flows/contract-renewal.flow';
import { OpportunityStagnationFlow } from '../src/flows/opportunity-stagnation.flow';
import { QuoteExpirationFlow } from '../src/flows/quote-expiration.flow';
import { TaskDueReminderFlow } from '../src/flows/task-due-reminder.flow';
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
  const seedOpps = (): Rec[] => [
    { id: 'o_stalled', name: 'Stalled Deal', stage: 'proposal', days_in_stage: 30, owner: 'rep1' },
    { id: 'o_fresh', name: 'Fresh Deal', stage: 'proposal', days_in_stage: 3, owner: 'rep1' },
    // 14 is the threshold and the filter is `$gt`, so exactly-14 must NOT fire.
    { id: 'o_boundary', name: 'Boundary Deal', stage: 'proposal', days_in_stage: 14, owner: 'rep1' },
    { id: 'o_won', name: 'Won Deal', stage: 'closed_won', days_in_stage: 99, owner: 'rep1' },
    { id: 'o_lost', name: 'Lost Deal', stage: 'closed_lost', days_in_stage: 99, owner: 'rep1' },
  ];

  const run = async () => {
    const h = makeFlowHarness(
      { opportunity_stagnation: OpportunityStagnationFlow },
      { crm_opportunity: seedOpps(), crm_task: [] },
    );
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });
    return h;
  };

  it('selects exactly the open deals past the 14-day threshold', async () => {
    const h = await run();
    // The loop body issues one crm_task lookup per selected deal, so those
    // lookups are the observable record of what the sweep picked up.
    const nudgeLookups = h.queries.filter((q) => q.object === 'crm_task');
    expect(nudgeLookups.map((q) => q.where.related_to_opportunity)).toEqual(['o_stalled']);
  });

  it('skips fresh, boundary and closed deals', async () => {
    const h = await run();
    const touched = h.queries
      .filter((q) => q.object === 'crm_task')
      .map((q) => q.where.related_to_opportunity);
    for (const id of ['o_fresh', 'o_boundary', 'o_won', 'o_lost']) {
      expect(touched, `${id} should not have been swept`).not.toContain(id);
    }
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
    const contractQuery = h.queries.find((x) => x.object === 'crm_contract')!;
    const selected = h.store.crm_contract.filter(
      (k) => k.status === contractQuery.where.status &&
        String(k.end_date) >= String(contractQuery.where.end_date.$gte).slice(0, 10) &&
        String(k.end_date) <= String(contractQuery.where.end_date.$lte).slice(0, 10),
    );
    expect(selected).toHaveLength(0);
  });
});

/**
 * KNOWN DEFECT — conditional edges nested inside a `loop` body never fire.
 *
 * `AutomationEngine.registerFlow` runs `applyConversionsToFlow`, which rewrites
 * a bare string `condition` into a `{ dialect: 'cel', source }` envelope. That
 * pass only walks the flow's TOP-LEVEL `edges`; it does not recurse into the
 * structured control-flow regions introduced by ADR-0031 (`loop.config.body`).
 *
 * A condition left as a bare string falls through to the engine's legacy
 * template path, which substitutes `{var}` templates (there are none here) and
 * then STRING-compares the leftover expression text. So:
 *
 *     'existingStallTask == null'  →  'existingStallTask' === 'null'  →  false
 *
 * The gate never opens. Verified against @objectstack/service-automation
 * 16.1.0: passing the same expression as an explicit `{dialect:'cel', source}`
 * envelope evaluates correctly, which is why every TOP-LEVEL conditional edge
 * in this app works and only the loop-nested ones do not.
 *
 * Three flows carry conditional edges inside a loop body and are therefore
 * inert past that gate: `opportunity_stagnation`, `contract_renewal`, and
 * `campaign_enrollment`.
 *
 * These assertions pin the CURRENT behaviour deliberately, so the defect is
 * visible and tracked rather than silent. Fixing it — whether by authoring the
 * nested conditions as explicit CEL envelopes here, or by making the conversion
 * pass recurse upstream — changes what these scheduled sweeps DO in production
 * (they would begin creating tasks, opportunities and notifications), so it is
 * deliberately NOT bundled into this verification-pipeline change. When it is
 * fixed, these three tests go red and must be rewritten to assert the real
 * behaviour.
 */
describe('KNOWN DEFECT: loop-nested conditions never evaluate (see comment above)', () => {
  it('opportunity_stagnation selects stalled deals but never nudges', async () => {
    const h = makeFlowHarness(
      { opportunity_stagnation: OpportunityStagnationFlow },
      {
        crm_opportunity: [
          { id: 'o_stalled', name: 'Stalled Deal', stage: 'proposal', days_in_stage: 30, owner: 'rep1' },
        ],
        crm_task: [],
      },
    );
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });

    // Proof the deal WAS selected — the per-iteration lookup ran…
    expect(h.queries.some((q) => q.object === 'crm_task')).toBe(true);
    // …but the `existingStallTask == null` gate never opened.
    expect(h.store.crm_task, 'gate now opens — rewrite this test').toHaveLength(0);
    expect(h.notifications, 'gate now opens — rewrite this test').toHaveLength(0);
  });

  it('contract_renewal selects contracts in window but never books a renewal', async () => {
    const h = makeFlowHarness({ contract_renewal: ContractRenewalFlow }, {
      crm_contract: [{
        id: 'k1', contract_number: 'CTR-1', status: 'activated', crm_account: 'acc1',
        owner: 'rep1', contract_value: 90_000, auto_renewal: true,
        renewal_notice_days: 30, end_date: day(+20),
      }],
      crm_task: [],
      crm_opportunity: [],
    });
    await h.run('contract_renewal', {}, { event: 'schedule' });

    expect(h.queries.some((q) => q.object === 'crm_contract')).toBe(true);
    // The very first gate (`timestamp(end_date) <= daysFromNow(...)`) compares
    // the literal strings 'timestamp(currentContract.end_date)' and
    // 'daysFromNow(int(currentContract.renewal_notice_days))', so nothing runs.
    expect(h.store.crm_task, 'gate now opens — rewrite this test').toHaveLength(0);
    expect(h.store.crm_opportunity, 'gate now opens — rewrite this test').toHaveLength(0);
    expect(h.notifications, 'gate now opens — rewrite this test').toHaveLength(0);
  });

  it('an explicit CEL envelope DOES evaluate — this is the available fix', async () => {
    // Documents the remedy: the same expression, wrapped, behaves correctly.
    const h = makeFlowHarness({}, {});
    const evaluate = (condition: unknown) =>
      (h.engine as unknown as {
        evaluateCondition(c: unknown, v: Map<string, unknown>): boolean;
      }).evaluateCondition(condition, new Map([['existingStallTask', null]]));

    expect(evaluate('existingStallTask == null'), 'bare string (loop-nested form)').toBe(false);
    expect(
      evaluate({ dialect: 'cel', source: 'existingStallTask == null' }),
      'explicit CEL envelope',
    ).toBe(true);
  });
});
