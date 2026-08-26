// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import campaignHooks, { CAMPAIGN_METRIC_WRITE_KEYS } from '../src/objects/campaign.hook';
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

  it('gives a non-critical case an SLA too, off the priority × tier matrix', async () => {
    // This assertion used to read `expect(input.sla_due_date).toBeUndefined()`
    // — High, Medium and Low cases got no clock at all, which is what kept
    // `case_sla_monitor` from ever firing for three of the four priorities
    // (#595). The cells themselves are pinned in `test/case-sla-matrix.test.ts`;
    // here the point is only that the field is no longer blank. With no `api`
    // the tier is unresolvable, so this lands on the default `smb` column.
    const input: Rec = { priority: 'high' };
    const before = Date.now();
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    const due = new Date(input.sla_due_date as string).getTime();
    expect(due).toBeGreaterThan(before + 7.9 * 3_600_000);
    expect(due).toBeLessThan(before + 8.1 * 3_600_000);
  });

  it('stamps defaults and strips privileged fields on an anonymous guest submission', async () => {
    const input: Rec = {
      subject: 'Help', owner_id: 'spoofed', is_escalated: true, is_closed: true,
      internal_notes: 'nope', resolution: 'nope', escalation_reason: 'nope',
    };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: SYSTEM }));
    expect(input.origin).toBe('web');
    expect(input.status).toBe('new');
    // ⚠️ NOT 'medium', and NOT 'low' either (#1296). This assertion is the ONLY
    // place in the repo where the branch's deleted `if (!input.priority)
    // input.priority = 'medium'` was ever observable — and it was observable
    // here precisely because this harness does NOT model the engine's insert
    // path. `crm_case.priority` declares its `low` option `default: true`, and
    // the engine's `applyFieldDefaults` builds the row that BECOMES
    // `ctx.input.data` before `beforeInsert` is triggered, so in production the
    // slot was always already full and that line never once fired. The fast
    // harness applies no field defaults, so the key simply never arrives. A
    // dead line looked alive for as long as it did because of this gap.
    // The hook must not invent a priority: the field owns it.
    expect(
      input.priority,
      'the guest branch must not default `priority` — the field declares `low` as ' +
        '`default: true` and the engine applies it before beforeInsert. This harness ' +
        'applies no field defaults, so an ABSENT key is the correct reading here; ' +
        "'low' would be asserting a default this harness never applies.",
    ).toBeUndefined();
    // The branch OVERWRITES with a safe value; it no longer removes the key
    // (#1133). `delete` on a hook's `input` is a silent no-op through the real
    // engine — this harness calls the handler with a plain object, where it
    // works, which is exactly why an absence assertion here stayed green while
    // nothing was being stripped in production. Assert the values instead.
    for (const [stripped, safe] of [
      ['owner_id', null], ['internal_notes', null], ['resolution', null],
      // The flag AND the prose explaining it (#1296): a case stating an escalation
      // reason while not escalated contradicts itself in one field group.
      ['is_escalated', false], ['escalation_reason', null],
      // Derived from the stored status rather than stripped, so a guest can no
      // longer store `closed` and `is_closed: false` side by side.
      ['is_closed', false],
    ] as Array<[string, unknown]>) {
      expect(input[stripped], `guest submission kept privileged field ${stripped}`).toBe(safe);
    }
  });

  it('leaves a priority the engine already defaulted alone', async () => {
    // The other half of the deleted line, in the one shape where `'low'` IS a
    // true statement about this harness: hand the hook the input the ENGINE
    // would have handed it — `applyFieldDefaults` has already stamped the
    // field's `default: true` option — and the guest branch must leave it be.
    // Before #1296 the branch's own `if (!input.priority)` guard made this pass
    // too; what changed is that there is no longer any code here that could
    // overwrite it, so the field is now the single source of the default.
    const input: Rec = { subject: 'Help', priority: 'low' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: SYSTEM }));

    expect(input.origin, 'the guest branch did not run at all (positive control)').toBe('web');
    expect(input.priority, 'the guest branch overwrote a priority the engine had defaulted').toBe('low');
    // Derived by the hook FROM what it saw, so it reports the value the branch
    // actually read rather than the one that ended up stored.
    expect(input.priority_rank, 'the rank must follow the priority the hook saw').toBe(1);
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
      crm_account: [{ id: 'acc1', owner_id: 'rep1' }],
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
    expect(task.owner_id).toBe('rep1');
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
    const h = makeHarness({ crm_account: [{ id: 'acc1', owner_id: 'rep1' }], crm_task: [] });
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

describe('campaign_metrics_refresh', () => {
  const hook = hookNamed(campaignHooks, 'campaign_metrics_refresh');

  const transition = (
    h: ReturnType<typeof makeHarness>,
    status = 'completed',
    from = 'in_progress',
  ) =>
    hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'cmp1', status },
      previous: { id: 'cmp1', status: from },
      user: USER,
      api: h.api,
    }));

  const populated = () => makeHarness({
    crm_campaign: [{ id: 'cmp1', status: 'in_progress' }],
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

  it('counts leads through the campaign_member junction, not a lead.campaign field', async () => {
    // `crm_lead` has NO `campaign` field. The old direct-count queries matched
    // nothing, so every lead metric was silently zero.
    const h = populated();
    await transition(h);

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

  it('writes zeroes rather than skipping when a campaign has no members', async () => {
    const h = makeHarness({
      crm_campaign: [{ id: 'cmp1', status: 'in_progress' }],
      crm_campaign_member: [],
      crm_lead: [],
      crm_opportunity: [],
    });
    await transition(h);
    const campaign = h.rows('crm_campaign')[0];
    expect(campaign.num_leads).toBe(0);
    expect(campaign.actual_revenue).toBe(0);
  });

  /**
   * #597: the trigger is a status TRANSITION, not the `→ completed` one.
   *
   * The hook this replaced fired only on the move into `completed`, which meant
   * a campaign reported zeros for its entire useful life. Pinning the
   * in_progress transition is what separates "recompute" from "snapshot on
   * completion" — the old handler was green on the completed case too.
   */
  it('recomputes on a transition that is not completion at all', async () => {
    const h = populated();
    h.rows('crm_campaign')[0].status = 'planning';
    await transition(h, 'in_progress', 'planning');
    expect(h.rows('crm_campaign')[0].num_sent, 'a live campaign reports live numbers').toBe(3);
  });

  it('is a no-op when the status did not move', async () => {
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

  /**
   * THE RECURSION GUARD, both halves.
   *
   * This hook writes `crm_campaign` and listens on `crm_campaign`, so a refresh
   * write that carried `status` would re-enter itself forever. Half one: the
   * handler ignores a write with no status key. Half two: the write it emits
   * carries only the metric block, which is what makes half one sufficient.
   */
  it('ignores a metric-only write, and emits one', async () => {
    const h = populated();
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'cmp1', num_sent: 3 },
      previous: { id: 'cmp1', status: 'in_progress' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls, 'a metric-only write must not re-enter the refresh').toHaveLength(0);

    await transition(h);
    const writes = h.callsFor('crm_campaign', 'update');
    expect(writes).toHaveLength(1);
    const doc = writes[0].args[0] as Rec;
    expect(
      Object.keys(doc).filter((k) => !CAMPAIGN_METRIC_WRITE_KEYS.includes(k)),
      'the refresh write must carry nothing that could re-trigger it',
    ).toEqual([]);
  });
});

describe('campaign_attribution_refresh', () => {
  const hook = hookNamed(campaignHooks, 'campaign_attribution_refresh');

  /**
   * `num_opportunities` / `num_won_opportunities` / `actual_revenue` derive from
   * opportunities, so the membership trigger alone would leave exactly the
   * three metrics `roi` is built on stale.
   */
  it('recomputes the campaign when an opportunity is won', async () => {
    const h = makeHarness({
      crm_campaign: [{ id: 'cmp1', status: 'in_progress', actual_revenue: 0 }],
      crm_campaign_member: [{ id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'responded' }],
      crm_lead: [{ id: 'l1', is_converted: false }],
      crm_opportunity: [{ id: 'o1', crm_campaign: 'cmp1', stage: 'closed_won', amount: 900 }],
    });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'o1', crm_campaign: 'cmp1', stage: 'closed_won' },
      previous: { id: 'o1', crm_campaign: 'cmp1', stage: 'negotiation' },
      user: USER,
      api: h.api,
    }));
    expect(h.rows('crm_campaign')[0].actual_revenue).toBe(900);
    expect(h.rows('crm_campaign')[0].num_won_opportunities).toBe(1);
  });

  it('recomputes BOTH campaigns when an opportunity is re-attributed', async () => {
    const h = makeHarness({
      crm_campaign: [
        { id: 'cmp1', status: 'in_progress' },
        { id: 'cmp2', status: 'in_progress' },
      ],
      crm_campaign_member: [],
      crm_lead: [],
      crm_opportunity: [{ id: 'o1', crm_campaign: 'cmp2', stage: 'closed_won', amount: 700 }],
    });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'o1', crm_campaign: 'cmp2' },
      previous: { id: 'o1', crm_campaign: 'cmp1' },
      user: USER,
      api: h.api,
    }));
    const byId = Object.fromEntries(h.rows('crm_campaign').map((c) => [c.id, c]));
    expect(byId.cmp2.actual_revenue, 'the new campaign gains it').toBe(700);
    expect(byId.cmp1.actual_revenue, 'the old campaign gives it up').toBe(0);
  });
});

describe('campaign_lead_conversion_refresh', () => {
  const hook = hookNamed(campaignHooks, 'campaign_lead_conversion_refresh');

  const convert = (h: ReturnType<typeof makeHarness>) =>
    hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'l1', is_converted: true },
      previous: { id: 'l1', is_converted: false },
      user: USER,
      api: h.api,
    }));

  const store = () => ({
    crm_campaign: [
      { id: 'cmp1', status: 'in_progress' },
      { id: 'cmp2', status: 'in_progress' },
    ],
    crm_campaign_member: [
      { id: 'm1', crm_campaign: 'cmp1', crm_lead: 'l1', status: 'responded' },
      { id: 'm2', crm_campaign: 'cmp2', crm_lead: 'l1', status: 'sent' },
      { id: 'm3', crm_campaign: 'cmp1', crm_lead: 'l2', status: 'sent' },
    ],
    crm_lead: [
      { id: 'l1', is_converted: true },
      { id: 'l2', is_converted: false },
    ],
    crm_opportunity: [],
  });

  /**
   * `converted` is a status option the picklist offers and the ROI surfaces
   * segment by. This hook is its ONLY writer — without it the value would be
   * exactly the inert vocabulary #597 removed `opened`/`clicked`/`bounced` for.
   */
  it('promotes every membership of the converting lead to `converted`', async () => {
    const h = makeHarness(store());
    await convert(h);
    const byId = Object.fromEntries(h.rows('crm_campaign_member').map((m) => [m.id, m]));
    expect(byId.m1.status, 'a responded member converts').toBe('converted');
    expect(byId.m2.status, 'a sent member converts too').toBe('converted');
    expect(byId.m3.status, "another lead's membership is untouched").toBe('sent');
  });

  it('never drags an unsubscribed member back into the funnel', async () => {
    // That person asked to be left alone; `campaign_member_optout_sync` has
    // already opted them out of email, and overwriting the status here would
    // leave the two records disagreeing about the same human being.
    const seed = store();
    seed.crm_campaign_member[1].status = 'unsubscribed';
    const h = makeHarness(seed);
    await convert(h);
    const byId = Object.fromEntries(h.rows('crm_campaign_member').map((m) => [m.id, m]));
    expect(byId.m2.status).toBe('unsubscribed');
  });

  it('refreshes every campaign the lead belongs to', async () => {
    const h = makeHarness(store());
    await convert(h);
    const byId = Object.fromEntries(h.rows('crm_campaign').map((c) => [c.id, c]));
    expect(byId.cmp1.num_converted_leads).toBe(1);
    expect(byId.cmp2.num_converted_leads).toBe(1);
  });

  /**
   * The promotion moves m1 from `responded` to `converted`, and a response
   * count matching only the exact `responded` string would DEDUCT the response
   * it grew out of — response_rate falling as the campaign succeeded.
   * `computeCampaignMetrics` counts both states for this reason, so cmp1's one
   * response survives its own success. Under the narrow predicate this reads 0.
   */
  it('conversion does not deduct the response it grew out of', async () => {
    const h = makeHarness(store());
    const before = h.rows('crm_campaign_member').filter(
      (m) => m.crm_campaign === 'cmp1' && m.status === 'responded',
    ).length;
    expect(before, 'cmp1 starts with exactly one responded member').toBe(1);
    await convert(h);
    expect(h.rows('crm_campaign_member').find((m) => m.id === 'm1')!.status).toBe('converted');
    expect(h.rows('crm_campaign').find((c) => c.id === 'cmp1')!.num_responses).toBe(1);
  });

  it('does nothing when is_converted did not just flip', async () => {
    const h = makeHarness(store());
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'l1', is_converted: true },
      previous: { id: 'l1', is_converted: true },
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

  /**
   * The two halves of the DERIVATION contract, pinned against the handler
   * rather than against the wish (#748) — and, since #1111, deliberately not
   * against the docs page either.
   *
   * The page used to claim the boundary is "always computed, never typed", one
   * sentence after teaching that a caller may supply `period_start`. Only the
   * first case below is a computed boundary; the second is kept verbatim. That
   * is a statement about THIS HANDLER, and it is still exactly true: the hook
   * fills blanks and never rewrites a supplied value. If the derivation ever
   * starts snapping a supplied `period_start` to the calendar boundary — the
   * contract change option #748 deliberately did NOT take — the second
   * assertion goes red.
   *
   * What is no longer true is the *storage* claim the docs used to draw from
   * it. A mid-quarter `period_start` reaches the driver only in this unit
   * harness, which runs the handler alone; through a real ObjectQL the write
   * is refused by `period_start_first_of_period` /
   * `quarter_starts_on_quarter_boundary` (#1008 / PR #1081), with
   * `period_end_matches_calendar_period` (#1093 / PR #1110) closing the other
   * end. Those refusals are pinned in `forecast-period-boundary.test.ts` and
   * `forecast-period-end-boundary.test.ts`; `content/docs/sales/forecasting*.mdx`
   * was rewritten for the full rule set in #1111. Read the second case below as
   * "the hook does not silently correct you" — the schema refuses you instead —
   * and not as "such a row can be stored".
   */
  it('snaps to the calendar boundary only when the caller sends no period_start (#748)', async () => {
    const derived: Rec = { period: 'quarter', snapshot_date: '2026-08-02' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input: derived }));
    expect(derived.period_start).toBe('2026-07-01');
    expect(derived.period_end).toBe('2026-09-30');
    expect(derived.period_label).toBe('Q3 2026');
  });

  it('keeps a hand-supplied period_start verbatim, mid-period and all (#748)', async () => {
    const typed: Rec = { period: 'quarter', period_start: '2026-07-15' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input: typed }));
    // NOT snapped to 2026-07-01. The handler leaves the caller's value alone;
    // the schema is what refuses it (see the note above) — so a mid-quarter
    // start never reaches the surfaces that pin `period_start` to the quarter's
    // first day (the `This Quarter` list view, the quota-attainment widget).
    expect(typed.period_start).toBe('2026-07-15');
    expect(typed.period_label).toBe('Q3 2026');
  });
});

// ──────────────────────────────────────────────────── knowledge article ──

/**
 * The article lifecycle is `draft → in_review → published → archived`, and
 * every arrow that ENDS on `published` is covered below, because the criterion
 * the hook applies is not "which status did we come from" but "does this record
 * already carry a `published_at`" (#780).
 *
 * The distinction is what the old implementation got wrong. It asked
 * `previous.status === 'published'`, which recognises only the
 * published → published edit as a re-publish; `archived → published` — the
 * ordinary re-shelving move — therefore fell into the FIRST-publish branch and
 * moved the original date to today. `all_articles` sorts `published_at desc`,
 * so a 2024 article re-shelved this year jumped to the top of the list as if
 * newly written. One test covering only published → published is exactly how
 * the assertion below ("must not move the original publish date") stayed green
 * while the invariant it names was broken on the other arrow.
 */
describe('knowledge_article_publish_timestamps', () => {
  const hook = hookNamed(knowledgeHooks, 'knowledge_article_publish_timestamps');
  const ORIGINAL_PUBLISH = '2024-03-01T00:00:00.000Z';

  it('stamps both timestamps on the draft → published first publish', async () => {
    const input: Rec = { status: 'published' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous: { status: 'draft' } }));
    expect(input.published_at).toBeTruthy();
    expect(input.last_reviewed_at).toBe(input.published_at);
  });

  it('stamps both timestamps on the in_review → published first publish', async () => {
    // The reviewed route to the same first publish — no `published_at` exists
    // yet on either, so both must stamp one.
    const input: Rec = { status: 'published' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous: { status: 'in_review' } }));
    expect(input.published_at).toBeTruthy();
    expect(input.last_reviewed_at).toBe(input.published_at);
  });

  it('refreshes only last_reviewed_at when editing an already-published article', async () => {
    const input: Rec = { title: 'Revised' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate', input, previous: { status: 'published', published_at: ORIGINAL_PUBLISH },
    }));
    expect(input.published_at, 'republishing must not move the original publish date').toBeUndefined();
    expect(input.last_reviewed_at).toBeTruthy();
  });

  it('keeps the original published_at when an ARCHIVED article is re-published', async () => {
    // The arrow the old status test could not see (#780): `previous.status` is
    // 'archived', so it read as a first publish and re-stamped a date the
    // article had held since 2024.
    const input: Rec = { status: 'published' };
    await hook.handler(makeCtx({
      event: 'beforeUpdate', input, previous: { status: 'archived', published_at: ORIGINAL_PUBLISH },
    }));
    expect(input.published_at, 'republishing must not move the original publish date').toBeUndefined();
    expect(input.last_reviewed_at, 're-shelving an article is itself a review').toBeTruthy();
  });

  it('stamps published_at when an article archived before it ever shipped is published', async () => {
    // Existence of the date, not the previous status, is the criterion: a draft
    // archived without ever being published has no original date to keep, so
    // this IS its first publish. (This arrow behaves the same under the old
    // status test — it pins the criterion, it does not discriminate between
    // the two implementations.)
    const input: Rec = { status: 'published' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous: { status: 'archived' } }));
    expect(input.published_at).toBeTruthy();
    expect(input.last_reviewed_at).toBe(input.published_at);
  });

  it('honours a published_at carried by the write itself', async () => {
    // The other slot the date can arrive in, and it is not hypothetical:
    // measured end-to-end on a real engine, an insert carrying `published_at`
    // stores exactly what it supplied (the read-only strip runs on the update
    // path only, and hooks run ahead of it regardless). So an import or
    // migration publishing records with their historical dates — the shape the
    // `src/data/service.seed.ts` records use — reaches this handler with
    // `published_at` on `input` and no `previous`. Stamping over it rewrites
    // imported history exactly as the archived case rewrites a re-shelved
    // article's.
    const input: Rec = { status: 'published', published_at: ORIGINAL_PUBLISH };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.published_at, 'an explicitly supplied publish date is history, not a default')
      .toBe(ORIGINAL_PUBLISH);
    expect(input.last_reviewed_at).toBeTruthy();
  });

  it('stamps nothing for a draft', async () => {
    const input: Rec = { status: 'draft' };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.published_at).toBeUndefined();
    expect(input.last_reviewed_at).toBeUndefined();
  });
});

/**
 * The #1265 tripwire — why the batch-widening defect above is NOT fixed here,
 * expressed as an assertion instead of a paragraph.
 *
 * ADR-0058 Addendum II D3 makes the predicate-update payload BATCH-scoped: all
 * N per-row `beforeUpdate` dispatches share ONE payload object, so a rewrite
 * conditioned on the row widens to every matched row. `published_at`'s
 * existence criterion is exactly that, and it is measurably live.
 *
 * D3 also names the three routes out — throw, write per row through `ctx.api`,
 * or have the caller paginate — and every one of them needs the handler to know
 * it is on the per-row path. This asserts that it cannot know, on the surface
 * this repo actually ships hooks on.
 *
 * Note what the tests above CANNOT see: each hands `hook.handler` a fresh
 * `input` object, which is per-row payload COPIES — the shape D3 explicitly
 * says the engine does not build for `beforeUpdate`. They would stay green
 * before and after any fix, so they are no pin on row scoping. This is.
 *
 * WHEN THIS TEST GOES RED: the platform has started handing hook bodies a
 * per-row signal. That is the blocker lifting, not a regression — implement the
 * D3-conformant fix in `knowledge_article.hook.ts` (and see the same card for
 * the other flagged hooks), then delete this block.
 */
describe('#1265 — the shipped hook body cannot tell it is on a per-row predicate dispatch', () => {
  /**
   * The keys `buildSandboxContext` (@objectstack/runtime) marshals across the
   * QuickJS boundary. `dispatch` is absent, and `input` arrives as
   * `unwrapProxyToPlain(ctx.input)` = `Object.fromEntries(Object.entries(…))`,
   * which copies only ENUMERABLE own keys — and the engine's flattening proxy
   * marks `id`, `options` and `data` non-enumerable.
   */
  const PROBE = `
    return {
      __probe: {
        dispatch: typeof ctx.dispatch,
        inputId: typeof ctx.input.id,
        inputOptions: typeof ctx.input.options,
        previousPublishedAt: typeof (ctx.previous && ctx.previous.published_at),
      },
    };
  `;

  /** The per-row `ctx.input` the engine builds: `{ id, data, options }` behind
   *  `installFlatInput`'s proxy, whose non-data keys are non-enumerable. */
  const perRowInput = (payload: Rec, id: string, options: Rec): Rec => {
    const raw: Rec = { id, data: payload, options };
    return new Proxy(raw, {
      get: (t, p, r) =>
        p === 'id' || p === 'options' || p === 'data'
          ? Reflect.get(t, p, r)
          : t.data && p in t.data
            ? t.data[p as string]
            : Reflect.get(t, p, r),
      set: (t, p, v) => {
        if (p === 'id' || p === 'options' || p === 'data') t[p as string] = v;
        else (t.data ??= {})[p as string] = v;
        return true;
      },
      has: (t, p) =>
        p === 'id' || p === 'options' || p === 'data' ? p in t : (t.data && p in t.data) || p in t,
      ownKeys: (t) => Object.keys(t.data ?? {}),
      getOwnPropertyDescriptor: (t, p) => {
        if (t.data && p in t.data) {
          return { configurable: true, enumerable: true, writable: true, value: t.data[p as string] };
        }
        const d = Object.getOwnPropertyDescriptor(t, p);
        return d ? { ...d, enumerable: false } : undefined;
      },
    }) as Rec;
  };

  it(
    'sees no dispatch mode, no input.id and no input.options — so none of D3’s three routes are reachable',
    async () => {
      const { QuickJSScriptRunner, hookBodyRunnerFactory } = await import('@objectstack/runtime');
      const { makeSandboxEngine } = await import('./helpers/action-sandbox');

      const engine = makeSandboxEngine();
      const bind = hookBodyRunnerFactory(new QuickJSScriptRunner(), {
        ql: engine.engine,
        appId: 'hotcrm',
      } as never);
      const run = bind({
        name: 'probe_1265',
        object: 'crm_knowledge_article',
        events: ['beforeUpdate'],
        body: { language: 'js', source: PROBE, capabilities: [], timeoutMs: 5000 },
      } as never)!;

      const payload: Rec = { title: 'batch edit' };
      const engineCtx: Rec = {
        event: 'beforeUpdate',
        object: 'crm_knowledge_article',
        input: perRowInput(payload, 'ka_1', { where: { status: 'published' }, multi: true }),
        previous: { id: 'ka_1', status: 'published', published_at: '2024-01-01T00:00:00.000Z' },
        dispatch: { mode: 'per-row', index: 0, scope: {} },
      };

      await run(engineCtx as never);
      const probe = (payload as Rec).__probe as Rec;

      // The row's pre-image DOES cross — which is exactly why a row-conditioned
      // rewrite is expressible here, and why it is wrong.
      expect(probe.previousPublishedAt, 'ctx.previous is the row pre-image and does cross').toBe('string');

      // None of these do. Each `undefined` is one of D3's routes closed off.
      expect(probe.dispatch, 'ctx.dispatch would name the per-row path').toBe('undefined');
      expect(probe.inputId, 'ctx.input.id would name the row').toBe('undefined');
      expect(probe.inputOptions, 'ctx.input.options would carry `multi`/`where`').toBe('undefined');
    },
    20_000,
  );
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
      owner_id: 'spoofed',
    };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: SYSTEM }));
    expect(input.lead_source).toBe('web');
    expect(input.status).toBe('new');
    // Overwritten with a safe value rather than removed (#1133) — see the
    // matching note on `case_sla_defaults` above for why an absence assertion
    // could never have caught the real defect.
    expect(input.is_converted, 'public form kept is_converted').toBe(false);
    for (const stripped of [
      'converted_account', 'converted_contact',
      'converted_opportunity', 'converted_date', 'owner_id',
    ]) {
      expect(input[stripped], `public form kept ${stripped}`).toBeNull();
    }
  });

  it('locks identity fields on a converted lead but leaves notes editable', async () => {
    const previous: Rec = { id: 'l1', is_converted: true, company: 'Acme' };
    // The refusal NAMES the lead (#693) — a converted-lead lock also fires on
    // writes the caller never made, so "a converted lead" left the reader with
    // no way to tell which record refused.
    await expect(
      hook.handler(makeCtx({ event: 'beforeUpdate', input: { company: 'Other' }, previous, user: USER })),
    ).rejects.toThrow(/Cannot edit converted lead Acme \(attempted: company\)\./);
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
      input: { id: 'l1', status: 'qualified', owner_id: 'rep1' },
      previous: { id: 'l1', status: 'working' },
      user: USER,
      api: h.api,
    }));
    const [task] = h.rows('crm_task');
    expect(task, 'no follow-up task created').toBeTruthy();
    expect(task.priority).toBe('high');
    expect(task.owner_id).toBe('rep1');
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

describe('lead_duplicate_check', () => {
  const hook = hookNamed(leadHooks, 'lead_duplicate_check');

  /** An intake insert, with whatever the caller supplied on top. */
  const intake = async (input: Rec, store: Record<string, Rec[]> = {}) => {
    const h = makeHarness(store);
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: USER, api: h.api }));
    return h;
  };

  it('normalizes the email it stores, which is what makes the lookup an equality match', async () => {
    // There is no case-insensitive predicate to lean on: ObjectQL's `$regex`
    // compiles to a LIKE SUBSTRING on SQL. The canonical form is established
    // here, at the producer, exactly as contact_integrity does on crm_contact.
    const input: Rec = { email: '  Ada.Lovelace@Acme.IO ' };
    await intake(input);
    expect(input.email).toBe('ada.lovelace@acme.io');
  });

  it('normalizes on update too — a later edit must not hide the record from dedupe', async () => {
    const input: Rec = { id: 'l9', email: 'ADA@ACME.IO' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous: { id: 'l9' }, user: USER }));
    expect(input.email).toBe('ada@acme.io');
  });

  it('leaves a partial update that does not touch email alone', async () => {
    const input: Rec = { id: 'l9', phone: '555' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous: { id: 'l9' }, user: USER }));
    expect(input).not.toHaveProperty('email');
  });

  it('flags a re-captured address as a SUSPECTED duplicate of the open lead it repeats', async () => {
    // The acceptance case: the same web form, submitted twice. Under the old
    // `unique: true` the second insert was rejected by the database.
    const input: Rec = { email: 'Ada@acme.io', company: 'Acme' };
    await intake(input, {
      crm_lead: [
        { id: 'lead_first', email: 'ada@acme.io', is_converted: false, created_at: '2026-03-01T00:00:00Z' },
      ],
    });
    expect(input.duplicate_of_type).toBe('crm_lead');
    expect(input.duplicate_of_lead).toBe('lead_first');
    expect(input.duplicate_status).toBe('suspected');
    expect(input.duplicate_of_contact).toBeUndefined();
  });

  it('prefers an existing contact over an open lead — the contact is the further-along record', async () => {
    const input: Rec = { email: 'ada@acme.io' };
    await intake(input, {
      crm_contact: [{ id: 'con_1', email: 'ada@acme.io', created_at: '2026-01-01T00:00:00Z' }],
      crm_lead: [{ id: 'lead_first', email: 'ada@acme.io', is_converted: false, created_at: '2026-03-01T00:00:00Z' }],
    });
    expect(input.duplicate_of_type).toBe('crm_contact');
    expect(input.duplicate_of_contact).toBe('con_1');
    expect(input.duplicate_of_lead).toBeUndefined();
  });

  it('points a whole cluster at the ORIGINAL, not at whichever row the driver returns first', async () => {
    // Otherwise the third submission points at the second, the fourth at the
    // third, and reviewing the cluster means walking a chain.
    const input: Rec = { email: 'ada@acme.io' };
    await intake(input, {
      crm_lead: [
        { id: 'lead_third',  email: 'ada@acme.io', is_converted: false, created_at: '2026-05-01T00:00:00Z' },
        { id: 'lead_origin', email: 'ada@acme.io', is_converted: false, created_at: '2026-01-01T00:00:00Z' },
        { id: 'lead_second', email: 'ada@acme.io', is_converted: false, created_at: '2026-03-01T00:00:00Z' },
      ],
    });
    expect(input.duplicate_of_lead).toBe('lead_origin');
  });

  it('ignores a converted predecessor — its contact carries the same address', async () => {
    const input: Rec = { email: 'ada@acme.io' };
    await intake(input, {
      crm_lead: [{ id: 'lead_converted', email: 'ada@acme.io', is_converted: true, created_at: '2026-01-01T00:00:00Z' }],
    });
    expect(input.duplicate_status).toBeUndefined();
    expect(input.duplicate_of_type).toBeUndefined();
  });

  it('leaves a first-time address untouched', async () => {
    const input: Rec = { email: 'newcomer@acme.io' };
    await intake(input, { crm_lead: [{ id: 'other', email: 'someone@else.io', is_converted: false }] });
    expect(input.duplicate_status).toBeUndefined();
    expect(input.duplicate_of_type).toBeUndefined();
    expect(input.duplicate_of_lead).toBeUndefined();
  });

  it('never overwrites a CONFIRMED verdict with its own guess', async () => {
    // The whole reason suspicion and verdict share one field: a human who
    // confirmed a match must not have it downgraded by a later automatic write.
    const input: Rec = {
      email: 'ada@acme.io',
      duplicate_of_type: 'crm_contact',
      duplicate_of_contact: 'con_human',
      duplicate_status: 'confirmed',
    };
    await intake(input, {
      crm_lead: [{ id: 'lead_first', email: 'ada@acme.io', is_converted: false, created_at: '2026-01-01T00:00:00Z' }],
    });
    expect(input.duplicate_status).toBe('confirmed');
    expect(input.duplicate_of_type).toBe('crm_contact');
    expect(input.duplicate_of_contact).toBe('con_human');
    expect(input.duplicate_of_lead).toBeUndefined();
  });

  it('stands down on a record that already names a survivor', async () => {
    const input: Rec = { email: 'ada@acme.io', duplicate_of_type: 'crm_lead', duplicate_of_lead: 'lead_chosen' };
    await intake(input, {
      crm_lead: [{ id: 'lead_first', email: 'ada@acme.io', is_converted: false, created_at: '2026-01-01T00:00:00Z' }],
    });
    expect(input.duplicate_of_lead).toBe('lead_chosen');
    expect(input.duplicate_status).toBeUndefined();
  });

  it('writes nothing and throws nothing when the lookup is denied (anonymous Web-to-Lead)', async () => {
    // A guest can INSERT on crm_lead and read NOTHING. Propagating that denial
    // would reject the very submission this feature exists to accept — the
    // duplicate lands unflagged rather than not landing at all.
    const input: Rec = { email: 'ada@acme.io' };
    await expect(
      hook.handler(makeCtx({ event: 'beforeInsert', input, api: makeDeniedApi() })),
    ).resolves.toBeUndefined();
    expect(input.email).toBe('ada@acme.io');
    expect(input.duplicate_status).toBeUndefined();
  });

  it('runs after lead_automation, so a guest cannot spoof its way out of the flag', async () => {
    // Ascending priority order. At a lower number this hook would see the
    // client-supplied `duplicate_status: 'confirmed'` that lead_automation's
    // guest branch is there to delete, and stand down.
    const automation = hookNamed(leadHooks, 'lead_automation');
    expect(hook.priority).toBeGreaterThan(automation.priority);

    const input: Rec = { email: 'ada@acme.io', duplicate_status: 'confirmed', duplicate_of_lead: 'guessed' };
    await automation.handler(makeCtx({ event: 'beforeInsert', input, user: SYSTEM }));
    // Nulled rather than removed (#1133). `null` is what keeps this pin
    // meaningful: `lead_duplicate_check` stands down on a NON-BLANK verdict and
    // its own `isBlank` counts `null` as blank, so the check below still runs —
    // which is the whole point of stripping the spoofed verdict first.
    for (const stripped of [
      'duplicate_of_type', 'duplicate_of_lead', 'duplicate_of_contact', 'duplicate_status',
    ]) {
      expect(input[stripped], `public form kept ${stripped}`).toBeNull();
    }

    const h = makeHarness({
      crm_lead: [{ id: 'lead_first', email: 'ada@acme.io', is_converted: false, created_at: '2026-01-01T00:00:00Z' }],
    });
    await hook.handler(makeCtx({ event: 'beforeInsert', input, api: h.api }));
    expect(input.duplicate_status).toBe('suspected');
    expect(input.duplicate_of_lead).toBe('lead_first');
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
    expect(input.owner_id).toBeUndefined();
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
      recurrence_interval: 1, due_date: daysFromNow(0), owner_id: 'rep1',
    });
    const [next] = h.rows('crm_task');
    expect(next.status).toBe('not_started');
    expect(next.is_completed).toBe(false);
    expect(next.reminder_sent).toBe(false);
    expect(next.subject).toBe('Weekly sync');
    expect(next.owner_id).toBe('rep1');
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

  /** A completing task, which is the only transition that bubbles (#592). */
  const completing = (extra: Rec) => ({
    event: 'afterUpdate',
    input: { id: 't1', status: 'completed', ...extra },
    previous: { id: 't1', status: 'in_progress' },
    user: USER,
  });

  it('bubbles last_activity_date to a related account', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await hook.handler(makeCtx({ ...completing({ related_to_account: 'acc1' }), api: h.api }));
    expect(h.rows('crm_account')[0].last_activity_date).toBe(today());
  });

  it('uses last_contacted_date for a lead, which has no last_activity_date', async () => {
    const h = makeHarness({ crm_lead: [{ id: 'l1' }] });
    await hook.handler(makeCtx({ ...completing({ related_to_lead: 'l1' }), api: h.api }));
    const lead = h.rows('crm_lead')[0];
    expect(lead.last_activity_date, 'crm_lead has no last_activity_date column').toBeUndefined();
    expect(typeof lead.last_contacted_date).toBe('string');
  });

  it('does not bubble while the task is still open — a promise is not contact', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 't1', status: 'in_progress', related_to_account: 'acc1' },
      previous: { id: 't1', status: 'not_started' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls.filter((c) => c.op === 'update')).toHaveLength(0);
  });

  it('does not bubble twice for a task that was already completed', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await hook.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 't1', status: 'completed', related_to_account: 'acc1', subject: 'edited' },
      previous: { id: 't1', status: 'completed' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls.filter((c) => c.op === 'update')).toHaveLength(0);
  });

  it('walks UP to the account from a contact, an opportunity and a case (#592)', async () => {
    // The defect this closes: a rep completes their work on the OPPORTUNITY,
    // never on the account row, so bubbling to the named record alone left
    // `crm_account.last_activity_date` untouched through a whole sales cycle
    // and `at_risk_accounts` listed the busiest customers in the book.
    for (const [field, object] of [
      ['related_to_contact', 'crm_contact'],
      ['related_to_opportunity', 'crm_opportunity'],
      ['related_to_case', 'crm_case'],
    ] as const) {
      const h = makeHarness({
        crm_account: [{ id: 'acc1' }],
        [object]: [{ id: 'x1', crm_account: 'acc1' }],
      });
      await hook.handler(makeCtx({ ...completing({ [field]: 'x1' }), api: h.api }));
      expect(h.rows('crm_account')[0].last_activity_date, `${object} did not reach its account`)
        .toBe(today());
    }
  });

  it('stamps the contact itself as well as its account', async () => {
    const h = makeHarness({
      crm_account: [{ id: 'acc1' }],
      crm_contact: [{ id: 'c1', crm_account: 'acc1' }],
    });
    await hook.handler(makeCtx({ ...completing({ related_to_contact: 'c1' }), api: h.api }));
    expect(typeof h.rows('crm_contact')[0].last_contacted_date).toBe('string');
    expect(h.rows('crm_account')[0].last_activity_date).toBe(today());
  });

  it('no longer needs related_to_type to be set', async () => {
    // It is a display hint a rep can leave blank, and while the bubble keyed
    // off it a task with a perfectly good related_to_account bubbled nowhere.
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await hook.handler(makeCtx({ ...completing({ related_to_account: 'acc1' }), api: h.api }));
    expect(h.rows('crm_account')[0].last_activity_date).toBe(today());
  });

  it('is a no-op with no parent, and never propagates a write failure', async () => {
    const h = makeHarness({});
    await hook.handler(makeCtx({ ...completing({}), api: h.api }));
    expect(h.calls).toHaveLength(0);

    // A denied write must be swallowed — the bubble is best-effort and must
    // never break the parent task write.
    await expect(
      hook.handler(makeCtx({ ...completing({ related_to_account: 'acc1' }), api: makeDeniedApi('denied') })),
    ).resolves.toBeUndefined();
  });
});
