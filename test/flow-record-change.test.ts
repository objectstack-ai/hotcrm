// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CaseCsatFollowupFlow } from '../src/flows/case-csat-followup.flow';
import { CaseEscalationFlow, CaseEscalationOnCreateFlow } from '../src/flows/case-escalation.flow';
import { ContactWelcomeFlow } from '../src/flows/contact-welcome.flow';
import { LeadAssignmentFlow } from '../src/flows/lead-assignment.flow';
import {
  OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow,
} from '../src/flows/opportunity-approval.flow';
import { OpportunityWonAlertFlow } from '../src/flows/opportunity-won-alert.flow';
import { TaskUrgentAlertFlow } from '../src/flows/task-urgent-alert.flow';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

/**
 * Runtime tests for the RECORD-CHANGE flows.
 *
 * The interesting logic in these lives in the start `condition` — a bare CEL
 * expression the engine wraps and evaluates against `record` / `previous`.
 * Nearly every comment in these flow files documents a re-fire loop or a
 * phantom-recipient bug that shipped, and every one of those was invisible to
 * `os validate` and to the metadata-contract tests, which can only see that a
 * condition string exists.
 *
 * These execute the real engine and assert on the notification payloads and
 * record writes that come out the other side.
 */

/** Evaluate a flow's start condition exactly as the engine does. */
function startConditionHolds(flow: Rec, vars: Record<string, unknown>): boolean {
  const h = makeFlowHarness({}, {});
  const engine = h.engine as unknown as {
    evaluateCondition(c: unknown, v: Map<string, unknown>): boolean;
  };
  const condition = (flow.nodes as Rec[]).find((n) => n.id === 'start')?.config?.condition;
  // The engine wraps a string start condition into a CEL envelope before
  // evaluating it (unlike loop-nested edge conditions — see
  // flow-scheduled.test.ts). Mirror that here so this is the real code path.
  const expr = typeof condition === 'string' ? { dialect: 'cel', source: condition } : condition;
  return engine.evaluateCondition(expr, new Map(Object.entries(vars)));
}

describe('opportunity_won_alert — start condition', () => {
  const opp = (over: Rec = {}): Rec => ({
    id: 'o1', name: 'Big Deal', stage: 'closed_won', amount: 250_000, owner_id: 'rep1', ...over,
  });

  it('fires on the TRANSITION into closed_won at or above $100K', () => {
    expect(startConditionHolds(OpportunityWonAlertFlow, {
      record: opp(), previous: { stage: 'negotiation' },
    })).toBe(true);
  });

  it('does NOT re-fire on a later edit of an already-won deal', () => {
    // Without the `previous.stage` guard every subsequent edit of a won deal
    // (owner claims, approval stamps, description tweaks) re-sent the blast.
    expect(startConditionHolds(OpportunityWonAlertFlow, {
      record: opp(), previous: { stage: 'closed_won' },
    })).toBe(false);
  });

  it('fires at EXACTLY the $100K threshold (#1087)', () => {
    // The boundary case this flow used to miss. It cut at `>` while both
    // sharing rules cut at `>=`, so a deal at exactly $100,000 was shared with
    // leadership as a large deal and then closed without the large-deal alert.
    // Asserted against the engine, not against the condition string, because
    // the string is what the parity test reads — this is the behaviour.
    expect(startConditionHolds(OpportunityWonAlertFlow, {
      record: opp({ amount: 100_000 }), previous: { stage: 'negotiation' },
    }), 'a deal at exactly $100,000 must alert on win').toBe(true);
  });

  it('ignores deals below the $100K threshold', () => {
    for (const amount of [99_999, 50_000]) {
      expect(startConditionHolds(OpportunityWonAlertFlow, {
        record: opp({ amount }), previous: { stage: 'negotiation' },
      }), `amount ${amount} should not alert`).toBe(false);
    }
  });

  it('ignores deals that did not close won', () => {
    expect(startConditionHolds(OpportunityWonAlertFlow, {
      record: opp({ stage: 'closed_lost' }), previous: { stage: 'negotiation' },
    })).toBe(false);
  });

  it('notifies the owner without dot-walking the manager lookup', async () => {
    const h = makeFlowHarness({ opportunity_won_alert: OpportunityWonAlertFlow }, {});
    await h.trigger('opportunity_won_alert', opp(), { stage: 'negotiation' });

    expect(h.notifications).toHaveLength(1);
    const [alert] = h.notifications;
    expect(alert.to).toContain('rep1');
    // `{record.owner_id.manager}` interpolates to the literal "undefined" and the
    // message goes to a phantom user.
    expect(JSON.stringify(alert), 'a template dot-walked a lookup').not.toContain('undefined');
    expect(String(alert.title)).toContain('Big Deal');
  });
});

describe('case_escalation — start condition', () => {
  const critical = (over: Rec = {}): Rec => ({
    id: 'c1', case_number: 'CASE-1', priority: 'critical', status: 'new',
    escalated_date: null, owner_id: 'agent1', ...over,
  });

  it('fires for a fresh critical case', () => {
    expect(startConditionHolds(CaseEscalationFlow, { record: critical(), previous: {} })).toBe(true);
  });

  it('does not re-fire once escalated_date is stamped', () => {
    // The flow's own escalation write re-triggers record-after-update. The
    // guard must NOT be the `is_escalated` boolean: on SQLite/libsql a boolean
    // persists as integer 1, so `is_escalated != true` is `1 != true` = true
    // and the flow loops forever (it wedged a first-boot seed).
    expect(startConditionHolds(CaseEscalationFlow, {
      record: critical({ escalated_date: '2026-01-01T00:00:00.000Z', status: 'escalated' }),
      previous: {},
    })).toBe(false);
  });

  it('does not re-escalate a case that is being resolved or closed', () => {
    // Observed live: close_case wrote status "closed" and this flow immediately
    // rewrote it back to "escalated".
    for (const status of ['resolved', 'closed', 'escalated']) {
      expect(startConditionHolds(CaseEscalationFlow, {
        record: critical({ status }), previous: {},
      }), `status ${status} must not escalate`).toBe(false);
    }
  });

  it('ignores non-critical cases', () => {
    for (const priority of ['low', 'medium', 'high']) {
      expect(startConditionHolds(CaseEscalationFlow, {
        record: critical({ priority }), previous: {},
      })).toBe(false);
    }
  });

  it('flags the case with the reason its validation rule requires', async () => {
    const h = makeFlowHarness({ case_escalation: CaseEscalationFlow }, {
      crm_case: [critical()],
    });
    await h.trigger('case_escalation', critical(), {});

    const updated = h.store.crm_case[0];
    expect(updated.is_escalated).toBe(true);
    expect(updated.status).toBe('escalated');
    // `escalation_reason` must accompany `is_escalated` — the object's
    // `escalation_reason_required` validation rejects the write otherwise,
    // which silently aborted this flow until it was supplied.
    expect(updated.escalation_reason, 'missing reason ⇒ the write is rejected').toBeTruthy();
    expect(updated.escalated_date).toBeTruthy();
  });

  it('creates no task of its own — the status hook owns escalation tasks', async () => {
    // A task node here produced duplicate, disagreeing tasks (case owner/high
    // vs account owner/urgent) per escalation.
    const h = makeFlowHarness({ case_escalation: CaseEscalationFlow }, {
      crm_case: [critical()], crm_task: [],
    });
    await h.trigger('case_escalation', critical(), {});
    expect(h.store.crm_task).toHaveLength(0);
  });
});

describe('contact_welcome — start condition', () => {
  const contact = (over: Rec = {}): Rec => ({
    id: 'c1', first_name: 'Ada', last_name: 'Lovelace', owner_id: 'rep1',
    email_opt_out: false, ...over,
  });

  it('fires for an owned contact who has not opted out', () => {
    expect(startConditionHolds(ContactWelcomeFlow, { record: contact() })).toBe(true);
  });

  it('respects email_opt_out', () => {
    expect(startConditionHolds(ContactWelcomeFlow, {
      record: contact({ email_opt_out: true }),
    })).toBe(false);
  });

  it('skips ownerless contacts (nobody to prompt)', () => {
    expect(startConditionHolds(ContactWelcomeFlow, {
      record: contact({ owner_id: null }),
    })).toBe(false);
  });

  it('addresses the prompt to the owner with a resolved name', async () => {
    const h = makeFlowHarness({ contact_welcome: ContactWelcomeFlow }, {});
    await h.trigger('contact_welcome', contact());

    expect(h.notifications).toHaveLength(1);
    const [alert] = h.notifications;
    expect(alert.to).toContain('rep1');
    expect(String(alert.title)).toContain('Ada');
    expect(String(alert.title)).toContain('Lovelace');
  });
});

describe('task_urgent_alert — start condition', () => {
  const task = (over: Rec = {}): Rec => ({
    id: 't1', subject: 'Fix outage', priority: 'urgent', status: 'not_started',
    owner_id: 'rep1', ...over,
  });

  it('fires for a new urgent, incomplete task', () => {
    expect(startConditionHolds(TaskUrgentAlertFlow, { record: task() })).toBe(true);
  });

  it('gates on the status enum, not the is_completed boolean', () => {
    // On SQLite/libsql booleans persist as integer 1, so `is_completed != true`
    // is `1 != true` = always true and the guard never trips.
    expect(startConditionHolds(TaskUrgentAlertFlow, {
      record: task({ status: 'completed', is_completed: 1 }),
    })).toBe(false);
  });

  it('ignores non-urgent tasks', () => {
    for (const priority of ['low', 'normal', 'high']) {
      expect(startConditionHolds(TaskUrgentAlertFlow, { record: task({ priority }) })).toBe(false);
    }
  });

  it('alerts the owner at warning severity', async () => {
    const h = makeFlowHarness({ task_urgent_alert: TaskUrgentAlertFlow }, {});
    await h.trigger('task_urgent_alert', task());
    expect(h.notifications).toHaveLength(1);
    expect(h.notifications[0].to).toContain('rep1');
    expect(h.notifications[0].severity).toBe('warning');
    expect(String(h.notifications[0].title)).toContain('Fix outage');
  });
});

describe('lead_assignment — hot-lead SLA routing', () => {
  const lead = (over: Rec = {}): Rec => ({
    id: 'l1', company: 'Acme', rating: 5, owner_id: 'rep1', ...over,
  });

  it('routes a hot lead (rating ≥ 4) down the accelerated SLA branch', async () => {
    const h = makeFlowHarness({ lead_assignment: LeadAssignmentFlow }, { crm_task: [] });
    await h.trigger('lead_assignment', lead({ rating: 5 }));
    expect(h.notifications.length + h.store.crm_task.length, 'hot lead produced no follow-up').toBeGreaterThan(0);
  });

  it('routes a cold lead down the standard branch', async () => {
    const h = makeFlowHarness({ lead_assignment: LeadAssignmentFlow }, { crm_task: [] });
    await h.trigger('lead_assignment', lead({ rating: 1 }));
    expect(h.notifications.length + h.store.crm_task.length, 'cold lead produced no follow-up').toBeGreaterThan(0);
  });

  it('sends every SLA task to the lead owner, never a dot-walked manager', async () => {
    for (const rating of [5, 1]) {
      const h = makeFlowHarness({ lead_assignment: LeadAssignmentFlow }, { crm_task: [] });
      await h.trigger('lead_assignment', lead({ rating }));
      for (const n of h.notifications) {
        expect(JSON.stringify(n), `rating ${rating} notification dot-walked a lookup`)
          .not.toContain('undefined');
      }
      for (const t of h.store.crm_task) {
        expect(String(t.owner_id), `rating ${rating} task has a phantom owner`).not.toBe('undefined');
      }
    }
  });
});

describe('opportunity_approval — start condition', () => {
  const startCondition = (OpportunityApprovalFlow.nodes as Rec[])
    .find((n) => n.id === 'start')?.config?.condition;

  it('declares a start condition that gates on the approval-worthy transition', () => {
    // Accepts either authoring form: a bare string (which the engine wraps
    // into a CEL envelope for START conditions) or an explicit
    // `{ dialect, source }` envelope. Pinning `typeof === 'string'` made this
    // fail the moment the flow was legitimately converted to the envelope
    // form — it was asserting the notation, not the thing that matters, which
    // is that a gate exists and carries an expression at all.
    const source =
      typeof startCondition === 'string'
        ? startCondition
        : (startCondition as { source?: unknown } | undefined)?.source;
    expect(
      typeof source === 'string' && source.length > 0,
      `opportunity_approval lost its start condition (got ${JSON.stringify(startCondition)})`,
    ).toBe(true);
  });

  it('does not re-enter for an opportunity already pending approval', () => {
    // The flow writes `approval_status`, which re-triggers record-after-update;
    // without a guard it re-enters for the same record (the engine logs
    // "flow re-entered for the same record while still running").
    const pending = {
      record: { id: 'o1', amount: 750_000, approval_status: 'pending', stage: 'negotiation' },
      previous: { id: 'o1', amount: 750_000, approval_status: 'pending', stage: 'negotiation' },
    };
    expect(startConditionHolds(OpportunityApprovalFlow, pending)).toBe(false);
  });

  describe('the large-deal line is inclusive (#1087)', () => {
    // The governance half of the card's truth table, measured through the
    // engine. The parity test reads the operator out of the shipped condition
    // string; this asserts what that operator DOES, on both the update gate and
    // its insert twin — a deal born at exactly $100,000 has to enter approval
    // for the same reason one edited up to it does.
    const openDeal = (amount: number): Record<string, unknown> => ({
      record: { id: 'o1', amount, approval_status: 'not_required', stage: 'negotiation' },
      previous: { id: 'o1', amount, approval_status: 'not_required', stage: 'negotiation' },
    });

    const GATES = [
      ['afterUpdate gate', OpportunityApprovalFlow],
      ['afterInsert twin', OpportunityApprovalOnCreateFlow],
    ] as const;

    it.each(GATES)('%s routes a deal at EXACTLY $100,000 for approval', (_label, flow) => {
      expect(startConditionHolds(flow as unknown as Rec, openDeal(100_000))).toBe(true);
    });

    it.each(GATES)('%s leaves $99,999 alone', (_label, flow) => {
      expect(startConditionHolds(flow as unknown as Rec, openDeal(99_999))).toBe(false);
    });
  });
});

/**
 * Insert-time twins.
 *
 * A record-change flow binds exactly ONE hook event, so each of these pairs
 * exists to cover the other half: the afterUpdate flow never sees a record that
 * is BORN in the triggering state (a phone-in P1 case, an API-inserted large
 * deal) — which for `case_escalation` is the common path.
 *
 * The twins are derived by spreading the parent and rebinding only the start
 * node's `triggerType`. The failure mode is drift: someone edits the parent's
 * nodes or its start condition and the twin quietly keeps the old behaviour, or
 * the twin's trigger gets rebound back to update and the insert path silently
 * stops working. Both are asserted structurally here, and the shared condition
 * is exercised through the same engine path as its parent.
 */
describe('insert-time twin flows', () => {
  const TWINS = [
    { twin: CaseEscalationOnCreateFlow, parent: CaseEscalationFlow, name: 'case_escalation_on_create' },
    { twin: OpportunityApprovalOnCreateFlow, parent: OpportunityApprovalFlow, name: 'opportunity_approval_on_create' },
  ] as const;

  it.each(TWINS)('$name is registered under its own name', ({ twin, parent, name }) => {
    expect(twin.name).toBe(name);
    expect(twin.name, 'twin collides with its parent').not.toBe(parent.name);
  });

  it.each(TWINS)('$name binds record-after-create, unlike its parent', ({ twin, parent }) => {
    const startOf = (f: Rec) => (f.nodes as Rec[]).find((n) => n.id === 'start')!;
    expect(startOf(twin as unknown as Rec).config.triggerType).toBe('record-after-create');
    expect(startOf(parent as unknown as Rec).config.triggerType).toBe('record-after-update');
  });

  it.each(TWINS)('$name keeps its parent’s graph and start condition', ({ twin, parent }) => {
    const t = twin as unknown as Rec;
    const p = parent as unknown as Rec;
    // Same graph: only the start node's triggerType may differ.
    expect((t.nodes as Rec[]).map((n) => n.id)).toEqual((p.nodes as Rec[]).map((n) => n.id));
    expect(t.edges).toEqual(p.edges);

    const cond = (f: Rec) => (f.nodes as Rec[]).find((n) => n.id === 'start')!.config.condition;
    expect(cond(t), 'twin drifted from its parent’s start condition').toEqual(cond(p));

    // Every non-start node must be byte-identical to the parent's.
    for (const node of t.nodes as Rec[]) {
      if (node.id === 'start') continue;
      const twinNode = (p.nodes as Rec[]).find((n) => n.id === node.id);
      expect(node, `node ${node.id} drifted from the parent flow`).toEqual(twinNode);
    }
  });

  it('case_escalation_on_create escalates a case born critical', async () => {
    const born = {
      id: 'c9', case_number: 'CASE-9', priority: 'critical', status: 'new',
      escalated_date: null, owner_id: 'agent1',
    };
    const h = makeFlowHarness({ case_escalation_on_create: CaseEscalationOnCreateFlow }, {
      crm_case: [{ ...born }],
    });
    await h.trigger('case_escalation_on_create', born);

    const updated = h.store.crm_case[0];
    expect(updated.is_escalated, 'a case born critical was never escalated').toBe(true);
    expect(updated.status).toBe('escalated');
    expect(updated.escalation_reason).toBeTruthy();
  });

  it('opportunity_approval_on_create declares the same gate as its parent', () => {
    const pending = {
      record: { id: 'o1', amount: 750_000, approval_status: 'pending', stage: 'negotiation' },
      previous: { id: 'o1', amount: 750_000, approval_status: 'pending', stage: 'negotiation' },
    };
    expect(startConditionHolds(OpportunityApprovalOnCreateFlow as unknown as Rec, pending))
      .toBe(startConditionHolds(OpportunityApprovalFlow as unknown as Rec, pending));
  });
});

/**
 * Execution identity under a USER-LESS trigger (#684).
 *
 * The metadata side of this invariant — every record-change flow declares
 * `runAs: 'system'` — lives in `actions-flows-integrity.test.ts`, enumerated
 * from the compiled stack so a new flow cannot slip past it. What that guard
 * cannot show is WHY, so these run the real engine on the real flows with no
 * trigger user and assert on what comes out.
 *
 * `makeFlowHarness().trigger()` always supplies `userId: 'user_1'`, which is
 * exactly the healthy path the 17.0 acceptance sweep found working. The broken
 * path is the other one, so these call `engine.execute` directly and omit
 * `userId` — the shape of a write made by seed loading, an integration, or
 * another `runAs:'system'` flow.
 *
 * Direction of the counter-proof, decided before running it: with `runAs`
 * stripped back to the schema default the run must FAIL at its first data node
 * with the engine's `[runAs]` refusal, and the record must be untouched. That
 * is the pre-fix behaviour reproduced on demand — not a hypothetical — so the
 * assertions below cannot pass vacuously by producing nothing.
 */
describe('record-change flows under a user-less trigger (#684)', () => {
  type Run = { success: boolean; error?: string; summary?: { nodes?: Rec[] } };

  /** Fire `flow` with NO trigger user, the way a system write does. */
  async function fire(name: string, flow: Rec, record: Rec, previous: Rec, seed: Record<string, Rec[]> = {}) {
    const h = makeFlowHarness({ [name]: flow as never }, seed);
    const result = (await (h.engine as unknown as {
      execute(n: string, c: Rec): Promise<Run>;
    }).execute(name, { params: {}, event: 'record_change', record, previous })) as Run;
    return { h, result };
  }

  const nodeStatus = (r: Run, id: string) =>
    (r.summary?.nodes ?? []).find((n) => n.nodeId === id)?.status;

  /** The flow as it was authored before #684: `runAs` back at its default. */
  const withoutRunAs = (flow: Rec): Rec => {
    const { runAs: _dropped, ...rest } = flow;
    return rest;
  };

  const critical = (over: Rec = {}): Rec => ({
    id: 'c1', case_number: 'CASE-1', priority: 'critical', status: 'new',
    escalated_date: null, owner_id: 'agent1', ...over,
  });

  it('case_escalation escalates a case written with no session', async () => {
    const { h, result } = await fire(
      'case_escalation', CaseEscalationFlow as unknown as Rec,
      critical(), {}, { crm_case: [critical()] },
    );
    expect(String(result.error ?? ''), 'the runAs refusal is back').not.toContain('[runAs]');
    expect(result.success).toBe(true);
    expect(h.store.crm_case[0].status).toBe('escalated');
    expect(h.store.crm_case[0].is_escalated).toBe(true);
    expect(h.notifications).toHaveLength(1);
  });

  it('…and REFUSES the same write once runAs is dropped (the shape #684 fixed)', async () => {
    const { h, result } = await fire(
      'case_escalation', withoutRunAs(CaseEscalationFlow as unknown as Rec),
      critical(), {}, { crm_case: [critical()] },
    );
    expect(result.success).toBe(false);
    expect(String(result.error)).toContain('[runAs] refusing a data operation');
    // It dies at the FIRST data node, before anything is written — which is
    // why a freshly seeded org had never once run this automation.
    expect(nodeStatus(result, 'get_case')).toBe('failure');
    expect(h.store.crm_case[0].status, 'the case was escalated despite the refusal').toBe('new');
    expect(h.notifications).toHaveLength(0);
  });

  it('opportunity_approval reaches its approval node for a system-created deal', async () => {
    // The governance hole the acceptance sweep demonstrated: a $150K renewal
    // created by the runAs:'system' contract_renewal sweep fired this flow
    // user-less and died at `get_opportunity`, leaving the deal unlocked at
    // approval_status 'not_required' with no request ever opened.
    const deal = {
      id: 'o1', name: 'Acme Renewal', amount: 150_000, stage: 'negotiation',
      approval_status: 'not_required', owner_id: 'rep1',
    };
    const { result } = await fire(
      'opportunity_approval', OpportunityApprovalFlow as unknown as Rec,
      deal, { ...deal, amount: 50_000 }, { crm_opportunity: [{ ...deal }] },
    );
    expect(String(result.error ?? ''), 'the deal is bypassing approval again').not.toContain('[runAs]');
    expect(nodeStatus(result, 'get_opportunity')).toBe('success');
    // The run then stops at `manager_review` for a harness-only reason: the
    // approval node ships in @objectstack/plugin-approvals, which this
    // in-memory harness does not install. That is NOT a runAs failure, and it
    // is asserted here so a future reader does not read it as one.
    expect(nodeStatus(result, 'manager_review')).toBe('failure');
    expect(String(result.error)).toContain("No executor registered for node type 'approval'");
  });

  it('…and never gets that far once runAs is dropped', async () => {
    const deal = {
      id: 'o1', name: 'Acme Renewal', amount: 150_000, stage: 'negotiation',
      approval_status: 'not_required', owner_id: 'rep1',
    };
    const { result } = await fire(
      'opportunity_approval', withoutRunAs(OpportunityApprovalFlow as unknown as Rec),
      deal, { ...deal, amount: 50_000 }, { crm_opportunity: [{ ...deal }] },
    );
    expect(String(result.error)).toContain('[runAs] refusing a data operation');
    expect(nodeStatus(result, 'get_opportunity')).toBe('failure');
    expect(nodeStatus(result, 'manager_review'), 'approval was never requested').toBeUndefined();
  });

  it('lead_assignment stamps the SLA on an integration-written lead', async () => {
    const lead = {
      id: 'l1', company: 'Acme', rating: 5, owner_id: 'rep1',
      first_name: 'Ada', last_name: 'Lovelace',
    };
    const { h, result } = await fire(
      'lead_assignment', LeadAssignmentFlow as unknown as Rec,
      lead, {}, { crm_lead: [{ ...lead }] },
    );
    expect(String(result.error ?? '')).not.toContain('[runAs]');
    expect(h.store.crm_lead[0].next_followup_date, 'hot lead got no SLA date').toBeTruthy();
    expect(h.notifications).toHaveLength(1);
  });

  it('…and gets neither SLA nor alert once runAs is dropped', async () => {
    const lead = {
      id: 'l1', company: 'Acme', rating: 5, owner_id: 'rep1',
      first_name: 'Ada', last_name: 'Lovelace',
    };
    const { h, result } = await fire(
      'lead_assignment', withoutRunAs(LeadAssignmentFlow as unknown as Rec),
      lead, {}, { crm_lead: [{ ...lead }] },
    );
    expect(String(result.error)).toContain('[runAs] refusing a data operation');
    expect(h.store.crm_lead[0].next_followup_date).toBeUndefined();
    expect(h.notifications).toHaveLength(0);
  });

  /**
   * MEASURED, and deliberately recorded because the issue that prompted #684
   * over-stated it: the four notify-only record-change flows
   * (`contact_welcome`, `task_urgent_alert`, `opportunity_won_alert`,
   * `case_csat_followup`) were NOT refused on 17.0.0-rc.2. The guard fires at
   * `get_record` / `create_record` / `update_record` / `delete_record`, and
   * `notify` dispatches through the messaging service without a run data
   * context, so a user-less run of these completes and delivers.
   *
   * They carry `runAs: 'system'` anyway — the declaration records that
   * record-change automation runs as the platform, so a data node added later
   * inherits a reasoned elevation instead of a production refusal. This case
   * pins the measurement so nobody "fixes" a break that was never there, and
   * so the day it DOES start being refused, we hear about it here.
   */
  it('the notify-only siblings deliver either way (they were never the broken ones)', async () => {
    const closed = { id: 'c2', case_number: 'CASE-2', status: 'closed', owner_id: 'agent1' };
    for (const flow of [CaseCsatFollowupFlow, withoutRunAs(CaseCsatFollowupFlow as unknown as Rec)]) {
      const { h, result } = await fire(
        'case_csat_followup', flow as unknown as Rec, closed, { status: 'open' },
      );
      expect(String(result.error ?? '')).not.toContain('[runAs]');
      // The run suspends at the P1D timer; the notify is on the other side.
      expect(h.notifications).toHaveLength(0);
    }

    const contact = {
      id: 'ct1', first_name: 'Ada', last_name: 'Lovelace',
      owner_id: 'rep1', email_opt_out: false,
    };
    for (const flow of [ContactWelcomeFlow, withoutRunAs(ContactWelcomeFlow as unknown as Rec)]) {
      const { h, result } = await fire('contact_welcome', flow as unknown as Rec, contact, {});
      expect(String(result.error ?? '')).not.toContain('[runAs]');
      expect(h.notifications, 'a notify-only flow was refused — the guard widened').toHaveLength(1);
    }
  });
});
