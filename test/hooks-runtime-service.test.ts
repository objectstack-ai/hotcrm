// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import campaignHooks from '../src/objects/campaign.hook';
import caseHooks from '../src/objects/case.hook';
import contractHooks from '../src/objects/contract.hook';
import forecastHooks from '../src/objects/forecast.hook';
import knowledgeHooks from '../src/objects/knowledge_article.hook';
import leadHooks from '../src/objects/lead.hook';
import taskHooks from '../src/objects/task.hook';
import {
  makeHarness, makeDeniedApi, makeCtx, hookNamed, today, daysFromNow, type Rec,
} from './helpers/hook-harness';

/**
 * Runtime tests for the SERVICE / CRM-operations hooks — real handler bodies
 * against a controllable in-memory data layer.
 *
 * Companion file: hooks-runtime-sales.test.ts (opportunity, quote, account,
 * contact, product).
 */

const SYSTEM = undefined;
const USER = { id: 'user_1' };

// ─────────────────────────────────────────────────────────────── case ──

describe('case_sla_defaults', () => {
  const hook = hookNamed(caseHooks, 'case_sla_defaults');

  it('materialises priority_rank so queue views sort by urgency, not alphabetically', async () => {
    // Sorting on `priority` itself compares raw strings and inverts urgency
    // (medium > low > high > critical).
    for (const [priority, rank] of [['low', 1], ['medium', 2], ['high', 3], ['critical', 4]] as const) {
      const input: Rec = { priority };
      await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
      expect(input.priority_rank).toBe(rank);
    }
  });

  it('gives a critical case a 4-hour SLA when none was supplied', async () => {
    const input: Rec = { priority: 'critical' };
    const before = Date.now();
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    const due = new Date(input.sla_due_date as string).getTime();
    expect(due).toBeGreaterThan(before + 3.9 * 3_600_000);
    expect(due).toBeLessThan(before + 4.1 * 3_600_000);
  });

  it('does not give a non-critical case an SLA', async () => {
    const input: Rec = { priority: 'high' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.sla_due_date).toBeUndefined();
  });

  it('stamps defaults and strips privileged fields on an anonymous guest submission', async () => {
    const input: Rec = {
      subject: 'Help', owner: 'spoofed', is_escalated: true, is_closed: true,
      internal_notes: 'nope', resolution: 'nope',
    };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: SYSTEM }));
    expect(input.origin).toBe('web');
    expect(input.status).toBe('new');
    expect(input.priority).toBe('medium');
    for (const stripped of ['owner', 'is_escalated', 'is_closed', 'internal_notes', 'resolution']) {
      expect(input, `guest submission kept privileged field ${stripped}`).not.toHaveProperty(stripped);
    }
  });

  it('derives is_closed from status for trusted writes', async () => {
    const closed: Rec = { status: 'closed' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input: closed, previous: { status: 'new' }, user: USER }));
    expect(closed.is_closed).toBe(true);
    expect(closed.closed_date, 'closed_date should be stamped on the transition').toBeTruthy();

    const open: Rec = { status: 'working' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input: open, previous: { status: 'new' }, user: USER }));
    expect(open.is_closed).toBe(false);
  });

  it('computes resolution_time_hours from created → closed', async () => {
    const input: Rec = { status: 'closed', closed_date: '2026-01-02T00:00:00.000Z' };
    const previous: Rec = { status: 'working', created_at: '2026-01-01T00:00:00.000Z' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous, user: USER }));
    expect(input.resolution_time_hours).toBe(24);
  });
});

describe('case_status_side_effects', () => {
  const hook = hookNamed(caseHooks, 'case_status_side_effects');

  it('creates an urgent task for the account owner on escalation', async () => {
    const h = makeHarness({
      crm_account: [{ id: 'acc1', owner: 'rep1' }],
      crm_task: [],
    });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'case1', status: 'escalated', crm_account: 'acc1' },
      previous: { id: 'case1', status: 'working', crm_account: 'acc1' },
      user: USER,
      api: h.api,
    }));

    const [task] = h.rows('crm_task');
    expect(task, 'no escalation task created').toBeTruthy();
    expect(task.priority).toBe('urgent');
    expect(task.owner).toBe('rep1');
    expect(task.related_to_case).toBe('case1');
    expect(task.due_date).toBe(daysFromNow(1));
  });

  it('bumps account activity on resolve WITHOUT stamping a date on the case', async () => {
    // Writing closed_date here as a proxy for "resolved" corrupted resolution
    // metrics: a resolved-then-closed case kept its resolve time as its close
    // time. closed_date belongs exclusively to the `closed` transition.
    const h = makeHarness({ crm_account: [{ id: 'acc1' }], crm_task: [] });
    const input: Rec = { id: 'case1', status: 'resolved', crm_account: 'acc1' };
    await hook.handler(makeCtx({
      event: 'afterUpdate', input, previous: { id: 'case1', status: 'working' }, user: USER, api: h.api,
    }));

    expect(h.rows('crm_account')[0].last_activity_date).toBe(today());
    expect(h.callsFor('crm_case')).toHaveLength(0);
    expect(input.closed_date).toBeUndefined();
  });

  it('does not re-fire when the status did not change', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1', owner: 'rep1' }], crm_task: [] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'case1', status: 'escalated', crm_account: 'acc1' },
      previous: { id: 'case1', status: 'escalated', crm_account: 'acc1' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────── contract ──

describe('contract_validation', () => {
  const hook = hookNamed(contractHooks, 'contract_validation');

  it('accepts a date range matching the declared term', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12 },
      })),
    ).resolves.toBeUndefined();
  });

  it('rejects a term that disagrees with the date range by more than a month', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { start_date: '2026-01-01', end_date: '2026-07-01', contract_term_months: 12 },
      })),
    ).rejects.toThrow(/does not match date range/);
  });

  it('tolerates a one-month rounding difference', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { start_date: '2026-01-01', end_date: '2026-12-15', contract_term_months: 12 },
      })),
    ).resolves.toBeUndefined();
  });

  it('refuses to shrink end_date after activation', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate',
        input: { end_date: '2026-06-01' },
        previous: { status: 'activated', end_date: '2027-01-01', start_date: '2026-01-01' },
      })),
    ).rejects.toThrow(/Cannot shrink end_date/);
  });

  it('allows extending end_date after activation', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate',
        input: { end_date: '2028-01-01' },
        previous: { status: 'activated', end_date: '2027-01-01', start_date: '2026-01-01', contract_term_months: 24 },
      })),
    ).resolves.toBeUndefined();
  });

  it('allows shrinking end_date while still a draft', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate',
        input: { end_date: '2026-06-01' },
        previous: { status: 'draft', end_date: '2027-01-01' },
      })),
    ).resolves.toBeUndefined();
  });
});

describe('contract_on_activation', () => {
  const hook = hookNamed(contractHooks, 'contract_on_activation');

  const activate = (h: ReturnType<typeof makeHarness>, previous: Rec = {}) =>
    hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'k1', status: 'activated', crm_account: 'acc1' },
      previous: { id: 'k1', status: 'draft', crm_account: 'acc1', ...previous },
      user: USER,
      api: h.api,
    }));

  it('stamps signed_date and promotes the account to customer', async () => {
    const h = makeHarness({
      crm_contract: [{ id: 'k1', status: 'activated' }],
      crm_account: [{ id: 'acc1', type: 'prospect' }],
    });
    await activate(h);
    expect(h.rows('crm_contract')[0].signed_date).toBe(today());
    expect(h.rows('crm_account')[0].type).toBe('customer');
  });

  it('does not overwrite an existing signed_date', async () => {
    const h = makeHarness({
      crm_contract: [{ id: 'k1', status: 'activated', signed_date: '2025-05-05' }],
      crm_account: [{ id: 'acc1', type: 'customer' }],
    });
    await activate(h, { signed_date: '2025-05-05' });
    expect(h.callsFor('crm_contract', 'update')).toHaveLength(0);
  });

  it('creates NO renewal task — that belongs to the contract_renewal flow', async () => {
    // The activation-time task this hook used to create hardcoded a 60-day
    // notice and duplicated the flow, which honours renewal_notice_days.
    const h = makeHarness({
      crm_contract: [{ id: 'k1', status: 'activated' }],
      crm_account: [{ id: 'acc1', type: 'prospect' }],
      crm_task: [],
    });
    await activate(h);
    expect(h.rows('crm_task')).toHaveLength(0);
  });

  it('is a no-op when the contract was already activated', async () => {
    const h = makeHarness({ crm_contract: [{ id: 'k1' }], crm_account: [{ id: 'acc1' }] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'k1', status: 'activated' },
      previous: { id: 'k1', status: 'activated' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────── campaign ──

describe('campaign_validation', () => {
  const hook = hookNamed(campaignHooks, 'campaign_validation');

  it('rejects a start_date after the end_date', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert', input: { start_date: '2026-06-01', end_date: '2026-01-01' },
      })),
    ).rejects.toThrow(/must not be after end_date/);
  });

  it('refuses to move to in_progress without both dates', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate', input: { status: 'in_progress' }, previous: { start_date: '2026-01-01' },
      })),
    ).rejects.toThrow(/without both start_date and end_date/);
  });

  it('allows in_progress once both dates are present', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeUpdate',
        input: { status: 'in_progress' },
        previous: { start_date: '2026-01-01', end_date: '2026-12-31' },
      })),
    ).resolves.toBeUndefined();
  });
});

describe('campaign_snapshot_metrics', () => {
  const hook = hookNamed(campaignHooks, 'campaign_snapshot_metrics');

  const complete = (h: ReturnType<typeof makeHarness>) =>
    hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'cmp1', status: 'completed' },
      previous: { id: 'cmp1', status: 'in_progress' },
      user: USER,
      api: h.api,
    }));

  it('counts leads through the campaign_member junction, not a lead.campaign field', async () => {
    // `crm_lead` has NO `campaign` field. The old direct-count queries matched
    // nothing, so every lead metric snapshot was silently zero.
    const h = makeHarness({
      crm_campaign: [{ id: 'cmp1', status: 'completed' }],
      crm_campaign_member: [
        { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'responded' },
        { id: 'm2', crm_campaign: 'cmp1', crm_lead: 'l2', status: 'sent' },
        { id: 'm3', crm_campaign: 'cmp1', crm_lead: 'l2', status: 'responded' }, // dup lead
        { id: 'm4', crm_campaign: 'other', crm_lead: 'l9', status: 'responded' },
      ],
      crm_lead: [
        { id: 'l1', is_converted: true },
        { id: 'l2', is_converted: false },
      ],
      crm_opportunity: [
        { id: 'o1', crm_campaign: 'cmp1', stage: 'closed_won', amount: 100 },
        { id: 'o2', crm_campaign: 'cmp1', stage: 'proposal', amount: 50 },
        { id: 'o3', crm_campaign: 'cmp1', stage: 'closed_won', amount: 400 },
      ],
    });
    await complete(h);

    const campaign = h.rows('crm_campaign')[0];
    expect(campaign.num_leads, 'distinct leads via the junction').toBe(2);
    expect(campaign.num_converted_leads).toBe(1);
    expect(campaign.num_opportunities).toBe(3);
    expect(campaign.num_won_opportunities).toBe(2);
    expect(campaign.actual_revenue).toBe(500);
    // num_sent is "total members enrolled" — the old `sent || members` form
    // under-counted as members progressed past `sent`.
    expect(campaign.num_sent).toBe(3);
    expect(campaign.num_responses).toBe(2);
  });

  it('snapshots zeroes rather than skipping when a campaign has no members', async () => {
    const h = makeHarness({
      crm_campaign: [{ id: 'cmp1', status: 'completed' }],
      crm_campaign_member: [],
      crm_lead: [],
      crm_opportunity: [],
    });
    await complete(h);
    const campaign = h.rows('crm_campaign')[0];
    expect(campaign.num_leads).toBe(0);
    expect(campaign.actual_revenue).toBe(0);
  });

  it('is a no-op unless the campaign just became completed', async () => {
    const h = makeHarness({ crm_campaign: [{ id: 'cmp1' }] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'cmp1', status: 'completed' },
      previous: { id: 'cmp1', status: 'completed' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────── forecast ──

describe('forecast_derive_period', () => {
  const hook = hookNamed(forecastHooks, 'forecast_derive_period');

  it('derives month end and label', async () => {
    const input: Rec = { period: 'month', period_start: '2026-02-01' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.period_end).toBe('2026-02-28');
    expect(input.period_label).toBe('Feb 2026');
  });

  it('handles a leap February', async () => {
    const input: Rec = { period: 'month', period_start: '2028-02-01' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.period_end).toBe('2028-02-29');
  });

  it('derives quarter end and label', async () => {
    const input: Rec = { period: 'quarter', period_start: '2026-04-01' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.period_end).toBe('2026-06-30');
    expect(input.period_label).toBe('Q2 2026');
  });

  it('defaults period to month and stamps snapshot_date', async () => {
    const input: Rec = { period_start: '2026-03-01' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.period_end).toBe('2026-03-31');
    expect(input.snapshot_date).toBe(today());
  });

  it('never overwrites values the caller supplied', async () => {
    const input: Rec = {
      period: 'month', period_start: '2026-02-01',
      period_end: '2026-02-20', period_label: 'Custom', snapshot_date: '2020-01-01',
    };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.period_end).toBe('2026-02-20');
    expect(input.period_label).toBe('Custom');
    expect(input.snapshot_date).toBe('2020-01-01');
  });

  it('ignores an unparseable period_start instead of writing Invalid Date', async () => {
    const input: Rec = { period: 'month', period_start: 'not-a-date' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.period_end).toBeUndefined();
    expect(input.period_label).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────── knowledge article ──

describe('knowledge_article_publish_timestamps', () => {
  const hook = hookNamed(knowledgeHooks, 'knowledge_article_publish_timestamps');

  it('stamps both timestamps on the transition into published', async () => {
    const input: Rec = { status: 'published' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous: { status: 'draft' } }));
    expect(input.published_at).toBeTruthy();
    expect(input.last_reviewed_at).toBe(input.published_at);
  });

  it('refreshes only last_reviewed_at when editing an already-published article', async () => {
    const input: Rec = { title: 'Revised' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate', input, previous: { status: 'published', published_at: '2020-01-01T00:00:00.000Z' },
    }));
    expect(input.published_at, 'republishing must not move the original publish date').toBeUndefined();
    expect(input.last_reviewed_at).toBeTruthy();
  });

  it('stamps nothing for a draft', async () => {
    const input: Rec = { status: 'draft' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.published_at).toBeUndefined();
    expect(input.last_reviewed_at).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────── lead ──

describe('lead_automation', () => {
  const hook = hookNamed(leadHooks, 'lead_automation');

  it('scores a senior contact at a high-value corporate domain highly', async () => {
    const input: Rec = {
      email: 'cto@acme.io', phone: '+1 555 0100', title: 'CTO',
      industry: 'technology', number_of_employees: 500, annual_revenue: 50_000_000,
    };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.rating).toBe(5); // 1 + .5 + 1.5 + 1 + .5 + .5 = 5
  });

  it('scores a bare free-mail lead at the floor', async () => {
    const input: Rec = { email: 'someone@gmail.com' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.rating).toBe(1);
  });

  it('always produces a WHOLE star between 1 and 5', async () => {
    // `rating` is a 1-5 star field; half values rendered inconsistently.
    const inputs: Rec[] = [
      { email: 'a@acme.io' },
      { email: 'a@acme.io', phone: '555' },
      { title: 'Director' },
      { email: 'a@acme.io', title: 'VP', industry: 'finance' },
    ];
    for (const input of inputs) {
      await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
      expect(Number.isInteger(input.rating), `rating ${input.rating} is not whole`).toBe(true);
      expect(input.rating).toBeGreaterThanOrEqual(1);
      expect(input.rating).toBeLessThanOrEqual(5);
    }
  });

  it('respects an explicitly supplied rating', async () => {
    const input: Rec = { email: 'a@gmail.com', rating: 4 };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.rating).toBe(4);
  });

  it('stamps web defaults and strips conversion/ownership fields on an anonymous submission', async () => {
    const input: Rec = {
      company: 'FromWebForm', is_converted: true, converted_account: 'acc1',
      converted_contact: 'c1', converted_opportunity: 'o1', converted_date: '2020-01-01',
      owner: 'spoofed',
    };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: SYSTEM }));
    expect(input.lead_source).toBe('web');
    expect(input.status).toBe('new');
    for (const stripped of [
      'is_converted', 'converted_account', 'converted_contact',
      'converted_opportunity', 'converted_date', 'owner',
    ]) {
      expect(input, `public form kept ${stripped}`).not.toHaveProperty(stripped);
    }
  });

  it('locks identity fields on a converted lead but leaves notes editable', async () => {
    const previous: Rec = { id: 'l1', is_converted: true, company: 'Acme' };
    await expect(
      hook.handler(makeCtx({ event: 'beforeUpdate', input: { company: 'Other' }, previous, user: USER })),
    ).rejects.toThrow(/Cannot edit a converted lead/);
    await expect(
      hook.handler(makeCtx({ event: 'beforeUpdate', input: { description: 'note' }, previous, user: USER })),
    ).resolves.toBeUndefined();
  });

  it('lets a SYSTEM write through the converted-lead lock', async () => {
    const previous: Rec = { id: 'l1', status: 'converted', company: 'Acme' };
    await expect(
      hook.handler(makeCtx({ event: 'beforeUpdate', input: { company: 'Other' }, previous, user: SYSTEM })),
    ).resolves.toBeUndefined();
  });

  it('schedules a follow-up task when a lead becomes qualified', async () => {
    const h = makeHarness({ crm_task: [] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'l1', status: 'qualified', owner: 'rep1' },
      previous: { id: 'l1', status: 'working' },
      user: USER,
      api: h.api,
    }));
    const [task] = h.rows('crm_task');
    expect(task, 'no follow-up task created').toBeTruthy();
    expect(task.priority).toBe('high');
    expect(task.owner).toBe('rep1');
    expect(task.related_to_lead).toBe('l1');
    expect(task.due_date).toBe(daysFromNow(2));
  });

  it('does not re-schedule for a lead that was already qualified', async () => {
    const h = makeHarness({ crm_task: [] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'l1', status: 'qualified' },
      previous: { id: 'l1', status: 'qualified' },
      user: USER,
      api: h.api,
    }));
    expect(h.rows('crm_task')).toHaveLength(0);
  });
});

describe('lead_auto_assign — permission resilience', () => {
  const hook = hookNamed(leadHooks, 'lead_auto_assign');

  it('never throws when the rep-pool lookup is denied (anonymous Web-to-Lead)', async () => {
    // The public-form grant denies `find` on sys_user_position. The hook must
    // swallow that and leave the lead ownerless — NOT reject the insert.
    const input: Rec = { company: 'FromWebForm' };
    await expect(
      hook.handler(makeCtx({ event: 'beforeInsert', input, api: makeDeniedApi() })),
    ).resolves.toBeUndefined();
    expect(input.owner).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────── task ──

describe('task_completion', () => {
  const hook = hookNamed(taskHooks, 'task_completion');

  it('lands reminder_sent as a real boolean on insert, never NULL', async () => {
    const input: Rec = { subject: 'Call' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.reminder_sent).toBe(false);
  });

  it('materialises priority_rank (urgent outranks high)', async () => {
    for (const [priority, rank] of [['low', 1], ['normal', 2], ['high', 3], ['urgent', 4]] as const) {
      const input: Rec = { priority };
      await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
      expect(input.priority_rank).toBe(rank);
    }
  });

  it('stamps completed_date and 100% progress on the completing transition', async () => {
    const input: Rec = { status: 'completed' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous: { status: 'in_progress' }, user: USER }));
    expect(input.completed_date).toBeTruthy();
    expect(input.progress_percent).toBe(100);
    expect(input.is_completed).toBe(true);
  });

  it('flags an overdue open task and clears the flag once completed', async () => {
    const overdue: Rec = { due_date: daysFromNow(-3), status: 'in_progress' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input: overdue, previous: {}, user: USER }));
    expect(overdue.is_overdue).toBe(true);

    const done: Rec = { due_date: daysFromNow(-3), status: 'completed' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input: done, previous: { status: 'open' }, user: USER }));
    expect(done.is_overdue).toBe(false);
  });

  it('rejects a reminder scheduled after the due date', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { due_date: '2026-01-01', reminder_date: '2026-02-01' },
        user: USER,
      })),
    ).rejects.toThrow(/is after the due date/);
  });

  it('accepts a reminder on the due date itself', async () => {
    await expect(
      hook.handler(makeCtx({
        event: 'beforeInsert',
        input: { due_date: '2026-01-01', reminder_date: '2026-01-01T09:00:00.000Z' },
        user: USER,
      })),
    ).resolves.toBeUndefined();
  });
});

describe('task_recurrence', () => {
  const hook = hookNamed(taskHooks, 'task_recurrence');

  const completeRecurring = (h: ReturnType<typeof makeHarness>, previous: Rec) =>
    hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 't1', status: 'completed' },
      previous: { id: 't1', status: 'in_progress', ...previous },
      user: USER,
      api: h.api,
    }));

  it.each([
    ['daily', 1, '2026-01-01', '2026-01-02'],
    ['weekly', 2, '2026-01-01', '2026-01-15'],
    ['monthly', 1, '2026-01-15', '2026-02-15'],
    ['monthly', 3, '2026-01-15', '2026-04-15'],
    // Month-end CLAMPS instead of overflowing. `Date.setMonth` used to roll
    // Jan 31 + 1 month forward to Mar 3, so a month-end series walked deeper
    // into the following month on every occurrence and skipped February.
    ['monthly', 1, '2026-01-31', '2026-02-28'],
    ['monthly', 1, '2028-01-31', '2028-02-29'], // leap year
    ['monthly', 1, '2026-03-31', '2026-04-30'],
    ['monthly', 2, '2026-01-31', '2026-03-31'], // target month is long enough
    ['yearly', 1, '2026-03-01', '2027-03-01'],
    ['yearly', 1, '2028-02-29', '2029-02-28'], // leap day → last valid day
  ])('advances a %s/%i series from %s to %s', async (type, interval, from, to) => {
    const h = makeHarness({ crm_task: [] });
    await completeRecurring(h, {
      subject: 'Weekly sync', priority: 'normal', is_recurring: true,
      recurrence_type: type, recurrence_interval: interval, due_date: from,
    });
    const [next] = h.rows('crm_task');
    expect(next, 'no next occurrence spawned').toBeTruthy();
    expect(next.due_date).toBe(to);
  });

  it('a month-end series settles on the shorter day rather than walking forward', async () => {
    // Each occurrence is computed from the PREVIOUS due date, not from an
    // anchor day, so clamping Jan 31 → Feb 28 makes the following occurrence
    // Mar 28 rather than Mar 31. That is a deliberate trade: the alternative
    // (storing an anchor) is a schema change, and the behaviour being replaced
    // was strictly worse — `setMonth` overflow walked Jan 31 → Mar 3 → Apr 3,
    // drifting FORWARD and skipping February outright.
    const dueDates: string[] = [];
    let due = '2026-01-31';
    for (let i = 0; i < 3; i++) {
      const h = makeHarness({ crm_task: [] });
      await completeRecurring(h, {
        subject: 'Month end', is_recurring: true,
        recurrence_type: 'monthly', recurrence_interval: 1, due_date: due,
      });
      due = h.rows('crm_task')[0].due_date as string;
      dueDates.push(due);
    }
    expect(dueDates).toEqual(['2026-02-28', '2026-03-28', '2026-04-28']);
  });

  it('spawns the next occurrence as not_started so it cannot re-trigger itself', async () => {
    const h = makeHarness({ crm_task: [] });
    await completeRecurring(h, {
      subject: 'Weekly sync', is_recurring: true, recurrence_type: 'weekly',
      recurrence_interval: 1, due_date: daysFromNow(0), owner: 'rep1',
    });
    const [next] = h.rows('crm_task');
    expect(next.status).toBe('not_started');
    expect(next.is_completed).toBe(false);
    expect(next.reminder_sent).toBe(false);
    expect(next.subject).toBe('Weekly sync');
    expect(next.owner).toBe('rep1');
    expect(next.is_recurring).toBe(true);
  });

  it('advances the reminder alongside the due date', async () => {
    const h = makeHarness({ crm_task: [] });
    await completeRecurring(h, {
      subject: 'Sync', is_recurring: true, recurrence_type: 'daily', recurrence_interval: 1,
      due_date: '2026-01-01', reminder_date: '2026-01-01T09:00:00.000Z',
    });
    expect(h.rows('crm_task')[0].reminder_date).toContain('2026-01-02');
  });

  it('stops the series once the next occurrence would pass recurrence_end_date', async () => {
    const h = makeHarness({ crm_task: [] });
    await completeRecurring(h, {
      subject: 'Sync', is_recurring: true, recurrence_type: 'weekly', recurrence_interval: 1,
      due_date: '2026-01-01', recurrence_end_date: '2026-01-05',
    });
    expect(h.rows('crm_task')).toHaveLength(0);
  });

  it('ignores non-recurring tasks and unknown recurrence types', async () => {
    const h = makeHarness({ crm_task: [] });
    await completeRecurring(h, { subject: 'One-off', due_date: '2026-01-01' });
    await completeRecurring(h, {
      subject: 'Odd', is_recurring: true, recurrence_type: 'fortnightly', due_date: '2026-01-01',
    });
    expect(h.rows('crm_task')).toHaveLength(0);
  });

  it('does not spawn on an edit to an already-completed task', async () => {
    const h = makeHarness({ crm_task: [] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 't1', description: 'tweak' },
      previous: {
        id: 't1', status: 'completed', is_recurring: true,
        recurrence_type: 'daily', recurrence_interval: 1, due_date: '2026-01-01',
      },
      user: USER,
      api: h.api,
    }));
    expect(h.rows('crm_task')).toHaveLength(0);
  });
});

describe('task_activity_bubble', () => {
  const hook = hookNamed(taskHooks, 'task_activity_bubble');

  it('bubbles last_activity_date to a related account', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 't1', related_to_type: 'crm_account', related_to_account: 'acc1' },
      previous: { id: 't1' },
      user: USER,
      api: h.api,
    }));
    expect(h.rows('crm_account')[0].last_activity_date).toBe(today());
  });

  it('uses last_contacted_date for a lead, which has no last_activity_date', async () => {
    const h = makeHarness({ crm_lead: [{ id: 'l1' }] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 't1', related_to_type: 'crm_lead', related_to_lead: 'l1' },
      previous: { id: 't1' },
      user: USER,
      api: h.api,
    }));
    const lead = h.rows('crm_lead')[0];
    expect(lead.last_activity_date, 'crm_lead has no last_activity_date column').toBeUndefined();
    expect(typeof lead.last_contacted_date).toBe('string');
  });

  it.each(['crm_contact', 'crm_opportunity', 'crm_case'])(
    'writes nothing for %s, which carries no activity timestamp', async (type) => {
      const h = makeHarness({ [type]: [{ id: 'x1' }] });
      const refField = {
        crm_contact: 'related_to_contact',
        crm_opportunity: 'related_to_opportunity',
        crm_case: 'related_to_case',
      }[type]!;
      await hook.handler(makeCtx({
        event: 'afterUpdate',
        input: { id: 't1', related_to_type: type, [refField]: 'x1' },
        previous: { id: 't1' },
        user: USER,
        api: h.api,
      }));
      expect(h.calls).toHaveLength(0);
    },
  );

  it('is a no-op with no parent, and never propagates a write failure', async () => {
    const h = makeHarness({});
    await hook.handler(makeCtx({
      event: 'afterUpdate', input: { id: 't1' }, previous: { id: 't1' }, user: USER, api: h.api,
    }));
    expect(h.calls).toHaveLength(0);

    // A denied write must be swallowed — the bubble is best-effort and must
    // never break the parent task write.
    await expect(
      hook.handler(makeCtx({
        event: 'afterUpdate',
        input: { id: 't1', related_to_type: 'crm_account', related_to_account: 'acc1' },
        previous: { id: 't1' },
        user: USER,
        api: makeDeniedApi('denied'),
      })),
    ).resolves.toBeUndefined();
  });
});
