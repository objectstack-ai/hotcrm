// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import campaignHooks, { CAMPAIGN_METRIC_WRITE_KEYS } from '../src/marketing/objects/campaign.hook';
import leadHooks from '../src/sales/objects/lead.hook';
import {
  hotcrmStack, hotcrmMemoryStack, signUpPerson, guestInsert, systemUpdate, recordEngineWrites, today, daysFromNow,
  type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Runtime tests for the SERVICE / CRM-operations hooks — the real handler
 * bodies, inside the real engine's write path.
 *
 * Every case runs on the shipped app booted by `@objectstack/verify`: a
 * person's write through the engine's write door (`hooks.run`) as the persona
 * the case is about — a service agent on cases and articles, a sales rep on
 * leads and tasks, a sales manager on contracts and forecasts, a marketing user
 * on campaigns — with the record put in its prior state by a system write where
 * no person's write can produce it, and an anonymous web submission through
 * the form door's own context. What is asserted is the row the engine stored,
 * or the engine's refusal. The `async: true` hooks run after the write that
 * fired them has returned, so their result is waited for, and a claim that one
 * wrote NOTHING is read off the writes the engine received.
 *
 * Several of these hooks write a DIFFERENT object through `ctx.api`, which
 * runs as the person whose write fired them. Where that person holds no edit
 * right on the target, the engine refuses the write and the hook's
 * `onError: 'log'` swallows it; those cases are pinned below as measured
 * defects, beside the same behaviour shown through a writer that holds the
 * right.
 *
 * Companion file: hooks-runtime-sales.test.ts (opportunity, quote, account,
 * contact, product).
 */

let verify: VerifyStack;
let admin: string;
let agent: Person;
let rep: Person;
let manager: Person;
let marketer: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  agent = await signUpPerson(verify, 'agent@hooks-runtime-service.test', {
    name: 'Service Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  rep = await signUpPerson(verify, 'rep@hooks-runtime-service.test', {
    name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  manager = await signUpPerson(verify, 'manager@hooks-runtime-service.test', {
    name: 'Sales Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  marketer = await signUpPerson(verify, 'marketer@hooks-runtime-service.test', {
    name: 'Marketing User', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
}, 120_000);

const as = (who: Person | string) => ({ as: typeof who === 'string' ? who : who.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;

/** Wait for `object`'s row `id` to satisfy `check` — an `async: true` hook's result. */
const settles = (object: string, id: string, check: (row: Rec) => void): Promise<Rec> =>
  vi.waitFor(async () => {
    const row = await stored(object, id);
    check(row);
    return row;
  }, { timeout: 10_000, interval: 50 });

/** Run `write` with a recorder attached, give the async hooks time to run, and return the recorder. */
const engineWritesDuring = async (write: () => Promise<unknown>, settleMs = 400) => {
  const recorder = recordEngineWrites(verify);
  try {
    await write();
    await new Promise((r) => setTimeout(r, settleMs));
    await Promise.all(recorder.writes.map((w) => w.settled));
    return recorder;
  } finally {
    recorder.restore();
  }
};

/** An account owned by the rep, written as the system. */
const accountOf = async (over: Rec = {}): Promise<Rec> =>
  (await verify.seed('crm_account', [{ name: `Service Hooks Co ${++k}`, owner_id: rep.id, ...over }]))[0]!;

// ─────────────────────────────────────────────────────────────── case ──

describe('case_sla_defaults', () => {
  /** The agent logging a case. */
  const agentCase = (doc: Rec = {}): Promise<Rec> =>
    verify.hooks.run('crm_case', 'insert', { subject: `Case ${++k}`, description: 'Something broke.', ...doc }, as(agent));

  it('materialises priority_rank so queue views sort by urgency, not alphabetically', async () => {
    // Sorting on `priority` itself compares raw strings and inverts urgency
    // (medium > low > high > critical).
    for (const [priority, rank] of [['low', 1], ['medium', 2], ['high', 3], ['critical', 4]] as const) {
      const kase = await agentCase({ priority });
      expect((await stored('crm_case', kase.id)).priority_rank).toBe(rank);
    }
  });

  it('gives a critical case a 4-hour SLA when none was supplied', async () => {
    const before = Date.now();
    const kase = await agentCase({ priority: 'critical' });
    const due = new Date((await stored('crm_case', kase.id)).sla_due_date as string).getTime();
    expect(due).toBeGreaterThan(before + 3.9 * 3_600_000);
    expect(due).toBeLessThan(before + 4.1 * 3_600_000);
  });

  it('gives a non-critical case an SLA too, off the priority × tier matrix', async () => {
    // This assertion used to read `expect(input.sla_due_date).toBeUndefined()`
    // — High, Medium and Low cases got no clock at all, which is what kept
    // `case_sla_monitor` from ever firing for three of the four priorities
    // (#595). The cells themselves are pinned in `test/case-sla-matrix.test.ts`;
    // here the point is only that the field is no longer blank. With no
    // account the tier is unresolvable, so this lands on the default `smb`
    // column.
    const before = Date.now();
    const kase = await agentCase({ priority: 'high' });
    const due = new Date((await stored('crm_case', kase.id)).sla_due_date as string).getTime();
    expect(due).toBeGreaterThan(before + 7.9 * 3_600_000);
    expect(due).toBeLessThan(before + 8.1 * 3_600_000);
  });

  it('stamps defaults and strips privileged fields on an anonymous guest submission', async () => {
    const written = await guestInsert(verify, 'crm_case', {
      subject: 'Help', description: 'Please.', owner_id: rep.id, is_escalated: true, is_closed: true,
      internal_notes: 'nope', resolution: 'nope', escalation_reason: 'nope',
    });
    const row = await stored('crm_case', written.id);
    expect(row.origin).toBe('web');
    expect(row.status).toBe('new');
    // The FIELD's default, not the hook's (#1296): `crm_case.priority` declares
    // its `low` option `default: true`, and the engine applies it to the row
    // that becomes `ctx.input` before `beforeInsert` runs. The guest branch no
    // longer carries a default of its own — this is the engine's.
    expect(row.priority, 'the field default did not land').toBe('low');
    // The branch OVERWRITES with a safe value; it does not remove the key
    // (#1133) — `delete` on a hook's `input` is a silent no-op through the real
    // engine. So the stored values are what is asserted.
    for (const [stripped, safe] of [
      ['owner_id', null], ['internal_notes', null], ['resolution', null],
      // The flag AND the prose explaining it (#1296): a case stating an escalation
      // reason while not escalated contradicts itself in one field group.
      ['is_escalated', false], ['escalation_reason', null],
      // Derived from the stored status rather than stripped, so a guest can no
      // longer store `closed` and `is_closed: false` side by side.
      ['is_closed', false],
    ] as Array<[string, unknown]>) {
      expect(row[stripped] ?? null, `guest submission kept privileged field ${stripped}`).toBe(safe);
    }
  });

  it('leaves a priority the engine already defaulted alone', async () => {
    // The guest branch must leave the field's own default be — there is no
    // code left in it that could overwrite one, so the field is now the single
    // source of the default.
    const written = await guestInsert(verify, 'crm_case', { subject: 'Help', description: 'Please.', priority: 'low' });
    const row = await stored('crm_case', written.id);
    expect(row.origin, 'the guest branch did not run at all (positive control)').toBe('web');
    expect(row.priority, 'the guest branch overwrote a priority the engine had defaulted').toBe('low');
    expect(row.priority_rank, 'the rank must follow the priority the hook saw').toBe(1);
  });

  it('derives is_closed from status for trusted writes', async () => {
    const closing = await agentCase();
    await verify.hooks.run('crm_case', 'update', { id: closing.id, status: 'closed', resolution: 'Replaced the toner.' }, as(agent));
    const closed = await stored('crm_case', closing.id);
    expect(closed.is_closed).toBe(true);
    expect(closed.closed_date, 'closed_date should be stamped on the transition').toBeTruthy();

    const working = await agentCase();
    await verify.hooks.run('crm_case', 'update', { id: working.id, status: 'in_progress' }, as(agent));
    expect((await stored('crm_case', working.id)).is_closed).toBe(false);
  });

  it('computes resolution_time_hours from created → closed', async () => {
    // The close is stamped by the hook on the transition (a caller's
    // `closed_date` does not survive it), so the case is opened a day before
    // the agent closes it.
    const [kase] = await verify.seed('crm_case', [{
      subject: `Old case ${++k}`, description: 'Opened yesterday.', status: 'in_progress',
      created_at: new Date(Date.now() - 24 * 3_600_000).toISOString(), owner_id: agent.id,
    }]);
    await verify.hooks.run('crm_case', 'update', { id: kase!.id, status: 'closed', resolution: 'Fixed.' }, as(agent));
    const hours = Number((await stored('crm_case', kase!.id)).resolution_time_hours);
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThan(24.1);
  });
});

describe('case_status_side_effects', () => {
  /** A case on an account the rep owns, opened by the agent. */
  const caseOnAccount = async () => {
    const account = await accountOf();
    const kase = await verify.hooks.run('crm_case', 'insert', {
      subject: `Side effects ${++k}`, description: 'Customer is waiting.', crm_account: account.id, status: 'in_progress',
    }, as(agent));
    return { account, kase };
  };
  const escalationTask = (caseId: string) =>
    vi.waitFor(async () => {
      const [task] = await verify.rows('crm_task', { related_to_case: caseId });
      expect(task, 'no escalation task created').toBeTruthy();
      return task!;
    }, { timeout: 10_000, interval: 50 });

  it('creates an urgent task for the account owner on escalation', async () => {
    const { kase } = await caseOnAccount();
    await verify.hooks.run('crm_case', 'update', { id: kase.id, status: 'escalated', escalation_reason: 'Down for a day.' }, as(agent));
    const task = await escalationTask(kase.id);
    expect(task.priority).toBe('urgent');
    expect(task.owner_id).toBe(rep.id);
    expect(task.due_date).toBe(daysFromNow(1));
  });

  /**
   * The bump is its own hook since #2014. Writing closed_date as a proxy for
   * "resolved" corrupted resolution metrics: a resolved-then-closed case kept
   * its resolve time as its close time. closed_date belongs exclusively to the
   * `closed` transition.
   *
   * An agent's own resolve reaches the account. An agent holds no edit right
   * on accounts, so the bump declares `runAs: 'system'`: before, it rode on
   * this hook as the caller, the account write was refused, `onError: 'log'`
   * swallowed it, and the activity clock never moved.
   */
  it('case_resolution_account_activity: an agent’s resolve bumps the account’s activity clock WITHOUT stamping a date on the case', async () => {
    const { account, kase } = await caseOnAccount();
    await verify.hooks.run('crm_case', 'update', { id: kase.id, status: 'resolved', resolution: 'Fixed.' }, as(agent));
    await settles('crm_account', account.id, (a) => expect(a.last_activity_date).toBe(today()));
    expect((await stored('crm_case', kase.id)).closed_date ?? null).toBeNull();
    expect((await stored('crm_account', account.id)).updated_by, 'the bump was recorded as nobody’s write').toBe(agent.id);
  });

  it('does not re-fire when the status did not change', async () => {
    const { kase } = await caseOnAccount();
    await verify.hooks.run('crm_case', 'update', { id: kase.id, status: 'escalated', escalation_reason: 'Down.' }, as(agent));
    await escalationTask(kase.id);
    const engine = await engineWritesDuring(() =>
      verify.hooks.run('crm_case', 'update', { id: kase.id, status: 'escalated', subject: 'Still down' }, as(agent)));
    expect(engine.of('crm_task', 'insert'), 'a second escalation task was opened').toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────── contract ──

/** The parties a contract hangs off — an account and its contact — written as the system. */
const contractParties = async (accountOver: Rec = {}): Promise<{ account: Rec; contact: Rec }> => {
  const account = await accountOf(accountOver);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Cora', last_name: `Signer ${++k}`, email: `cora${k}@hooks-runtime-service.test`, crm_account: account.id, owner_id: rep.id,
  }]);
  return { account, contact: contact! };
};

/** A contract the manager drafts (`doc` on top of a 12-month term). */
const managerContract = async (doc: Rec, accountOver: Rec = {}): Promise<Rec> => {
  const { account, contact } = await contractParties(accountOver);
  return verify.hooks.run('crm_contract', 'insert', {
    crm_account: account.id, crm_contact: contact.id, contract_type: 'subscription', contract_value: 12_000,
    billing_frequency: 'monthly', payment_terms: 'net_30', status: 'draft', ...doc,
  }, as(manager));
};

/** A contract in `doc`'s stored state, written as the system. */
const contractOf = async (doc: Rec, accountOver: Rec = {}): Promise<Rec> => {
  const { account, contact } = await contractParties(accountOver);
  return (await verify.seed('crm_contract', [{
    crm_account: account.id, crm_contact: contact.id, contract_type: 'subscription', contract_value: 12_000,
    billing_frequency: 'monthly', payment_terms: 'net_30', owner_id: manager.id, ...doc,
  }]))[0]!;
};

describe('contract_validation', () => {
  it('accepts a date range matching the declared term', async () => {
    await expect(managerContract({ start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12 })).resolves.toBeTruthy();
  });

  it('rejects a term that disagrees with the date range by more than a month', async () => {
    await expect(managerContract({ start_date: '2026-01-01', end_date: '2026-07-01', contract_term_months: 12 }))
      .rejects.toThrow(/does not match date range/);
  });

  it('tolerates a one-month rounding difference', async () => {
    await expect(managerContract({ start_date: '2026-01-01', end_date: '2026-12-15', contract_term_months: 12 })).resolves.toBeTruthy();
  });

  it('refuses to shrink end_date after activation', async () => {
    // Shrunk within the term's one-month tolerance, so the shrink rule is the
    // one that answers.
    const contract = await contractOf({ status: 'activated', start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12 });
    await expect(verify.hooks.run('crm_contract', 'update', { id: contract.id, end_date: '2026-12-15' }, as(manager)))
      .rejects.toThrow(/Cannot shrink end_date/);
  });

  it('allows extending end_date after activation', async () => {
    const contract = await contractOf({ status: 'activated', start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12 });
    await verify.hooks.run('crm_contract', 'update', { id: contract.id, end_date: '2028-01-01', contract_term_months: 24 }, as(manager));
    expect((await stored('crm_contract', contract.id)).end_date).toBe('2028-01-01');
  });

  it('allows shrinking end_date while still a draft', async () => {
    const contract = await contractOf({ status: 'draft', start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12 });
    await verify.hooks.run('crm_contract', 'update', { id: contract.id, end_date: '2026-12-15' }, as(manager));
    expect((await stored('crm_contract', contract.id)).end_date).toBe('2026-12-15');
  });
});

describe('contract_on_activation', () => {
  const TERM = { start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12 };
  const activate = (id: string) => verify.hooks.run('crm_contract', 'update', { id, status: 'activated' }, as(manager));

  it('stamps signed_date and promotes the account to customer', async () => {
    const contract = await contractOf({ status: 'draft', ...TERM }, { type: 'prospect' });
    await activate(contract.id);
    await settles('crm_contract', contract.id, (c) => expect(c.signed_date).toBe(today()));
    await settles('crm_account', String(contract.crm_account), (a) => expect(a.type).toBe('customer'));
  });

  it('does not overwrite an existing signed_date', async () => {
    const contract = await contractOf({ status: 'draft', signed_date: '2025-05-05', ...TERM }, { type: 'customer' });
    const engine = await engineWritesDuring(() => activate(contract.id));
    expect(
      engine.of('crm_contract', 'update').filter((w) => 'signed_date' in (w.args[1] as Rec)),
      'the activation re-stamped the signature date',
    ).toHaveLength(0);
    expect((await stored('crm_contract', contract.id)).signed_date).toBe('2025-05-05');
  });

  it('creates NO renewal task — that belongs to the contract_renewal flow', async () => {
    // The activation-time task this hook used to create hardcoded a 60-day
    // notice and duplicated the flow, which honours renewal_notice_days.
    const contract = await contractOf({ status: 'draft', ...TERM }, { type: 'prospect' });
    const engine = await engineWritesDuring(async () => {
      await activate(contract.id);
      await settles('crm_contract', contract.id, (c) => expect(c.signed_date).toBe(today()));
    });
    expect(engine.of('crm_task', 'insert')).toHaveLength(0);
  });

  it('is a no-op when the contract was already activated', async () => {
    const contract = await contractOf({ status: 'activated', ...TERM }, { type: 'prospect' });
    const engine = await engineWritesDuring(() =>
      verify.hooks.run('crm_contract', 'update', { id: contract.id, status: 'activated', description: 'Re-saved.' }, as(manager)));
    // Only the manager's own write reached the contract, and nothing reached the account.
    expect(engine.of('crm_contract', 'update')).toHaveLength(1);
    expect(engine.of('crm_account', 'update')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────── campaign ──

/** A campaign of the marketer's in `doc`'s stored state, written as the system. */
const campaignOf = async (doc: Rec = {}): Promise<Rec> =>
  (await verify.seed('crm_campaign', [{
    name: `Campaign ${++k}`, status: 'in_progress', start_date: daysFromNow(-7), end_date: daysFromNow(30),
    owner_id: marketer.id, ...doc,
  }]))[0]!;

/** A lead of the rep's, written as the system. */
const leadOf = async (over: Rec = {}): Promise<Rec> =>
  (await verify.seed('crm_lead', [{
    first_name: 'Lee', last_name: `Prospect ${++k}`, company: `Lead Co ${k}`, email: `lead${k}@hooks-runtime-service.test`,
    owner_id: rep.id, ...over,
  }]))[0]!;

describe('campaign_validation', () => {
  const marketerCampaign = (doc: Rec) =>
    verify.hooks.run('crm_campaign', 'insert', { name: `Launch ${++k}`, status: 'planning', ...doc }, as(marketer));

  it('rejects a start_date after the end_date', async () => {
    await expect(marketerCampaign({ start_date: '2026-06-01', end_date: '2026-01-01' })).rejects.toThrow(/must not be after end_date/);
  });

  it('a campaign without both dates cannot be stored at all', async () => {
    // Both dates are REQUIRED on `crm_campaign`, so the engine refuses a
    // campaign missing one on every writer — the hook's own "no in_progress
    // without both dates" rule never meets one.
    await expect(marketerCampaign({ start_date: '2026-01-01' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fields: expect.arrayContaining([expect.objectContaining({ field: 'end_date' })]),
    });
  });

  it('allows in_progress once both dates are present', async () => {
    const campaign = await marketerCampaign({ start_date: '2026-01-01', end_date: '2026-12-31' });
    await verify.hooks.run('crm_campaign', 'update', { id: campaign.id, status: 'in_progress' }, as(marketer));
    expect((await stored('crm_campaign', campaign.id)).status).toBe('in_progress');
  });
});

describe('campaign_metrics_refresh', () => {
  /** The marketer moving a campaign's status. */
  const transition = (id: string, status = 'completed') =>
    verify.hooks.run('crm_campaign', 'update', { id, status }, as(marketer));

  /**
   * A campaign with members (a converted lead that responded, an open lead
   * sent and then responding again on a second membership row), a member of
   * ANOTHER campaign, and three attributed deals — all written as the system.
   */
  const populated = async (status = 'in_progress'): Promise<Rec> => {
    const campaign = await campaignOf({ status });
    const other = await campaignOf();
    const l1 = await leadOf({ is_converted: true });
    const l2 = await leadOf();
    const l9 = await leadOf();
    await verify.seed('crm_campaign_member', [
      { crm_campaign: campaign.id, crm_lead: l1.id, status: 'responded' },
      { crm_campaign: campaign.id, crm_lead: l2.id, status: 'sent' },
      { crm_campaign: campaign.id, crm_lead: l2.id, status: 'responded' }, // dup lead
      { crm_campaign: other.id, crm_lead: l9.id, status: 'responded' },
    ]);
    const account = await accountOf();
    await verify.seed('crm_opportunity', [
      { name: `Won ${++k}`, crm_campaign: campaign.id, stage: 'closed_won', win_reason: 'better_price', amount: 100, close_date: '2026-01-01', crm_account: account.id, owner_id: rep.id },
      { name: `Open ${k}`, crm_campaign: campaign.id, stage: 'proposal', amount: 50, close_date: '2030-01-01', crm_account: account.id, owner_id: rep.id },
      { name: `Won Too ${k}`, crm_campaign: campaign.id, stage: 'closed_won', win_reason: 'better_price', amount: 400, close_date: '2026-01-01', crm_account: account.id, owner_id: rep.id },
    ]);
    // The seeded members fire the member-side refresh (`async: true`); let it
    // land before a case reads or records anything.
    await settles('crm_campaign', campaign.id, (c) => expect(c.num_sent).toBe(3));
    await new Promise((r) => setTimeout(r, 300));
    return campaign;
  };

  it('counts leads through the campaign_member junction, not a lead.campaign field', async () => {
    // `crm_lead` has NO `campaign` field. The old direct-count queries matched
    // nothing, so every lead metric was silently zero.
    const campaign = await populated();
    await transition(campaign.id);
    await settles('crm_campaign', campaign.id, (c) => {
      expect(c.num_leads, 'distinct leads via the junction').toBe(2);
      expect(c.num_converted_leads).toBe(1);
      expect(c.num_opportunities).toBe(3);
      expect(c.num_won_opportunities).toBe(2);
      expect(c.actual_revenue).toBe(500);
      // num_sent is "total members enrolled" — the old `sent || members` form
      // under-counted as members progressed past `sent`.
      expect(c.num_sent).toBe(3);
      expect(c.num_responses).toBe(2);
    });
  });

  it('writes zeroes rather than skipping when a campaign has no members', async () => {
    // Stale numbers stored on purpose, so a refresh that SKIPPED would show.
    const campaign = await campaignOf({ num_leads: 7, actual_revenue: 999 });
    await transition(campaign.id);
    await settles('crm_campaign', campaign.id, (c) => {
      expect(c.num_leads).toBe(0);
      expect(c.actual_revenue).toBe(0);
    });
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
    const campaign = await populated('planning');
    await systemUpdate(verify, 'crm_campaign', { id: campaign.id, num_sent: 0 });
    await transition(campaign.id, 'in_progress');
    await settles('crm_campaign', campaign.id, (c) => expect(c.num_sent, 'a live campaign reports live numbers').toBe(3));
  });

  it('is a no-op when the status did not move', async () => {
    const campaign = await campaignOf({ status: 'completed' });
    const engine = await engineWritesDuring(() =>
      verify.hooks.run('crm_campaign', 'update', { id: campaign.id, status: 'completed', description: 'Re-saved.' }, as(marketer)));
    expect(engine.of('crm_campaign', 'update'), 'the refresh wrote on a non-transition').toHaveLength(1);
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
    const campaign = await populated();
    const metricOnly = await engineWritesDuring(() =>
      verify.hooks.run('crm_campaign', 'update', { id: campaign.id, num_sent: 3 }, as(marketer)));
    expect(metricOnly.of('crm_campaign', 'update'), 'a metric-only write must not re-enter the refresh').toHaveLength(1);

    const engine = await engineWritesDuring(async () => {
      await transition(campaign.id);
      await settles('crm_campaign', campaign.id, (c) => expect(c.num_leads).toBe(2));
    });
    const refresh = engine.of('crm_campaign', 'update').filter((w) => !('status' in (w.args[1] as Rec)));
    expect(refresh).toHaveLength(1);
    expect(
      Object.keys(refresh[0]!.args[1] as Rec).filter((key) => key !== 'id' && !CAMPAIGN_METRIC_WRITE_KEYS.includes(key)),
      'the refresh write must carry nothing that could re-trigger it',
    ).toEqual([]);
  });
});

describe('campaign_attribution_refresh', () => {
  /**
   * `num_opportunities` / `num_won_opportunities` / `actual_revenue` derive from
   * opportunities, so the membership trigger alone would leave exactly the
   * three metrics `roi` is built on stale. Shown through the admin, and then
   * through a sales rep's own win, which reaches the campaign because the
   * refresh runs elevated (#2014).
   */
  const attributedDeal = async (campaignId: string, over: Rec = {}) => {
    const account = await accountOf();
    return (await verify.seed('crm_opportunity', [{
      name: `Attributed ${++k}`, crm_campaign: campaignId, stage: 'negotiation', amount: 900, close_date: '2030-01-01',
      crm_account: account.id, owner_id: rep.id, ...over,
    }]))[0]!;
  };

  it('recomputes the campaign when an opportunity is won', async () => {
    const campaign = await campaignOf({ actual_revenue: 0 });
    const deal = await attributedDeal(campaign.id);
    await verify.hooks.run('crm_opportunity', 'update', { id: deal.id, stage: 'closed_won', win_reason: 'better_price' }, as(admin));
    await settles('crm_campaign', campaign.id, (c) => {
      expect(c.actual_revenue).toBe(900);
      expect(c.num_won_opportunities).toBe(1);
    });
  });

  it('recomputes BOTH campaigns when an opportunity is re-attributed', async () => {
    // An OPEN deal: a won one is frozen, so it cannot be re-attributed by a
    // person at all. Stale counts are stored on purpose, so a side that is
    // not recomputed shows.
    const left = await campaignOf({ num_opportunities: 1 });
    const arrived = await campaignOf({ num_opportunities: 0 });
    const deal = await attributedDeal(left.id);
    await verify.hooks.run('crm_opportunity', 'update', { id: deal.id, crm_campaign: arrived.id }, as(admin));
    await settles('crm_campaign', arrived.id, (c) => expect(c.num_opportunities, 'the new campaign gains it').toBe(1));
    await settles('crm_campaign', left.id, (c) => expect(c.num_opportunities, 'the old campaign gives it up').toBe(0));
  });

  /**
   * A sales rep winning their own attributed deal reaches the campaign (#2014).
   * A rep holds no edit right on campaigns, so the refresh declares
   * `runAs: 'system'`: before it did, the campaign write was refused as the
   * rep, `onError: 'log'` swallowed it, and the deal was won while the
   * campaign's revenue stayed 0.
   */
  it('a rep’s win reaches the campaign it is attributed to', async () => {
    const campaign = await campaignOf({ actual_revenue: 0 });
    const deal = await attributedDeal(campaign.id);
    await verify.hooks.run('crm_opportunity', 'update', { id: deal.id, stage: 'closed_won', win_reason: 'better_price' }, as(rep));
    expect((await stored('crm_opportunity', deal.id)).stage).toBe('closed_won');
    await settles('crm_campaign', campaign.id, (c) => {
      expect(c.actual_revenue).toBe(900);
      expect(c.num_won_opportunities).toBe(1);
    });
  });
});

describe('campaign_lead_conversion_refresh', () => {
  /**
   * Two campaigns; the converting lead L1 is a member of both (responded in
   * one, sent in the other), and another lead L2 is in the first. The flip of
   * `is_converted` is the admin's (who may write members and campaigns).
   *
   * On the SPARSE datasource, and the last case once more on SQL, the default.
   * The promotion reads the lead's memberships with a field projection, then
   * updates each by its `id`: `driver-memory` (like `driver-mongodb`) hands
   * `id` back whether or not the projection names it, the SQL driver hands back
   * exactly the projected columns — so the read names `id`, or on SQL every
   * membership is skipped (#2018).
   */
  const desk = {} as { verify: VerifyStack; admin: string; rep: Person; marketer: Person };
  beforeAll(async () => {
    desk.verify = await hotcrmMemoryStack();
    desk.admin = await desk.verify.signIn();
    desk.rep = await signUpPerson(desk.verify, 'rep@hooks-runtime-service.test', {
      name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
    desk.marketer = await signUpPerson(desk.verify, 'marketer@hooks-runtime-service.test', {
      name: 'Marketing User', positions: ['marketing_user'], permissionSets: ['marketing_user'],
    });
  }, 120_000);

  const store = async (m2Status = 'sent', on: VerifyStack = desk.verify) => {
    const owner = on === desk.verify ? desk.marketer.id : marketer.id;
    const leadOwner = on === desk.verify ? desk.rep.id : rep.id;
    const campaigns = await on.seed('crm_campaign', [1, 2].map((i) => ({
      name: `Converting ${++k}.${i}`, status: 'in_progress', start_date: daysFromNow(-7), end_date: daysFromNow(30), owner_id: owner,
    })));
    const leads = await on.seed('crm_lead', [1, 2].map((i) => ({
      first_name: 'Lee', last_name: `Converting ${k}.${i}`, company: `Conv Co ${k}`, email: `conv${k}.${i}@hooks-runtime-service.test`, owner_id: leadOwner,
    })));
    const [cmp1, cmp2] = campaigns as [Rec, Rec];
    const [l1, l2] = leads as [Rec, Rec];
    const [m1, m2, m3] = await on.seed('crm_campaign_member', [
      { crm_campaign: cmp1.id, crm_lead: l1.id, status: 'responded' },
      { crm_campaign: cmp2.id, crm_lead: l1.id, status: m2Status },
      { crm_campaign: cmp1.id, crm_lead: l2.id, status: 'sent' },
    ]);
    return { cmp1, cmp2, l1, m1: m1!, m2: m2!, m3: m3! };
  };
  const convert = (leadId: string, who?: Person) =>
    desk.verify.hooks.run('crm_lead', 'update', { id: leadId, is_converted: true }, { as: who ? who.token : desk.admin });
  const settlesOn = (object: string, id: string, check: (row: Rec) => void) =>
    vi.waitFor(async () => {
      const [row] = await desk.verify.rows(object, { id });
      check(row!);
    }, { timeout: 10_000, interval: 50 });
  const storedOn = async (object: string, id: string): Promise<Rec> => (await desk.verify.rows(object, { id }))[0]!;

  /**
   * `converted` is a status option the picklist offers and the ROI surfaces
   * segment by. This hook is its ONLY writer — without it the value would be
   * exactly the inert vocabulary #597 removed `opened`/`clicked`/`bounced` for.
   */
  it('promotes every membership of the converting lead to `converted`', async () => {
    const s = await store();
    await convert(s.l1.id);
    await settlesOn('crm_campaign_member', s.m1.id, (m) => expect(m.status, 'a responded member converts').toBe('converted'));
    await settlesOn('crm_campaign_member', s.m2.id, (m) => expect(m.status, 'a sent member converts too').toBe('converted'));
    expect((await storedOn('crm_campaign_member', s.m3.id)).status, "another lead's membership is untouched").toBe('sent');
  });

  it('never drags an unsubscribed member back into the funnel', async () => {
    // That person asked to be left alone; `campaign_member_optout_sync` has
    // already opted them out of email, and overwriting the status here would
    // leave the two records disagreeing about the same human being.
    const s = await store('unsubscribed');
    await convert(s.l1.id);
    await settlesOn('crm_campaign_member', s.m1.id, (m) => expect(m.status).toBe('converted'));
    expect((await storedOn('crm_campaign_member', s.m2.id)).status).toBe('unsubscribed');
  });

  it('refreshes every campaign the lead belongs to', async () => {
    const s = await store();
    await convert(s.l1.id);
    await settlesOn('crm_campaign', s.cmp1.id, (c) => expect(c.num_converted_leads).toBe(1));
    await settlesOn('crm_campaign', s.cmp2.id, (c) => expect(c.num_converted_leads).toBe(1));
  });

  /**
   * The promotion moves m1 from `responded` to `converted`, and a response
   * count matching only the exact `responded` string would DEDUCT the response
   * it grew out of — response_rate falling as the campaign succeeded.
   * `computeCampaignMetrics` counts both states for this reason, so cmp1's one
   * response survives its own success. Under the narrow predicate this reads 0.
   */
  it('conversion does not deduct the response it grew out of', async () => {
    const s = await store();
    const responded = (await desk.verify.rows('crm_campaign_member', { crm_campaign: s.cmp1.id, status: 'responded' })).length;
    expect(responded, 'cmp1 starts with exactly one responded member').toBe(1);
    await convert(s.l1.id);
    await settlesOn('crm_campaign_member', s.m1.id, (m) => expect(m.status).toBe('converted'));
    await settlesOn('crm_campaign', s.cmp1.id, (c) => expect(c.num_responses).toBe(1));
  });

  it('does nothing when is_converted did not just flip', async () => {
    const s = await store();
    await convert(s.l1.id);
    await settlesOn('crm_campaign_member', s.m1.id, (m) => expect(m.status).toBe('converted'));
    const recorder = recordEngineWrites(desk.verify);
    try {
      await desk.verify.hooks.run('crm_lead', 'update', { id: s.l1.id, is_converted: true, description: 'Re-saved.' }, { as: desk.admin });
      await new Promise((r) => setTimeout(r, 400));
      await Promise.all(recorder.writes.map((w) => w.settled));
    } finally {
      recorder.restore();
    }
    expect(recorder.of('crm_campaign_member', 'update')).toHaveLength(0);
    expect(recorder.of('crm_campaign', 'update')).toHaveLength(0);
  });

  /**
   * A sales rep's conversion promotes the lead's memberships (#2014). A rep
   * holds no edit right on campaign members or campaigns, so the refresh
   * declares `runAs: 'system'`: before it did, the promotion was refused as the
   * rep, `onError: 'log'` swallowed it, and the lead converted while its
   * memberships stayed where they were.
   */
  it('a rep’s conversion promotes the lead’s memberships and refreshes their campaigns', async () => {
    const s = await store();
    await convert(s.l1.id, desk.rep);
    expect((await storedOn('crm_lead', s.l1.id)).is_converted).toBe(true);
    await settlesOn('crm_campaign_member', s.m1.id, (m) => expect(m.status).toBe('converted'));
    await settlesOn('crm_campaign_member', s.m2.id, (m) => expect(m.status).toBe('converted'));
    await settlesOn('crm_campaign', s.cmp1.id, (c) => expect(c.num_converted_leads).toBe(1));
    expect((await storedOn('crm_campaign_member', s.m1.id)).updated_by, 'the promotion was recorded as nobody’s write').toBe(desk.rep.id);
  });

  /**
   * On SQL — the datasource this app boots on by default — a converted lead's
   * memberships are promoted too. Until #2018 they never were: the hook's read
   * did not name `id`, the SQL driver returned only `crm_campaign` and
   * `status`, and the promotion skipped every row while the campaign refresh
   * after it still counted the conversion.
   */
  it('on SQL, a converted lead’s memberships are promoted', async () => {
    const s = await store('sent', verify);
    await verify.hooks.run('crm_lead', 'update', { id: s.l1.id, is_converted: true }, as(admin));
    await settles('crm_campaign_member', s.m1.id, (m) => expect(m.status, 'a responded member converts').toBe('converted'));
    await settles('crm_campaign_member', s.m2.id, (m) => expect(m.status, 'a sent member converts too').toBe('converted'));
    await settles('crm_campaign', s.cmp1.id, (c) => expect(c.num_converted_leads).toBe(1));
    expect((await stored('crm_campaign_member', s.m3.id)).status, "another lead's membership is untouched").toBe('sent');
  });
});

// ─────────────────────────────────────────────────────────── forecast ──

describe('forecast_derive_period', () => {
  /** The manager's forecast, as the engine stored it. */
  const managerForecast = async (doc: Rec): Promise<Rec> =>
    stored('crm_forecast', (await verify.hooks.run('crm_forecast', 'insert', doc, as(manager))).id);

  it('derives month end and label', async () => {
    const f = await managerForecast({ period: 'month', period_start: '2026-02-01' });
    expect(f.period_end).toBe('2026-02-28');
    expect(f.period_label).toBe('Feb 2026');
  });

  it('handles a leap February', async () => {
    expect((await managerForecast({ period: 'month', period_start: '2028-02-01' })).period_end).toBe('2028-02-29');
  });

  it('derives quarter end and label', async () => {
    const f = await managerForecast({ period: 'quarter', period_start: '2026-04-01' });
    expect(f.period_end).toBe('2026-06-30');
    expect(f.period_label).toBe('Q2 2026');
  });

  it('defaults period to month and stamps snapshot_date', async () => {
    const f = await managerForecast({ period_start: '2026-03-01' });
    expect(f.period).toBe('month');
    expect(f.period_end).toBe('2026-03-31');
    expect(f.snapshot_date).toBe(today());
  });

  it('never overwrites values the caller supplied', async () => {
    // A hand-typed END that is not the calendar end is the schema's to refuse
    // (`period_end_matches_calendar_period`, pinned in
    // `forecast-period-end-boundary.test.ts`); the label and snapshot date are
    // the caller's to choose, and the hook leaves them as typed.
    const f = await managerForecast({
      period: 'month', period_start: '2026-02-01',
      period_end: '2026-02-28', period_label: 'Custom', snapshot_date: '2020-01-01',
    });
    expect(f.period_end).toBe('2026-02-28');
    expect(f.period_label).toBe('Custom');
    expect(f.snapshot_date).toBe('2020-01-01');
  });

  it('an unparseable period_start never reaches the hook — the engine refuses it', async () => {
    // The hook's own guard ("ignore an unparseable start instead of writing
    // Invalid Date") has no stored row to show: the field is a date, so the
    // engine refuses the value, and with nothing derived the required end is
    // missing too.
    await expect(managerForecast({ period: 'month', period_start: 'not-a-date' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fields: expect.arrayContaining([expect.objectContaining({ field: 'period_start' })]),
    });
  });

  /**
   * The two halves of the DERIVATION contract (#748): only a write that
   * carries no `period_start` gets a computed boundary; a supplied one is kept
   * verbatim by the hook — and since #1008 / PR #1081 a mid-period one is then
   * REFUSED by `period_start_first_of_period` /
   * `quarter_starts_on_quarter_boundary`, so it never reaches the surfaces that
   * pin `period_start` to the quarter's first day. Read the second case as
   * "the hook does not silently correct you — the schema refuses you".
   */
  it('snaps to the calendar boundary only when the caller sends no period_start (#748)', async () => {
    const f = await managerForecast({ period: 'quarter', snapshot_date: '2026-08-02' });
    expect(f.period_start).toBe('2026-07-01');
    expect(f.period_end).toBe('2026-09-30');
    expect(f.period_label).toBe('Q3 2026');
  });

  it('does not snap a hand-supplied mid-period start — the schema refuses it instead (#748)', async () => {
    await expect(managerForecast({ period: 'quarter', period_start: '2026-07-15' })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
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
  const ORIGINAL_PUBLISH = '2024-03-01T00:00:00.000Z';
  /** An article in `doc`'s stored state, written as the system. */
  const articleOf = async (doc: Rec): Promise<Rec> =>
    (await verify.seed('crm_knowledge_article', [{
      title: `How to reset ${++k}`, body: 'Open Settings › Security.', summary: 'Password reset.', audience: 'public',
      owner_id: agent.id, ...doc,
    }]))[0]!;
  /** The agent's edit of an article, read back. */
  const agentEdits = async (id: string, doc: Rec): Promise<Rec> => {
    await verify.hooks.run('crm_knowledge_article', 'update', { id, ...doc }, as(agent));
    return stored('crm_knowledge_article', id);
  };

  it('stamps both timestamps on the draft → published first publish', async () => {
    const a = await agentEdits((await articleOf({ status: 'draft' })).id, { status: 'published' });
    expect(a.published_at).toBeTruthy();
    expect(a.last_reviewed_at).toBe(a.published_at);
  });

  it('stamps both timestamps on the in_review → published first publish', async () => {
    // The reviewed route to the same first publish — no `published_at` exists
    // yet on either, so both must stamp one.
    const a = await agentEdits((await articleOf({ status: 'in_review' })).id, { status: 'published' });
    expect(a.published_at).toBeTruthy();
    expect(a.last_reviewed_at).toBe(a.published_at);
  });

  it('refreshes only last_reviewed_at when editing an already-published article', async () => {
    const before = Date.now();
    const a = await agentEdits(
      (await articleOf({ status: 'published', published_at: ORIGINAL_PUBLISH, last_reviewed_at: ORIGINAL_PUBLISH })).id,
      { title: `Revised ${++k}` },
    );
    expect(new Date(a.published_at).toISOString(), 'republishing must not move the original publish date').toBe(ORIGINAL_PUBLISH);
    expect(new Date(a.last_reviewed_at).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('keeps the original published_at when an ARCHIVED article is re-published', async () => {
    // The arrow the old status test could not see (#780): `previous.status` is
    // 'archived', so it read as a first publish and re-stamped a date the
    // article had held since 2024.
    const before = Date.now();
    const a = await agentEdits(
      (await articleOf({ status: 'archived', published_at: ORIGINAL_PUBLISH, last_reviewed_at: ORIGINAL_PUBLISH })).id,
      { status: 'published' },
    );
    expect(new Date(a.published_at).toISOString(), 'republishing must not move the original publish date').toBe(ORIGINAL_PUBLISH);
    expect(new Date(a.last_reviewed_at).getTime(), 're-shelving an article is itself a review').toBeGreaterThanOrEqual(before - 1000);
  });

  it('stamps published_at when an article archived before it ever shipped is published', async () => {
    // Existence of the date, not the previous status, is the criterion: a draft
    // archived without ever being published has no original date to keep, so
    // this IS its first publish.
    const a = await agentEdits((await articleOf({ status: 'archived' })).id, { status: 'published' });
    expect(a.published_at).toBeTruthy();
    expect(a.last_reviewed_at).toBe(a.published_at);
  });

  it('honours a published_at carried by the write itself', async () => {
    // An import or migration publishing records with their historical dates —
    // the shape the `src/service/data/service.seed.ts` records use — reaches
    // this handler with `published_at` on the insert. Stamping over it rewrites
    // imported history exactly as the archived case rewrites a re-shelved
    // article's.
    const a = await stored('crm_knowledge_article', (await articleOf({ status: 'published', published_at: ORIGINAL_PUBLISH })).id);
    expect(new Date(a.published_at).toISOString(), 'an explicitly supplied publish date is history, not a default')
      .toBe(ORIGINAL_PUBLISH);
    expect(a.last_reviewed_at).toBeTruthy();
  });

  it('stamps nothing for a draft', async () => {
    const written = await verify.hooks.run('crm_knowledge_article', 'insert', {
      title: `Draft ${++k}`, body: 'Work in progress.', status: 'draft', audience: 'internal',
    }, as(agent));
    const a = await stored('crm_knowledge_article', written.id);
    expect(a.published_at ?? null).toBeNull();
    expect(a.last_reviewed_at ?? null).toBeNull();
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
 * ✅ THE BLOCKER HAS LIFTED — on the 17.2.0 -> 17.3.0 upgrade, and this block
 * is now the pin that says so rather than the pin that says it cannot be done.
 * Platform 17.3.0 (objectstack#11552) marshals the per-row signal across the
 * QuickJS boundary: a shipped body observes `ctx.dispatch`, a frozen
 * `{ mode: 'record' | 'per-row', index }` copy of the engine's #6966 marker, and
 * `ctx.input.options`, a frozen non-enumerable `{ multi?, where? }` projection —
 * the two members ADR-0058 Addendum II D2 declares visible to `before*`. A guard
 * written `ctx.dispatch?.mode === 'per-row'` used to evaluate `false` on every
 * production dispatch; it now answers truthfully.
 *
 * Two things deliberately did NOT change and are still pinned below, because
 * D3's route 2 has to be written against what actually crosses: `ctx.input.id`
 * stays absent (read `ctx.previous.id`), and `scope` does not cross with
 * `dispatch` (a JSON copy cannot keep its shared-identity contract).
 *
 * ⛔ This upgrade does NOT implement the D3-conformant fix. The batch-widening
 * defect in `knowledge_article.hook.ts` is a behaviour change on shipped
 * automation and belongs to #1265 on its own terms, not to a dependency bump —
 * mixing them would put a product decision inside a version PR. What this block
 * now does is hold the capability open and say, in an assertion, that the reason
 * #1265 was parked has gone.
 */
describe('#1265 — the shipped hook body CAN now tell it is on a per-row predicate dispatch', () => {
  /**
   * The keys `buildSandboxContext` (@objectstack/runtime) marshals across the
   * QuickJS boundary. From 17.3.0 that includes `dispatch` and an `options`
   * projection on `input`; `input` otherwise still arrives as
   * `unwrapProxyToPlain(ctx.input)` = `Object.fromEntries(Object.entries(…))`,
   * which copies only ENUMERABLE own keys — and the engine's flattening proxy
   * marks `id`, `options` and `data` non-enumerable, which is why `id` is still
   * not there.
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
    'sees the dispatch mode and input.options — D3’s routes are reachable; input.id still is not',
    async () => {
      const { QuickJSScriptRunner, hookBodyRunnerFactory } = await import('@objectstack/runtime');
      const { hotcrmStack } = await import('./helpers/verify-stack');

      // The platform's own runner, over the booted app's real engine (the probe
      // body declares no capability and never reaches it).
      const verify = await hotcrmStack();
      const bind = hookBodyRunnerFactory(new QuickJSScriptRunner(), {
        ql: verify.kernel.getService('objectql'),
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

      // These two crossed the boundary from 17.3.0 — the signal D3's routes 1
      // and 2 need in order to be expressible from a body-only hook at all.
      expect(probe.dispatch, 'ctx.dispatch stopped naming the per-row path').toBe('object');
      expect(
        probe.inputOptions,
        'ctx.input.options stopped carrying the `multi`/`where` projection',
      ).toBe('object');

      // And this one still does not: read the row id from `ctx.previous.id`.
      expect(probe.inputId, 'ctx.input.id started crossing — D3 route 2 should be rewritten').toBe(
        'undefined',
      );
    },
    20_000,
  );
});

// ─────────────────────────────────────────────────────────────── lead ──

/** The rep capturing a lead (names, company and an address are required on every lead). */
const repLead = async (doc: Rec): Promise<Rec> => {
  const n = ++k;
  const written = await verify.hooks.run('crm_lead', 'insert', {
    first_name: 'Lee', last_name: `Captured ${n}`, company: `Captured Co ${n}`, email: `captured${n}@hooks-runtime-service.test`, ...doc,
  }, as(rep));
  return stored('crm_lead', written.id);
};

describe('lead_automation', () => {
  it('scores a senior contact at a high-value corporate domain highly', async () => {
    const lead = await repLead({
      email: `cto${++k}@acme.io`, phone: '+1 555 0100', title: 'CTO',
      industry: 'technology', number_of_employees: 500, annual_revenue: 50_000_000,
    });
    expect(lead.rating).toBe(5); // 1 + .5 + 1.5 + 1 + .5 + .5 = 5
  });

  it('scores a bare free-mail lead at the floor', async () => {
    expect((await repLead({ email: `someone${++k}@gmail.com` })).rating).toBe(1);
  });

  it('always produces a WHOLE star between 1 and 5', async () => {
    // `rating` is a 1-5 star field; half values rendered inconsistently.
    for (const doc of [
      { email: `a${++k}@acme.io` },
      { email: `a${++k}@acme.io`, phone: '555' },
      { title: 'Director' },
      { email: `a${++k}@acme.io`, title: 'VP', industry: 'finance' },
    ] as Rec[]) {
      const { rating } = await repLead(doc);
      expect(Number.isInteger(rating), `rating ${rating} is not whole`).toBe(true);
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(5);
    }
  });

  it('respects an explicitly supplied rating', async () => {
    expect((await repLead({ email: `a${++k}@gmail.com`, rating: 4 })).rating).toBe(4);
  });

  it('stamps web defaults and strips conversion/ownership fields on an anonymous submission', async () => {
    const account = await accountOf();
    const written = await guestInsert(verify, 'crm_lead', {
      first_name: 'Web', last_name: `Visitor ${++k}`, email: `visitor${k}@hooks-runtime-service.test`,
      company: 'FromWebForm', is_converted: true, converted_account: account.id, converted_date: '2020-01-01',
      owner_id: rep.id,
    });
    const lead = await stored('crm_lead', written.id);
    expect(lead.lead_source).toBe('web');
    expect(lead.status).toBe('new');
    // Overwritten with a safe value rather than removed (#1133) — see the
    // matching note on `case_sla_defaults` above.
    expect(lead.is_converted, 'public form kept is_converted').toBe(false);
    for (const stripped of ['converted_account', 'converted_contact', 'converted_opportunity', 'converted_date', 'owner_id']) {
      expect(lead[stripped] ?? null, `public form kept ${stripped}`).toBeNull();
    }
  });

  it('locks identity fields on a converted lead but leaves notes editable', async () => {
    const [lead] = await verify.seed('crm_lead', [{
      first_name: 'Ada', last_name: 'Lovelace', company: 'Acme', email: `locked${++k}@hooks-runtime-service.test`,
      is_converted: true, status: 'converted', converted_date: '2026-01-01', owner_id: rep.id,
    }]);
    // The refusal NAMES the lead (#693) — a converted-lead lock also fires on
    // writes the caller never made, so "a converted lead" left the reader with
    // no way to tell which record refused.
    await expect(verify.hooks.run('crm_lead', 'update', { id: lead!.id, company: 'Other' }, as(rep)))
      .rejects.toThrow(/Cannot edit converted lead Ada Lovelace - Acme \(attempted: company\)\./);
    await verify.hooks.run('crm_lead', 'update', { id: lead!.id, description: 'note' }, as(rep));
    expect((await stored('crm_lead', lead!.id)).description).toBe('note');
  });

  it('lets a SYSTEM write through the converted-lead lock', async () => {
    const [lead] = await verify.seed('crm_lead', [{
      first_name: 'Ada', last_name: 'Lovelace', company: 'Acme', email: `sys${++k}@hooks-runtime-service.test`,
      is_converted: true, status: 'converted', converted_date: '2026-01-01', owner_id: rep.id,
    }]);
    await systemUpdate(verify, 'crm_lead', { id: lead!.id, company: 'Other' });
    expect((await stored('crm_lead', lead!.id)).company).toBe('Other');
  });

  it('schedules a follow-up task when a lead becomes qualified', async () => {
    const lead = await leadOf({ status: 'new' });
    await verify.hooks.run('crm_lead', 'update', { id: lead.id, status: 'qualified' }, as(rep));
    const task = await vi.waitFor(async () => {
      const [t] = await verify.rows('crm_task', { related_to_lead: lead.id });
      expect(t, 'no follow-up task created').toBeTruthy();
      return t!;
    }, { timeout: 10_000, interval: 50 });
    expect(task.priority).toBe('high');
    expect(task.owner_id).toBe(rep.id);
    expect(task.due_date).toBe(daysFromNow(2));
  });

  it('does not re-schedule for a lead that was already qualified', async () => {
    const lead = await leadOf({ status: 'qualified' });
    const engine = await engineWritesDuring(() =>
      verify.hooks.run('crm_lead', 'update', { id: lead.id, status: 'qualified', description: 'Re-saved.' }, as(rep)));
    expect(engine.of('crm_task', 'insert')).toHaveLength(0);
  });
});

describe('lead_duplicate_check', () => {
  /** An address no fixture has used yet. */
  const fresh = () => `dup${++k}.ada@acme.io`;

  it('normalizes the email it stores, which is what makes the lookup an equality match', async () => {
    // There is no case-insensitive predicate to lean on: ObjectQL's `$regex`
    // compiles to a LIKE SUBSTRING on SQL. The canonical form is established
    // here, at the producer, exactly as contact_integrity does on crm_contact.
    const address = fresh();
    expect((await repLead({ email: `  ${address.toUpperCase()} ` })).email).toBe(address);
  });

  it('normalizes on update too — a later edit must not hide the record from dedupe', async () => {
    const lead = await leadOf();
    const address = fresh();
    await verify.hooks.run('crm_lead', 'update', { id: lead.id, email: address.toUpperCase() }, as(rep));
    expect((await stored('crm_lead', lead.id)).email).toBe(address);
  });

  it('leaves a partial update that does not touch email alone', async () => {
    const lead = await leadOf();
    await verify.hooks.run('crm_lead', 'update', { id: lead.id, phone: '555' }, as(rep));
    expect((await stored('crm_lead', lead.id)).email).toBe(lead.email);
  });

  it('flags a re-captured address as a SUSPECTED duplicate of the open lead it repeats', async () => {
    // The acceptance case: the same address, captured twice. Under the old
    // `unique: true` the second insert was rejected by the database.
    const address = fresh();
    const first = await leadOf({ email: address });
    const lead = await repLead({ email: address.replace('ada', 'Ada') });
    expect(lead.duplicate_of_type).toBe('crm_lead');
    expect(lead.duplicate_of_lead).toBe(first.id);
    expect(lead.duplicate_status).toBe('suspected');
    expect(lead.duplicate_of_contact ?? null).toBeNull();
  });

  it('prefers an existing contact over an open lead — the contact is the further-along record', async () => {
    const address = fresh();
    const account = await accountOf();
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Ada', last_name: 'Contact', email: address, crm_account: account.id, owner_id: rep.id,
    }]);
    await leadOf({ email: address });
    const lead = await repLead({ email: address });
    expect(lead.duplicate_of_type).toBe('crm_contact');
    expect(lead.duplicate_of_contact).toBe(contact!.id);
    expect(lead.duplicate_of_lead ?? null).toBeNull();
  });

  it('points a whole cluster at the ORIGINAL, not at whichever row the driver returns first', async () => {
    // Otherwise the third submission points at the second, the fourth at the
    // third, and reviewing the cluster means walking a chain.
    const address = fresh();
    const [third, origin, second] = await verify.seed('crm_lead', [
      { first_name: 'Ada', last_name: 'Third', company: 'Acme', email: address, owner_id: rep.id, created_at: '2026-05-01T00:00:00.000Z' },
      { first_name: 'Ada', last_name: 'Origin', company: 'Acme', email: address, owner_id: rep.id, created_at: '2026-01-01T00:00:00.000Z' },
      { first_name: 'Ada', last_name: 'Second', company: 'Acme', email: address, owner_id: rep.id, created_at: '2026-03-01T00:00:00.000Z' },
    ]);
    expect([third, second].every(Boolean)).toBe(true);
    expect((await repLead({ email: address })).duplicate_of_lead).toBe(origin!.id);
  });

  it('ignores a converted predecessor — its contact carries the same address', async () => {
    const address = fresh();
    await leadOf({ email: address, is_converted: true, status: 'converted', converted_date: '2026-01-01' });
    const lead = await repLead({ email: address });
    expect(lead.duplicate_status ?? null).toBeNull();
    expect(lead.duplicate_of_type ?? null).toBeNull();
  });

  it('leaves a first-time address untouched', async () => {
    await leadOf({ email: fresh() });
    const lead = await repLead({ email: fresh() });
    expect(lead.duplicate_status ?? null).toBeNull();
    expect(lead.duplicate_of_type ?? null).toBeNull();
    expect(lead.duplicate_of_lead ?? null).toBeNull();
  });

  it('never overwrites a CONFIRMED verdict with its own guess', async () => {
    // The whole reason suspicion and verdict share one field: a human who
    // confirmed a match must not have it downgraded by a later automatic write.
    const address = fresh();
    const account = await accountOf();
    const [human] = await verify.seed('crm_contact', [{
      first_name: 'Ada', last_name: 'Chosen', email: fresh(), crm_account: account.id, owner_id: rep.id,
    }]);
    await leadOf({ email: address });
    const lead = await repLead({
      email: address, duplicate_of_type: 'crm_contact', duplicate_of_contact: human!.id, duplicate_status: 'confirmed',
    });
    expect(lead.duplicate_status).toBe('confirmed');
    expect(lead.duplicate_of_type).toBe('crm_contact');
    expect(lead.duplicate_of_contact).toBe(human!.id);
    expect(lead.duplicate_of_lead ?? null).toBeNull();
  });

  it('stands down on a record that already names a survivor', async () => {
    const address = fresh();
    const chosen = await leadOf({ email: fresh() });
    await leadOf({ email: address });
    const lead = await repLead({ email: address, duplicate_of_type: 'crm_lead', duplicate_of_lead: chosen.id });
    expect(lead.duplicate_of_lead).toBe(chosen.id);
    expect(lead.duplicate_status ?? null).toBeNull();
  });

  it('writes nothing and throws nothing when the lookup is denied (anonymous Web-to-Lead)', async () => {
    // A guest can INSERT on crm_lead and read NOTHING. Propagating that denial
    // would reject the very submission this feature exists to accept — the
    // duplicate lands unflagged rather than not landing at all.
    const address = fresh();
    await leadOf({ email: address });
    const written = await guestInsert(verify, 'crm_lead', {
      first_name: 'Ada', last_name: 'Guest', company: 'Acme', email: address,
    });
    const lead = await stored('crm_lead', written.id);
    expect(lead.email).toBe(address);
    expect(lead.duplicate_status ?? null).toBeNull();
  });

  it('runs after lead_automation, so a guest cannot spoof a verdict past the strip', async () => {
    // Ascending priority order. At a lower number this hook would see the
    // client-supplied `duplicate_status: 'confirmed'` that lead_automation's
    // guest branch is there to null, and stand down. Nulled rather than removed
    // (#1133): `lead_duplicate_check` stands down on a NON-BLANK verdict and its
    // own `isBlank` counts `null` as blank. (The check itself then cannot read
    // anything under the anonymous grant — the case above.)
    const check = (leadHooks as Rec[]).find((h) => h.name === 'lead_duplicate_check')!;
    const automation = (leadHooks as Rec[]).find((h) => h.name === 'lead_automation')!;
    expect(check.priority).toBeGreaterThan(automation.priority);

    const address = fresh();
    const guessed = await leadOf({ email: fresh() });
    const written = await guestInsert(verify, 'crm_lead', {
      first_name: 'Ada', last_name: 'Spoof', company: 'Acme', email: address,
      duplicate_status: 'confirmed', duplicate_of_type: 'crm_lead', duplicate_of_lead: guessed.id,
    });
    const lead = await stored('crm_lead', written.id);
    for (const stripped of ['duplicate_of_type', 'duplicate_of_lead', 'duplicate_of_contact', 'duplicate_status']) {
      expect(lead[stripped] ?? null, `public form kept ${stripped}`).toBeNull();
    }
  });
});

describe('lead_auto_assign — permission resilience', () => {
  it('never throws when the rep-pool lookup is denied (anonymous Web-to-Lead)', async () => {
    // The public-form grant denies `find` on sys_user_position. The hook must
    // swallow that and leave the lead ownerless — NOT reject the insert.
    const written = await guestInsert(verify, 'crm_lead', {
      first_name: 'Web', last_name: `Form ${++k}`, company: 'FromWebForm', email: `form${k}@hooks-runtime-service.test`,
    });
    expect((await stored('crm_lead', written.id)).owner_id ?? null).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────── task ──

/** The rep writing a task of their own. */
const repTask = async (doc: Rec): Promise<Rec> =>
  stored('crm_task', (await verify.hooks.run('crm_task', 'insert', { subject: `Task ${++k}`, ...doc }, as(rep))).id);

/** A task of the rep's in `doc`'s stored state, written as the system. */
const taskOf = async (doc: Rec): Promise<Rec> =>
  (await verify.seed('crm_task', [{ subject: `Task ${++k}`, owner_id: rep.id, ...doc }]))[0]!;

describe('task_completion', () => {
  it('lands reminder_sent as a real boolean on insert, never NULL', async () => {
    expect((await repTask({})).reminder_sent).toBe(false);
  });

  it('materialises priority_rank (urgent outranks high)', async () => {
    for (const [priority, rank] of [['low', 1], ['normal', 2], ['high', 3], ['urgent', 4]] as const) {
      expect((await repTask({ priority })).priority_rank).toBe(rank);
    }
  });

  it('stamps completed_date and 100% progress on the completing transition', async () => {
    const task = await taskOf({ status: 'in_progress' });
    await verify.hooks.run('crm_task', 'update', { id: task.id, status: 'completed' }, as(rep));
    const done = await stored('crm_task', task.id);
    expect(done.completed_date).toBeTruthy();
    expect(done.progress_percent).toBe(100);
    expect(done.is_completed).toBe(true);
  });

  it('flags an overdue open task and clears the flag once completed', async () => {
    const task = await taskOf({ due_date: daysFromNow(-3), status: 'not_started' });
    await verify.hooks.run('crm_task', 'update', { id: task.id, status: 'in_progress' }, as(rep));
    expect((await stored('crm_task', task.id)).is_overdue).toBe(true);
    await verify.hooks.run('crm_task', 'update', { id: task.id, status: 'completed' }, as(rep));
    expect((await stored('crm_task', task.id)).is_overdue).toBe(false);
  });

  it('rejects a reminder scheduled after the due date', async () => {
    await expect(repTask({ due_date: '2026-01-01', reminder_date: '2026-02-01T09:00:00.000Z' })).rejects.toThrow(/is after the due date/);
  });

  it('accepts a reminder on the due date itself', async () => {
    const task = await repTask({ due_date: '2026-01-01', reminder_date: '2026-01-01T09:00:00.000Z' });
    expect(new Date(task.reminder_date).toISOString()).toBe('2026-01-01T09:00:00.000Z');
  });
});

describe('task_recurrence', () => {
  /**
   * A recurring task of the rep's (written as the system with its series
   * fields), completed by the rep — and the next occurrence the hook spawned,
   * found by the series' unique subject.
   */
  const completeRecurring = async (doc: Rec): Promise<{ task: Rec; nextOf: () => Promise<Rec[]> }> => {
    const subject = `${String(doc.subject ?? 'Series')} ${++k}`;
    const task = await taskOf({ status: 'in_progress', ...doc, subject });
    await verify.hooks.run('crm_task', 'update', { id: task.id, status: 'completed' }, as(rep));
    return {
      task,
      nextOf: async () => (await verify.rows('crm_task', { subject })).filter((t) => t.id !== task.id),
    };
  };
  const nextOccurrence = async (doc: Rec): Promise<Rec> => {
    const { nextOf } = await completeRecurring(doc);
    return vi.waitFor(async () => {
      const [next] = await nextOf();
      expect(next, 'no next occurrence spawned').toBeTruthy();
      return next!;
    }, { timeout: 10_000, interval: 50 });
  };

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
    const next = await nextOccurrence({
      subject: 'Weekly sync', priority: 'normal', is_recurring: true,
      recurrence_type: type, recurrence_interval: interval, due_date: from,
    });
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
      due = String((await nextOccurrence({
        subject: 'Month end', is_recurring: true, recurrence_type: 'monthly', recurrence_interval: 1, due_date: due,
      })).due_date);
      dueDates.push(due);
    }
    expect(dueDates).toEqual(['2026-02-28', '2026-03-28', '2026-04-28']);
  });

  it('spawns the next occurrence as not_started so it cannot re-trigger itself', async () => {
    const next = await nextOccurrence({
      subject: 'Weekly sync', is_recurring: true, recurrence_type: 'weekly', recurrence_interval: 1, due_date: daysFromNow(0),
    });
    expect(next.status).toBe('not_started');
    expect(next.is_completed).toBe(false);
    expect(next.reminder_sent).toBe(false);
    expect(String(next.subject)).toMatch(/^Weekly sync \d+$/);
    expect(next.owner_id).toBe(rep.id);
    expect(next.is_recurring).toBe(true);
  });

  it('advances the reminder alongside the due date', async () => {
    const next = await nextOccurrence({
      subject: 'Sync', is_recurring: true, recurrence_type: 'daily', recurrence_interval: 1,
      due_date: '2026-01-01', reminder_date: '2026-01-01T09:00:00.000Z',
    });
    expect(new Date(next.reminder_date).toISOString()).toContain('2026-01-02');
  });

  it('stops the series once the next occurrence would pass recurrence_end_date', async () => {
    const { nextOf } = await completeRecurring({
      subject: 'Sync', is_recurring: true, recurrence_type: 'weekly', recurrence_interval: 1,
      due_date: '2026-01-01', recurrence_end_date: '2026-01-05',
    });
    await new Promise((r) => setTimeout(r, 600));
    expect(await nextOf()).toHaveLength(0);
  });

  it('ignores non-recurring tasks; an unknown recurrence type cannot be stored', async () => {
    const { nextOf } = await completeRecurring({ subject: 'One-off', due_date: '2026-01-01' });
    await new Promise((r) => setTimeout(r, 600));
    expect(await nextOf()).toHaveLength(0);
    // `recurrence_type` is a select: the engine refuses `fortnightly` on every
    // writer, so the hook never meets one.
    await expect(taskOf({ subject: 'Odd', is_recurring: true, recurrence_type: 'fortnightly', due_date: '2026-01-01' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('does not spawn on an edit to an already-completed task', async () => {
    const subject = `Done series ${++k}`;
    const task = await taskOf({
      subject, status: 'completed', is_recurring: true, recurrence_type: 'daily', recurrence_interval: 1, due_date: '2026-01-01',
    });
    await verify.hooks.run('crm_task', 'update', { id: task.id, description: 'tweak' }, as(rep));
    await new Promise((r) => setTimeout(r, 600));
    expect((await verify.rows('crm_task', { subject })).filter((t) => t.id !== task.id)).toHaveLength(0);
  });
});

describe('task_activity_bubble', () => {
  /** A task of the rep's linked by `links`, completed by the rep. */
  const complete = async (links: Rec) => {
    const task = await taskOf({ status: 'in_progress', ...links });
    await verify.hooks.run('crm_task', 'update', { id: task.id, status: 'completed' }, as(rep));
    return task;
  };
  /** The rep's account with a contact, a deal and a case under it, and a lead — written as the system. */
  const parents = async () => {
    const account = await accountOf();
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Cy', last_name: `Bubble ${++k}`, email: `bubble${k}@hooks-runtime-service.test`, crm_account: account.id, owner_id: rep.id,
    }]);
    const [opportunity] = await verify.seed('crm_opportunity', [{
      name: `Bubble Deal ${k}`, amount: 1000, stage: 'proposal', close_date: '2030-01-01', crm_account: account.id, owner_id: rep.id,
    }]);
    const [kase] = await verify.seed('crm_case', [{
      subject: `Bubble case ${k}`, description: 'x', crm_account: account.id, owner_id: rep.id,
    }]);
    const lead = await leadOf();
    return { account, contact: contact!, opportunity: opportunity!, kase: kase!, lead };
  };
  const stamped = (object: string, id: string, field: string) =>
    settles(object, id, (row) => expect(row[field], `${object}.${field} was never stamped`).toBeTruthy());
  const bubbleWrites = (engine: Awaited<ReturnType<typeof engineWritesDuring>>) =>
    engine.writes.filter((w) => w.op === 'update'
      && ['last_activity_date', 'last_contacted_date'].some((f) => f in (w.args[1] as Rec)));

  it('bubbles last_activity_date to a related account', async () => {
    const { account } = await parents();
    await complete({ related_to_account: account.id });
    expect((await stamped('crm_account', account.id, 'last_activity_date')).last_activity_date).toBe(today());
  });

  it('uses last_contacted_date for a lead, which has no last_activity_date', async () => {
    const { lead } = await parents();
    await complete({ related_to_lead: lead.id });
    const row = await stamped('crm_lead', lead.id, 'last_contacted_date');
    expect('last_activity_date' in row, 'crm_lead has no last_activity_date column').toBe(false);
    expect(typeof row.last_contacted_date).toBe('string');
  });

  it('does not bubble while the task is still open — a promise is not contact', async () => {
    const { account } = await parents();
    const task = await taskOf({ status: 'not_started', related_to_account: account.id });
    const engine = await engineWritesDuring(() =>
      verify.hooks.run('crm_task', 'update', { id: task.id, status: 'in_progress' }, as(rep)));
    expect(bubbleWrites(engine)).toHaveLength(0);
  });

  it('does not bubble twice for a task that was already completed', async () => {
    const { account } = await parents();
    const task = await taskOf({ status: 'completed', related_to_account: account.id });
    const engine = await engineWritesDuring(() =>
      verify.hooks.run('crm_task', 'update', { id: task.id, subject: `edited ${++k}` }, as(rep)));
    expect(bubbleWrites(engine)).toHaveLength(0);
  });

  it('walks UP to the account from a contact, an opportunity and a case (#592)', async () => {
    // The defect this closes: a rep completes their work on the OPPORTUNITY,
    // never on the account row, so bubbling to the named record alone left
    // `crm_account.last_activity_date` untouched through a whole sales cycle
    // and `at_risk_accounts` listed the busiest customers in the book.
    for (const field of ['related_to_contact', 'related_to_opportunity', 'related_to_case'] as const) {
      const p = await parents();
      const target = { related_to_contact: p.contact, related_to_opportunity: p.opportunity, related_to_case: p.kase }[field];
      await complete({ [field]: target.id });
      expect((await stamped('crm_account', p.account.id, 'last_activity_date')).last_activity_date, `${field} did not reach its account`)
        .toBe(today());
    }
  });

  it('stamps the contact itself as well as its account', async () => {
    const { account, contact } = await parents();
    await complete({ related_to_contact: contact.id });
    expect(typeof (await stamped('crm_contact', contact.id, 'last_contacted_date')).last_contacted_date).toBe('string');
    expect((await stamped('crm_account', account.id, 'last_activity_date')).last_activity_date).toBe(today());
  });

  it('no longer needs related_to_type to be set', async () => {
    // It is a display hint a rep can leave blank, and while the bubble keyed
    // off it a task with a perfectly good related_to_account bubbled nowhere.
    const { account } = await parents();
    await complete({ related_to_account: account.id, related_to_type: null });
    expect((await stamped('crm_account', account.id, 'last_activity_date')).last_activity_date).toBe(today());
  });

  it('is a no-op with no parent, and never propagates a write failure', async () => {
    const task = await taskOf({ status: 'in_progress' });
    const engine = await engineWritesDuring(() =>
      verify.hooks.run('crm_task', 'update', { id: task.id, status: 'completed' }, as(rep)));
    expect(bubbleWrites(engine)).toHaveLength(0);

    // A bubble the completer may not write must be swallowed — it is
    // best-effort and must never break the task write: a rep completing a
    // task on an account they cannot touch.
    const outsider = await signUpPerson(verify, `outsider${++k}@hooks-runtime-service.test`, { name: 'Other Rep', permissionSets: ['sales_rep'] });
    const { account } = await parents();
    const [theirs] = await verify.seed('crm_task', [{ subject: `Theirs ${k}`, status: 'in_progress', owner_id: outsider.id, related_to_account: account.id }]);
    await verify.hooks.run('crm_task', 'update', { id: theirs!.id, status: 'completed' }, as(outsider));
    expect((await stored('crm_task', theirs!.id)).status).toBe('completed');
  });
});
