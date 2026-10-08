// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { CaseEscalationFlow, CaseEscalationOnCreateFlow } from '../src/service/flows/case-escalation.flow';
import { ContactWelcomeFlow } from '../src/sales/flows/contact-welcome.flow';
import { LeadAssignmentFlow } from '../src/sales/flows/lead-assignment.flow';
import {
  OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow,
} from '../src/sales/flows/opportunity-approval.flow';
import {
  hotcrmStack, signUpPerson, guestInsert, systemUpdate, flowRuns, notificationsTo, runRecordFlow,
  type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

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
 * These run on the shipped app booted by `@objectstack/verify`: a person's (or
 * the system's) real write fires the bound flow, and what comes out the other
 * side is read where the platform puts it — the record, the notification
 * outbox (`notificationsTo`, one row per addressed recipient), and the run
 * history (`flowRuns`; a flow whose start condition does not hold records no
 * run at all). Where no write can produce the record shape a case is about,
 * the flow is handed that record directly (`runRecordFlow`) and the case says
 * why.
 */

let verify: VerifyStack;
let admin: string;
let rep: Person;
let agent: Person;
let accountId: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@flow-record-change.test', {
    name: 'Record Change Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  // Service grants, but NOT on the `service_agent` rota: a case the agent
  // opens stays the agent's (`case_auto_assign` round-robins the rota).
  agent = await signUpPerson(verify, 'agent@flow-record-change.test', {
    name: 'Record Change Agent', permissionSets: ['service_agent'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Record Change Co', owner_id: rep.id }]);
  accountId = String(account!.id);
}, 120_000);

const as = (who: Person) => ({ as: who.token });

/** The notifications of `topic` addressed to `userId` about the record at `url`. */
const notified = async (userId: string, topic: string, url: string) =>
  (await notificationsTo(verify, userId, topic)).filter((n) => n.payload?.actionUrl === url);

describe('opportunity_won_alert — start condition', () => {
  /**
   * The rep's open deal. A deal of $100K or more is seeded with its large-deal
   * approval already landed (`approval_status: 'approved'`): a save on one
   * still awaiting approval would open a request and lock it.
   */
  const deal = async (amount = 250_000): Promise<Rec> => {
    const [opp] = await verify.seed('crm_opportunity', [{
      name: `Big Deal ${++k}`, amount, stage: 'negotiation', close_date: '2030-06-30',
      approval_status: amount >= 100_000 ? 'approved' : 'not_required', crm_account: accountId, owner_id: rep.id,
    }]);
    return opp!;
  };
  const close = (opp: Rec, stage: 'closed_won' | 'closed_lost') =>
    verify.hooks.run('crm_opportunity', 'update', stage === 'closed_won'
      ? { id: opp.id, stage, win_reason: 'better_price' }
      : { id: opp.id, stage, loss_reason: 'competitor' }, as(rep));
  const alerts = (opp: Rec) => notified(rep.id, 'large_deal_won', `/crm_opportunity/${opp.id}`);

  it('fires on the TRANSITION into closed_won at or above $100K', async () => {
    const opp = await deal();
    await close(opp, 'closed_won');
    expect(await alerts(opp)).toHaveLength(1);
  });

  it('does NOT re-fire on a later edit of an already-won deal', async () => {
    // Without the `previous.stage` guard every subsequent edit of a won deal
    // (owner claims, approval stamps, description tweaks) re-sent the blast.
    const opp = await deal();
    await close(opp, 'closed_won');
    await verify.hooks.run('crm_opportunity', 'update', { id: opp.id, description: 'PO received' }, as(rep));
    expect(await alerts(opp), 'only the close itself').toHaveLength(1);
  });

  it('fires at EXACTLY the $100K threshold (#1087)', async () => {
    // The boundary case this flow used to miss. It cut at `>` while both
    // sharing rules cut at `>=`, so a deal at exactly $100,000 was shared with
    // leadership as a large deal and then closed without the large-deal alert.
    // Asserted against the engine, not against the condition string, because
    // the string is what the parity test reads — this is the behaviour.
    const opp = await deal(100_000);
    await close(opp, 'closed_won');
    expect(await alerts(opp), 'a deal at exactly $100,000 must alert on win').toHaveLength(1);
  });

  it('ignores deals below the $100K threshold', async () => {
    for (const amount of [99_999, 50_000]) {
      const opp = await deal(amount);
      await close(opp, 'closed_won');
      expect(await alerts(opp), `amount ${amount} should not alert`).toHaveLength(0);
    }
  });

  it('ignores deals that did not close won', async () => {
    const opp = await deal();
    await close(opp, 'closed_lost');
    expect(await alerts(opp)).toHaveLength(0);
  });

  it('notifies the owner without dot-walking the manager lookup', async () => {
    const opp = await deal();
    await close(opp, 'closed_won');

    const [alert, ...more] = await alerts(opp);
    expect(more).toHaveLength(0);
    expect(alert, 'the owner was not alerted').toBeDefined();
    // `{record.owner_id.manager}` interpolates to the literal "undefined" and the
    // message goes to a phantom user.
    expect(JSON.stringify(alert), 'a template dot-walked a lookup').not.toContain('undefined');
    expect(String(alert!.payload.templateData.name)).toContain(opp.name);
  });
});

describe('case_escalation — start condition', () => {
  /** A case the agent opened and works, at `priority`. */
  const openCase = (priority = 'medium', over: Rec = {}): Promise<Rec> =>
    verify.hooks.run('crm_case', 'insert', {
      subject: `Server down ${++k}`, description: 'It is down.', crm_account: accountId,
      status: 'new', priority, ...over,
    }, as(agent));
  const raise = (kase: Rec) =>
    verify.hooks.run('crm_case', 'update', { id: kase.id, priority: 'critical' }, as(agent));
  const runs = (kase: Rec) => flowRuns(verify, 'case_escalation', kase.id);

  it('fires for a fresh critical case', async () => {
    const kase = await openCase();
    await raise(kase);
    expect(await runs(kase)).toHaveLength(1);
  });

  it('does not re-fire once escalated_date is stamped', async () => {
    // The flow's own escalation write re-triggers record-after-update. The
    // guard must NOT be the `is_escalated` boolean: on SQLite/libsql a boolean
    // persists as integer 1, so `is_escalated != true` is `1 != true` = true
    // and the flow loops forever (it wedged a first-boot seed).
    const kase = await openCase();
    await raise(kase);
    const [escalated] = await verify.rows('crm_case', { id: kase.id });
    expect(escalated!.escalated_date, 'the escalation stamped nothing').toBeTruthy();
    await verify.hooks.run('crm_case', 'update', { id: kase.id, description: 'Still down.' }, as(agent));
    expect(await runs(kase), 'the flow re-fired on its own write or a later edit').toHaveLength(1);
  });

  it('does not re-escalate a case that is being resolved or closed', async () => {
    // Observed live: close_case wrote status "closed" and this flow immediately
    // rewrote it back to "escalated".
    for (const status of ['resolved', 'closed', 'escalated']) {
      const kase = await openCase();
      await systemUpdate(verify, 'crm_case', {
        id: kase.id, status, ...(status === 'escalated' ? {} : { resolution: 'Fixed the cable.' }),
      });
      await systemUpdate(verify, 'crm_case', { id: kase.id, priority: 'critical' });
      expect(await runs(kase), `status ${status} must not escalate`).toHaveLength(0);
    }
  });

  it('ignores non-critical cases', async () => {
    for (const priority of ['low', 'medium', 'high']) {
      const kase = await openCase(priority);
      await verify.hooks.run('crm_case', 'update', { id: kase.id, description: 'An edit.' }, as(agent));
      expect(await runs(kase), `priority ${priority} must not escalate`).toHaveLength(0);
    }
  });

  it('flags the case with the reason its validation rule requires', async () => {
    const kase = await openCase();
    await raise(kase);

    const [updated] = await verify.rows('crm_case', { id: kase.id });
    expect(Boolean(updated!.is_escalated)).toBe(true);
    expect(updated!.status).toBe('escalated');
    // `escalation_reason` must accompany `is_escalated` — the object's
    // `escalation_reason_required` validation rejects the write otherwise,
    // which silently aborted this flow until it was supplied.
    expect(updated!.escalation_reason, 'missing reason ⇒ the write is rejected').toBeTruthy();
    expect(updated!.escalated_date).toBeTruthy();
  });

  it('creates no task of its own — the status hook owns escalation tasks', async () => {
    // A task node here produced duplicate, disagreeing tasks (case owner/high
    // vs account owner/urgent) per escalation. On the real engine the status
    // hook (`case_status_side_effects`) does write the escalation task, so the
    // case ends with exactly ONE — and the flow's own run wrote none.
    const kase = await openCase();
    await raise(kase);
    const [run] = await runs(kase);
    expect(
      (run!.summary?.nodes ?? []).filter((n: Rec) => n.nodeType === 'create_record'),
      'case_escalation ran a create node',
    ).toHaveLength(0);
    const tasks = await vi.waitFor(async () => {
      const rows = await verify.rows('crm_task', { related_to_case: kase.id });
      expect(rows.length, 'the status hook wrote no escalation task').toBeGreaterThan(0);
      return rows;
    }, { timeout: 10_000, interval: 50 });
    expect(tasks, 'more than one escalation task').toHaveLength(1);
  });
});

describe('contact_welcome — start condition', () => {
  const create = (over: Rec = {}): Promise<Rec> =>
    verify.hooks.run('crm_contact', 'insert', {
      first_name: 'Ada', last_name: `Lovelace ${++k}`, email: `ada${k}@flow-record-change.test`,
      crm_account: accountId, email_opt_out: false, ...over,
    }, as(rep));
  const prompts = (contact: Rec) => notified(rep.id, 'contact_welcome', `/crm_contact/${contact.id}`);

  it('fires for an owned contact who has not opted out', async () => {
    const contact = await create();
    expect(await prompts(contact)).toHaveLength(1);
  });

  it('respects email_opt_out', async () => {
    const contact = await create({ email_opt_out: true });
    expect(await prompts(contact)).toHaveLength(0);
  });

  it('skips ownerless contacts (nobody to prompt)', async () => {
    // No write produces one: a person's insert that leaves `owner_id` empty is
    // stamped with its creator. So the flow is handed the ownerless record
    // itself, and the engine answers with its own verdict on the start
    // condition.
    const stamped = await create({ owner_id: null });
    expect(stamped.owner_id, 'a person’s ownerless contact was left ownerless').toBe(rep.id);
    const result = await runRecordFlow(verify, 'contact_welcome', 'crm_contact', {
      id: `ownerless_${++k}`, first_name: 'Ada', last_name: 'Lovelace', owner_id: null, email_opt_out: false,
    });
    expect(result.output).toEqual({ skipped: true, reason: 'condition_not_met' });
  });

  it('addresses the prompt to the owner with a resolved name', async () => {
    const contact = await create({ last_name: 'Lovelace' });
    const [prompt, ...more] = await prompts(contact);
    expect(more).toHaveLength(0);
    expect(prompt, 'the owner was not prompted').toBeDefined();
    expect(String(prompt!.payload.templateData.first_name)).toContain('Ada');
    expect(String(prompt!.payload.templateData.last_name)).toContain('Lovelace');
  });
});

describe('task_urgent_alert — start condition', () => {
  const create = (over: Rec = {}): Promise<Rec> =>
    verify.hooks.run('crm_task', 'insert', {
      subject: `Fix outage ${++k}`, priority: 'urgent', status: 'not_started', ...over,
    }, as(rep));
  const alerts = (task: Rec) => notified(rep.id, 'urgent_task', `/crm_task/${task.id}`);

  it('fires for a new urgent, incomplete task', async () => {
    const task = await create();
    expect(await alerts(task)).toHaveLength(1);
  });

  it('gates on the status enum, not the is_completed boolean', async () => {
    // On SQLite/libsql booleans persist as integer 1, so `is_completed != true`
    // is `1 != true` = always true and the guard never trips.
    const task = await create({ status: 'completed' });
    expect(Boolean(task.is_completed), 'the completed task is not flagged completed').toBe(true);
    expect(await alerts(task)).toHaveLength(0);
  });

  it('ignores non-urgent tasks', async () => {
    for (const priority of ['low', 'normal', 'high']) {
      const task = await create({ priority });
      expect(await alerts(task), `priority ${priority} must not alert`).toHaveLength(0);
    }
  });

  it('alerts the owner at warning severity', async () => {
    const task = await create({ subject: 'Fix outage' });
    const [alert, ...more] = await alerts(task);
    expect(more).toHaveLength(0);
    expect(alert, 'the owner was not alerted').toBeDefined();
    expect(alert!.payload.severity).toBe('warning');
    expect(String(alert!.payload.templateData.subject)).toContain('Fix outage');
  });
});

describe('lead_assignment — hot-lead SLA routing', () => {
  const create = (rating: number): Promise<Rec> =>
    verify.hooks.run('crm_lead', 'insert', {
      first_name: 'Ada', last_name: `Lead ${++k}`, company: `Acme ${k}`,
      email: `lead${k}@flow-record-change.test`, rating,
    }, as(rep));
  const alerts = (lead: Rec) => notified(rep.id, 'lead_routing', `/crm_lead/${lead.id}`);

  /**
   * Both branch guards assert the population this flow actually writes.
   *
   * They read `h.notifications.length + h.store.crm_task.length` until #1772 —
   * a sum over two populations, which proves NEITHER is non-empty. That shape
   * is worth naming, because it is what an author reaches for when they are
   * already thinking about vacuity: it looks like it covers both walks below
   * and covers neither.
   *
   * Here the disjunct that can never contribute is the task half:
   * `lead_assignment` authors `update_record` (the SLA date stamp on the lead)
   * and `notify`, and NO `create_record` node at all, so `h.store.crm_task`
   * cannot receive a row from this flow on any input. Its "SLA" is a
   * `next_followup_date` value, never a task row.
   *
   * Measured, both legs in the same file and command: with edge `e4`
   * retargeted from `notify_hot` to `end` (the hot lead loses its alert) and
   * one pre-existing `crm_task` row seeded into the store, the sum form stayed
   * GREEN — the seeded row alone satisfied it while the alert was gone.
   */
  it('routes a hot lead (rating ≥ 4) down the accelerated SLA branch', async () => {
    const lead = await create(5);
    expect((await alerts(lead)).length, 'hot lead produced no follow-up alert').toBeGreaterThan(0);
  });

  it('routes a cold lead down the standard branch', async () => {
    const lead = await create(1);
    expect((await alerts(lead)).length, 'cold lead produced no follow-up alert').toBeGreaterThan(0);
  });

  it('renders both SLA branch alerts with no field left as the literal "undefined"', async () => {
    for (const rating of [5, 1]) {
      const lead = await create(rating);
      const sent = await alerts(lead);
      expect(sent.length, `rating ${rating} sent nothing`).toBeGreaterThan(0);
      for (const n of sent) {
        expect(JSON.stringify(n), `rating ${rating} notification dot-walked a lookup`)
          .not.toContain('undefined');
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

  it('does not re-enter for an opportunity already pending approval', async () => {
    // The flow writes `approval_status`, which re-triggers record-after-update;
    // without a guard it re-enters for the same record (the engine logs
    // "flow re-entered for the same record while still running"). A large
    // deal the rep creates enters approval on insert, and the pending stamp
    // that write lands must not open a second request through the update gate.
    const opp = await verify.hooks.run('crm_opportunity', 'insert', {
      name: `Pending Deal ${++k}`, amount: 750_000, stage: 'negotiation', close_date: '2030-06-30',
      crm_account: accountId,
    }, as(rep));
    const [stored] = await verify.rows('crm_opportunity', { id: opp.id });
    expect(stored!.approval_status).toBe('pending');
    expect(await flowRuns(verify, 'opportunity_approval_on_create', opp.id)).toHaveLength(1);
    expect(await flowRuns(verify, 'opportunity_approval', opp.id), 'the update gate re-entered').toHaveLength(0);
  });

  describe('the large-deal line is inclusive (#1087)', () => {
    // The governance half of the card's truth table, measured through the
    // engine. The parity test reads the operator out of the shipped condition
    // string; this asserts what that operator DOES, on both the update gate and
    // its insert twin — a deal born at exactly $100,000 has to enter approval
    // for the same reason one edited up to it does.
    /** A rep's open deal at `amount`: edited up to it (update gate) or born at it (insert twin). */
    const GATES = [
      ['afterUpdate gate', 'opportunity_approval', async (amount: number) => {
        const [opp] = await verify.seed('crm_opportunity', [{
          name: `Edited Deal ${++k}`, amount: 50_000, stage: 'negotiation', close_date: '2030-06-30',
          crm_account: accountId, owner_id: rep.id,
        }]);
        await verify.hooks.run('crm_opportunity', 'update', { id: opp!.id, amount }, as(rep));
        return String(opp!.id);
      }],
      ['afterInsert twin', 'opportunity_approval_on_create', async (amount: number) => String((
        await verify.hooks.run('crm_opportunity', 'insert', {
          name: `Born Deal ${++k}`, amount, stage: 'negotiation', close_date: '2030-06-30', crm_account: accountId,
        }, as(rep))
      ).id)],
    ] as const;

    // No `$` in these titles: vitest reads `$name` in an `it.each` template as
    // an object-property interpolation, so `$100,000` renders as
    // "undefined,000" and the failure names an amount nobody wrote.
    it.each(GATES)('%s routes a deal at EXACTLY 100,000 for approval', async (_label, flow, write) => {
      const id = await write(100_000);
      expect(await flowRuns(verify, flow, id)).toHaveLength(1);
      const [stored] = await verify.rows('crm_opportunity', { id });
      expect(stored!.approval_status).toBe('pending');
    });

    it.each(GATES)('%s leaves 99,999 alone', async (_label, flow, write) => {
      const id = await write(99_999);
      expect(await flowRuns(verify, flow, id)).toHaveLength(0);
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
    const born = await verify.hooks.run('crm_case', 'insert', {
      subject: `Born critical ${++k}`, description: 'Phoned in as a P1.', crm_account: accountId,
      status: 'new', priority: 'critical',
    }, as(agent));

    const [updated] = await verify.rows('crm_case', { id: born.id });
    expect(Boolean(updated!.is_escalated), 'a case born critical was never escalated').toBe(true);
    expect(updated!.status).toBe('escalated');
    expect(updated!.escalation_reason).toBeTruthy();
  });

  it('opportunity_approval_on_create declares the same gate as its parent', async () => {
    // A deal cannot be BORN pending — an insert's `approval_status` is
    // stamped by the platform, not taken from the caller — so both flows are
    // handed the pending record itself, and the engine's verdict on the start
    // condition must be the same for the twin as for its parent.
    const pending = {
      id: `pending_${++k}`, amount: 750_000, approval_status: 'pending', stage: 'negotiation', owner_id: rep.id,
    };
    const parent = await runRecordFlow(verify, 'opportunity_approval', 'crm_opportunity', pending);
    const twin = await runRecordFlow(verify, 'opportunity_approval_on_create', 'crm_opportunity', pending);
    expect(parent.output).toEqual({ skipped: true, reason: 'condition_not_met' });
    expect(twin.output).toEqual(parent.output);
  });
});

/**
 * Execution identity under a USER-LESS trigger (#684).
 *
 * The metadata side of this invariant — every record-change flow declares
 * `runAs: 'system'` — lives in `actions-flows-integrity.test.ts`, enumerated
 * from the compiled stack so a new flow cannot slip past it. What that guard
 * cannot show is WHY, so these run the real flows off a write that carries
 * NO trigger user — a system write (the seed loader, an integration, another
 * `runAs:'system'` flow) or a guest web-to-lead submission — and assert on
 * what comes out.
 *
 * Direction of the counter-proof, decided before running it: with `runAs`
 * stripped back to the schema default the run must FAIL at its first data node
 * with the engine's `[runAs]` refusal, and the record must be untouched. On
 * 17.7.0 two of the three flows do not even get that far: the platform's
 * flow-authoring door refuses the `runAs`-less variant outright, because its
 * update node writes `readonly` fields that a `runAs: 'user'` run would have
 * silently stripped (`flow-update-readonly-field`). The third registers, and
 * is run user-less on a stored record (`runRecordFlow` — the trigger hands it
 * no user), and refuses as predicted.
 */
describe('record-change flows under a user-less trigger (#684)', () => {
  /** The flow as it was authored before #684: `runAs` back at its default. */
  const withoutRunAs = (flow: Rec): Rec => {
    const { runAs: _dropped, ...rest } = flow;
    return rest;
  };

  /** Register `flow` under `name` through the authoring door; the response. */
  const register = (name: string, flow: Rec) => verify.apiAs(admin, 'POST', '/automation', { ...flow, name });

  /** Register `flow` under `name` for the duration of `body` (it must register). */
  const withFlow = async <T>(name: string, flow: Rec, body: () => Promise<T>): Promise<T> => {
    const registered = await register(name, flow);
    expect(registered.status, await registered.clone().text()).toBe(200);
    try {
      return await body();
    } finally {
      expect((await verify.apiAs(admin, 'DELETE', `/automation/${name}`)).status).toBe(200);
    }
  };

  const nodeStatus = (summary: Rec | undefined, id: string) =>
    (summary?.nodes ?? []).find((n: Rec) => n.nodeId === id)?.status;

  it('case_escalation escalates a case written with no session', async () => {
    // A queued case the agent owns, raised to critical by a system write.
    const kase = await verify.hooks.run('crm_case', 'insert', {
      subject: `Integration P1 ${++k}`, description: 'Raised by the monitoring integration.',
      crm_account: accountId, status: 'new', priority: 'medium',
    }, as(agent));
    await systemUpdate(verify, 'crm_case', { id: kase.id, priority: 'critical' });

    const [run] = await flowRuns(verify, 'case_escalation', kase.id);
    expect(String(run?.error ?? ''), 'the runAs refusal is back').not.toContain('[runAs]');
    expect(run?.status).toBe('completed');
    const [stored] = await verify.rows('crm_case', { id: kase.id });
    expect(stored!.status).toBe('escalated');
    expect(Boolean(stored!.is_escalated)).toBe(true);
    expect(await notified(agent.id, 'case_escalated', `/crm_case/${kase.id}`)).toHaveLength(1);
  });

  it('…and REFUSES the same flow once runAs is dropped (the shape #684 fixed)', async () => {
    // Refused before it can run at all: the authoring door names the two
    // readonly stamps a user-scoped run would silently drop.
    const res = await register('case_escalation_without_runas', withoutRunAs(CaseEscalationFlow as unknown as Rec));
    expect(res.status).toBe(422);
    const body = await res.json() as Rec;
    expect(body.error.code).toBe('INVALID_METADATA');
    expect(JSON.stringify(body.error.details)).toContain('flow-update-readonly-field');
  });

  it('opportunity_approval reaches its approval node for a system-created deal', async () => {
    // The governance hole the acceptance sweep demonstrated: a $150K renewal
    // created by the runAs:'system' contract_renewal sweep fired this flow
    // user-less and died at `get_opportunity`, leaving the deal unlocked at
    // approval_status 'not_required' with no request ever opened.
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Acme Renewal ${++k}`, amount: 50_000, stage: 'negotiation', close_date: '2030-06-30',
      approval_status: 'not_required', crm_account: accountId, owner_id: rep.id,
    }]);
    await systemUpdate(verify, 'crm_opportunity', { id: deal!.id, amount: 150_000 });

    const [run] = await flowRuns(verify, 'opportunity_approval', deal!.id);
    expect(String(run?.error ?? ''), 'the deal is bypassing approval again').not.toContain('[runAs]');
    // The run parks at `manager_review` with a request open — the deal is in
    // approval, as a person-created one would be.
    expect(run?.status).toBe('paused');
    expect(await verify.rows('sys_approval_request', { record_id: deal!.id })).toHaveLength(1);
    const [stored] = await verify.rows('crm_opportunity', { id: deal!.id });
    expect(stored!.approval_status).toBe('pending');
  });

  it('…and never gets that far once runAs is dropped', async () => {
    const res = await register('opportunity_approval_without_runas', withoutRunAs(OpportunityApprovalFlow as unknown as Rec));
    expect(res.status).toBe(422);
    const body = await res.json() as Rec;
    expect(body.error.code).toBe('INVALID_METADATA');
    expect(JSON.stringify(body.error.details)).toContain('flow-update-readonly-field');
  });

  it('lead_assignment stamps the SLA on a web-to-lead submission', async () => {
    // A guest submission: no trigger user at all.
    const lead = await guestInsert(verify, 'crm_lead', {
      first_name: 'Ada', last_name: `Web ${++k}`, company: `Web Co ${k}`,
      email: `web${k}@flow-record-change.test`, rating: 5,
    });
    const [run] = await flowRuns(verify, 'lead_assignment', lead.id);
    expect(String(run?.error ?? '')).not.toContain('[runAs]');
    const [stored] = await verify.rows('crm_lead', { id: lead.id });
    expect(stored!.next_followup_date, 'hot lead got no SLA date').toBeTruthy();
    // The anonymous form grant cannot read the rep pool, so `lead_auto_assign`
    // leaves a web lead unowned (its documented stand-down).
    expect(stored!.owner_id).toBeNull();
  });

  it('lead_assignment alerts the owner of an integration-written lead', async () => {
    // The integration shape: a lead that arrives OWNED, with no trigger user.
    // The system's seed door writes it without firing record-change flows, so
    // the flow is handed the stored row the way the trigger hands it a write —
    // user-less.
    const [lead] = await verify.seed('crm_lead', [{
      first_name: 'Ada', last_name: `Integration ${++k}`, company: `Integration Co ${k}`,
      email: `integration${k}@flow-record-change.test`, rating: 5, owner_id: rep.id,
    }]);
    const [held] = await verify.rows('crm_lead', { id: lead!.id });
    const result = await runRecordFlow(verify, 'lead_assignment', 'crm_lead', held!);
    expect(String(result.error ?? '')).not.toContain('[runAs]');
    const [stored] = await verify.rows('crm_lead', { id: lead!.id });
    expect(stored!.next_followup_date, 'hot lead got no SLA date').toBeTruthy();
    expect(await notified(rep.id, 'lead_routing', `/crm_lead/${lead!.id}`)).toHaveLength(1);
  });

  it('…and gets neither SLA nor alert once runAs is dropped', async () => {
    const [lead] = await verify.seed('crm_lead', [{
      first_name: 'Ada', last_name: `Integration ${++k}`, company: `Integration Co ${k}`,
      email: `integration${k}@flow-record-change.test`, rating: 5, owner_id: rep.id,
    }]);
    const [stored] = await verify.rows('crm_lead', { id: lead!.id });
    const result = await withFlow('lead_assignment_without_runas', withoutRunAs(LeadAssignmentFlow as unknown as Rec), () =>
      runRecordFlow(verify, 'lead_assignment_without_runas', 'crm_lead', stored!));
    expect(result.success).toBe(false);
    expect(String(result.error)).toContain('[runAs] refusing a data operation');
    const [after] = await verify.rows('crm_lead', { id: lead!.id });
    expect(after!.next_followup_date, 'no SLA date was stamped').toBeNull();
    expect(await notified(rep.id, 'lead_routing', `/crm_lead/${lead!.id}`)).toHaveLength(0);
  });

  /**
   * MEASURED, and deliberately recorded because the issue that prompted #684
   * over-stated it: the notify-only record-change flows (`contact_welcome`,
   * `task_urgent_alert`, `opportunity_won_alert`) were NOT refused on
   * 17.0.0-rc.2. The guard fires at `get_record` / `create_record` /
   * `update_record` / `delete_record`, and `notify` dispatches through the
   * messaging service without a run data context, so a user-less run of these
   * completes and delivers.
   *
   * `case_csat_followup` was the fourth flow this case covered, and it was the
   * one that carried the measurement through a `wait` node — the run suspended
   * at its P1D timer with the notify on the far side. #1428 retired that flow
   * with the two fields it existed to collect, so the leg went with it; the
   * three above still pin the same measurement.
   *
   * They carry `runAs: 'system'` anyway — the declaration records that
   * record-change automation runs as the platform, so a data node added later
   * inherits a reasoned elevation instead of a production refusal. This case
   * pins the measurement so nobody "fixes" a break that was never there, and
   * so the day it DOES start being refused, we hear about it here.
   */
  it('the notify-only siblings deliver either way (they were never the broken ones)', async () => {
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Ada', last_name: `Integration ${++k}`, email: `contact${k}@flow-record-change.test`,
      crm_account: accountId, owner_id: rep.id, email_opt_out: false,
    }]);
    const [stored] = await verify.rows('crm_contact', { id: contact!.id });
    const url = `/crm_contact/${contact!.id}`;

    const shipped = await runRecordFlow(verify, 'contact_welcome', 'crm_contact', stored!);
    expect(String(shipped.error ?? '')).not.toContain('[runAs]');
    expect(await notified(rep.id, 'contact_welcome', url), 'a notify-only flow was refused — the guard widened').toHaveLength(1);

    const variant = await withFlow('contact_welcome_without_runas', withoutRunAs(ContactWelcomeFlow as unknown as Rec), () =>
      runRecordFlow(verify, 'contact_welcome_without_runas', 'crm_contact', stored!));
    expect(String(variant.error ?? '')).not.toContain('[runAs]');
    expect(await notified(rep.id, 'contact_welcome', url), 'a notify-only flow was refused — the guard widened').toHaveLength(2);
  });
});
