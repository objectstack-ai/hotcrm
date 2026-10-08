// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { OpportunityStagnationFlow } from '../src/sales/flows/opportunity-stagnation.flow';
import { edgesUnder } from './helpers/flow-regions';
import { hotcrmStack, signUpPerson, daysFromNow, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Adoption pin for the platform's per-run summary (objectstack#4354).
 *
 * The gap this app recorded was that a sweep which selects records and acts on
 * none is indistinguishable from a sweep with nothing to do: both report
 * `success: true`, both write nothing, both stay green forever. That is how
 * `opportunity_stagnation`, `contract_renewal` and `campaign_enrollment` all
 * ran while doing nothing at all, and nothing in production noticed.
 *
 * The platform now answers it: every terminal run carries a `summary` of what
 * the run actually DID — `selected` / `acted` / `skipped`, plus a per-node fold
 * and the gates that closed. `sys_automation_run` persists the same numbers as
 * real columns, so an operator can filter and alert on them.
 *
 * These tests exist because the adoption is otherwise invisible. Nothing in
 * this app calls the summary, so if a platform bump stopped populating it, the
 * app would go back to having no production signal — silently, which is the
 * exact failure mode the whole thread is about. The runtime tests were what
 * caught the original defect; this is the same defence pointed at the fix.
 *
 * ⛔ Note what is deliberately NOT here: an app-side counter built from
 * `assignment` + `decision` + `notify`. That route was rejected — a
 * silent-no-op detector assembled from the primitives that just proved able to
 * fail silently has the failure mode it is meant to catch — and the rejection
 * is permanent now that the platform ships the measurement for every flow.
 */

/**
 * On the shipped app booted by `@objectstack/verify`, each sweep is started
 * through the trigger door (`flows.run`, as the admin) and its terminal result
 * — the summary — read off what the door returns.
 *
 * A sweep selects EVERY matching record in the database, and the boot replays
 * the app's seed deals and contracts. So the counts here are read as what THIS
 * file's records added: each case first runs the sweep once to SETTLE the
 * database (every pre-existing match is nudged or reminded, so a second pass
 * skips it), then adds its own records and reads the next run's counts against
 * the settled one.
 */
interface RunSummary {
  selected: number;
  acted: number;
  skipped: number;
  unmeasured?: number;
  nodes: Array<{ nodeId: string; nodeType: string; status: string; runs: number; failures: number; skipped: number; selected?: number; acted?: number }>;
  gates: Array<{ nodeId: string; targetNodeId: string; skipped: number; label?: string }>;
}

/** The run summary is on the TERMINAL result. */
const summaryOf = (result: unknown): RunSummary => {
  const s = (result as { summary?: RunSummary })?.summary;
  expect(s, 'the run reported no summary at all — the platform signal is gone').toBeDefined();
  return s!;
};

const nodeSelected = (s: RunSummary, nodeId: string) => s.nodes.find((n) => n.nodeId === nodeId)?.selected ?? 0;

let verify: VerifyStack;
let admin: string;
let rep: Person;
let accountId: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@flow-run-summary.test', {
    name: 'Summary Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Run Summary Co', owner_id: rep.id }]);
  accountId = String(account!.id);
}, 120_000);

/** Run a sweep as the admin and return its summary. */
const sweep = async (flowName: string): Promise<RunSummary> => summaryOf(await verify.flows.run(flowName, {}, { as: admin }));

/** Two stalled deals of the rep's — 30 and 40 days in stage. */
const stalledDeals = async (): Promise<Rec[]> => verify.seed('crm_opportunity', [
  { name: `Stalled One ${++k}`, stage: 'proposal', stage_entry_date: daysFromNow(-30), amount: 50_000, close_date: '2030-06-30', crm_account: accountId, owner_id: rep.id },
  { name: `Stalled Two ${k}`, stage: 'negotiation', stage_entry_date: daysFromNow(-40), amount: 60_000, close_date: '2030-06-30', crm_account: accountId, owner_id: rep.id },
]);

/** The open nudge task the stagnation sweep would have written for `deal`. */
const nudgeTaskFor = (deal: Rec) => ({
  subject: `Advance stalled deal: ${deal.name}`, type: 'follow_up', priority: 'high', status: 'not_started',
  owner_id: rep.id, related_to_type: 'crm_opportunity', related_to_opportunity: deal.id,
});

/** Every nudge task / inbox notification a stagnation sweep has written so far, database-wide. */
const nudgesSoFar = async () => ({
  tasks: (await verify.rows('crm_task', { related_to_type: 'crm_opportunity', type: 'follow_up', priority: 'high' }))
    .filter((t) => String(t.subject).startsWith('Advance stalled deal: ')).length,
  notifications: (await verify.rows('sys_notification_delivery', { topic: 'deal_stalled', channel: 'inbox' })).length,
});

describe('flow run summary — the three flows the silent-no-op incident covered', () => {
  it('opportunity_stagnation reports what it selected and what it wrote', async () => {
    const settled = await sweep('opportunity_stagnation');
    await stalledDeals();
    const before = await nudgesSoFar();
    const s = await sweep('opportunity_stagnation');
    const after = await nudgesSoFar();

    expect(s.selected, 'the sweep selected no stalled deals').toBeGreaterThan(0);
    expect(s.acted, 'the sweep selected deals but wrote nothing — the silent no-op').toBeGreaterThan(0);
    // The counters are the run's, not a node's, and they account for every
    // effect the run had: the follow-up tasks it WROTE are `acted`; the
    // notifications it handed to the messaging outbox are `unmeasured` — the
    // platform cannot confirm a delivery at run time, and says so rather than
    // counting it as done.
    expect(after.tasks - before.tasks, 'the two stalled deals got no follow-up task').toBe(2);
    expect(after.notifications - before.notifications, 'the two owners were not nudged').toBe(2);
    expect(s.acted).toBe(after.tasks - before.tasks);
    expect(s.unmeasured).toBe(after.notifications - before.notifications);
    expect(nodeSelected(s, 'query_stalled') - nodeSelected(settled, 'query_stalled'), 'the two stalled deals were not selected').toBe(2);
  });

  it('contract_renewal reports what it selected and what it wrote', async () => {
    const settled = await sweep('contract_renewal');
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Rene', last_name: `Wal ${++k}`, email: `renewal${k}@flow-run-summary.test`, crm_account: accountId, owner_id: rep.id,
    }]);
    const contract = (over: Rec): Rec => ({
      status: 'activated', crm_account: accountId, crm_contact: contact!.id, owner_id: rep.id,
      contract_type: 'subscription', contract_value: 90_000, auto_renewal: false, renewal_notice_days: 30,
      contract_term_months: 12, start_date: daysFromNow(-345), end_date: daysFromNow(+20),
      billing_frequency: 'monthly', payment_terms: 'net_30', ...over,
    });
    await verify.seed('crm_contract', [contract({}), contract({ end_date: daysFromNow(+10), start_date: daysFromNow(-355), auto_renewal: true })]);
    const s = await sweep('contract_renewal');

    expect(s.selected).toBeGreaterThan(0);
    expect(s.acted, 'the sweep selected contracts but wrote nothing').toBeGreaterThan(0);
    expect(nodeSelected(s, 'query_contracts') - nodeSelected(settled, 'query_contracts')).toBe(2);
    expect(s.nodes.find((n) => n.nodeId === 'create_renewal_task')?.acted).toBe(2);
  });

  it('campaign_enrollment reports on its TERMINAL leg, not its screen pause', async () => {
    // This one is a `screen` flow, not a scheduled sweep — it was a Monday-9-AM
    // schedule when the incident was recorded and was rewritten since. The run
    // therefore pauses at the screen, and a paused run has not finished doing
    // its work yet, so it carries no summary. The summary arrives on resume.
    const [campaign] = await verify.seed('crm_campaign', [{
      name: `Spring Push ${++k}`, status: 'in_progress', start_date: daysFromNow(-7), end_date: daysFromNow(30), owner_id: rep.id,
    }]);
    await verify.seed('crm_lead', [
      { first_name: 'Lee', last_name: `New ${k}`, company: `Acme ${k}`, email: `a${k}@flow-run-summary.test`, status: 'new', is_converted: false, email_opt_out: false, owner_id: rep.id },
      { first_name: 'Lee', last_name: `New Two ${k}`, company: `Acme Two ${k}`, email: `b${k}@flow-run-summary.test`, status: 'new', is_converted: false, email_opt_out: false, owner_id: rep.id },
    ]);

    const paused = await verify.flows.run('campaign_enrollment', { recordId: campaign!.id }, { as: admin });
    expect(paused.status, 'the screen flow did not pause at its screen').toBe('paused');
    expect((paused as Rec).summary, 'a paused run must not claim a summary — it has not finished').toBeUndefined();

    const s = summaryOf(await verify.flows.resume(paused, {
      memberSource: 'leads', leadStatus: 'new', contactDepartment: 'engineering',
    }, { as: admin }));
    const members = await verify.rows('crm_campaign_member', { crm_campaign: campaign!.id });
    expect(members.length, 'the enrolment wrote no members').toBeGreaterThanOrEqual(2);
    expect(s.acted, 'the summary does not count the members the enrolment wrote').toBe(members.length);
    // A fresh campaign: every eligible lead the query selected was enrolled.
    expect(nodeSelected(s, 'query_leads')).toBe(members.length);
  });
});

/**
 * The reading rule, pinned.
 *
 * The platform's headline detector is `selected > 0 AND acted = 0 AND
 * unmeasured = 0`. Applied to this app's sweeps it is NOT sufficient on its
 * own, and the reason is worth keeping executable rather than in prose: both
 * of these sweeps re-select the same records every morning and gate each one on
 * whether it was already handled, so their healthy steady state — "everything
 * has already been nudged" — satisfies that predicate exactly as a broken sweep
 * does. `content/docs/administration/automation.mdx` tells operators the
 * qualifier; this is the measurement behind it.
 *
 * What separates them is the per-node fold: whether the idempotency lookup
 * ACCOUNTS for the gate skips.
 */
describe('flow run summary — healthy idempotent skipping vs a dead gate', () => {
  /** The #4347 shape: the loop-body gate never opens, whatever the data says. */
  const withDeadGate = () => {
    const f = structuredClone(OpportunityStagnationFlow) as never as {
      nodes: Array<Record<string, any>>;
    };
    const loop = f.nodes.find((n) => n.id === 'loop_opps')!;
    // `b2` is one region deeper than it used to be: the loop body is now a
    // single `try_catch` guard (`src/flows/_guarded-iteration.ts`) and the
    // gate's out-edge lives in its `try` region. `edgesUnder` takes the same
    // descent the engine's own `runRegion` does. This fixture is EXECUTED
    // below, so it exercises the guarded shape rather than only inspecting it.
    const edge = edgesUnder(loop).find((e) => e.id === 'b2')!;
    expect(edge, 'edge b2 not found under loop_opps — the flow was restructured').toBeDefined();
    edge.condition = { dialect: 'cel', source: 'false' };
    return f;
  };

  /**
   * HEALTHY: on a settled database, plus two stalled deals that were already
   * nudged (their open tasks exist) — every skip has a reason. BROKEN: the
   * dead-gate variant, registered beside the shipped flow through the
   * authoring door (`POST /automation`) and removed after, over the same
   * database plus two stalled deals nothing has handled.
   */
  let healthy: RunSummary;
  let broken: RunSummary;
  beforeAll(async () => {
    await sweep('opportunity_stagnation');
    const handled = await stalledDeals();
    await verify.seed('crm_task', handled.map(nudgeTaskFor));
    healthy = await sweep('opportunity_stagnation');

    await stalledDeals();
    const name = 'opportunity_stagnation_dead_gate';
    const registered = await verify.apiAs(admin, 'POST', '/automation', { ...withDeadGate(), name });
    expect(registered.status, await registered.clone().text()).toBe(200);
    try {
      broken = await sweep(name);
    } finally {
      expect((await verify.apiAs(admin, 'DELETE', `/automation/${name}`)).status).toBe(200);
    }
  }, 120_000);

  it('both shapes trip the run-level predicate, so it cannot be alerted on alone', () => {
    const trips = (s: RunSummary) => s.selected > 0 && s.acted === 0 && (s.unmeasured ?? 0) === 0;
    expect(trips(healthy), 'a correctly idempotent run no longer trips the predicate — re-check the qualifier in the admin docs').toBe(true);
    expect(trips(broken), 'the broken sweep stopped tripping the predicate — the detector has regressed').toBe(true);
  });

  it('the per-node fold tells them apart: are the gate skips accounted for?', () => {
    const probe = (s: RunSummary) => nodeSelected(s, 'find_existing_task');
    const gateSkips = (s: RunSummary) => s.gates.reduce((n, g) => n + g.skipped, 0);

    // Healthy: the idempotency lookup found an open task for every deal it
    // skipped, so every skip has a reason.
    expect(gateSkips(healthy), 'the healthy sweep skipped nothing').toBeGreaterThanOrEqual(2);
    expect(probe(healthy), 'the skips are explained by work already done').toBe(gateSkips(healthy));

    // Broken: the same skips — and two more, on the two deals nothing had
    // handled, with nothing found to justify them.
    expect(gateSkips(broken) - gateSkips(healthy)).toBe(2);
    expect(
      gateSkips(broken) - probe(broken),
      'the gate closed on records nothing had handled — the dead-gate signature',
    ).toBe(2);
  });
});
