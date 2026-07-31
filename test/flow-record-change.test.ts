// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
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
    id: 'o1', name: 'Big Deal', stage: 'closed_won', amount: 250_000, owner: 'rep1', ...over,
  });

  it('fires on the TRANSITION into closed_won above $100K', () => {
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

  it('ignores deals at or below the $100K threshold', () => {
    for (const amount of [100_000, 50_000]) {
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
    // `{record.owner.manager}` interpolates to the literal "undefined" and the
    // message goes to a phantom user.
    expect(JSON.stringify(alert), 'a template dot-walked a lookup').not.toContain('undefined');
    expect(String(alert.title)).toContain('Big Deal');
  });
});

describe('case_escalation — start condition', () => {
  const critical = (over: Rec = {}): Rec => ({
    id: 'c1', case_number: 'CASE-1', priority: 'critical', status: 'new',
    escalated_date: null, owner: 'agent1', ...over,
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
    id: 'c1', first_name: 'Ada', last_name: 'Lovelace', owner: 'rep1',
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
      record: contact({ owner: null }),
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
    owner: 'rep1', ...over,
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
    id: 'l1', company: 'Acme', rating: 5, owner: 'rep1', ...over,
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
        expect(String(t.owner), `rating ${rating} task has a phantom owner`).not.toBe('undefined');
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
      escalated_date: null, owner: 'agent1',
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
