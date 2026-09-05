// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CampaignEnrollmentFlow } from '../src/flows/campaign-enrollment.flow';
import { ContractRenewalFlow } from '../src/flows/contract-renewal.flow';
import { OpportunityStagnationFlow } from '../src/flows/opportunity-stagnation.flow';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';
import { edgesUnder } from './helpers/flow-regions';

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

const day = (d: number): string => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};

interface RunSummary {
  selected: number;
  acted: number;
  skipped: number;
  unmeasured?: number;
  nodes: Array<{ nodeId: string; nodeType: string; status: string; runs: number; failures: number; skipped: number; selected?: number; acted?: number }>;
  gates: Array<{ nodeId: string; targetNodeId: string; skipped: number; label?: string }>;
}

/** The run summary is on the TERMINAL result, which the harness's `run()` drops. */
const summaryOf = (result: unknown): RunSummary => {
  const s = (result as { summary?: RunSummary })?.summary;
  expect(s, 'the run reported no summary at all — the platform signal is gone').toBeDefined();
  return s!;
};

const stalledDeals = (): Rec[] => [
  { id: 'o1', name: 'Stalled One', stage: 'proposal', stage_entry_date: day(-30), owner_id: 'rep1', organization_id: 'org1' },
  { id: 'o2', name: 'Stalled Two', stage: 'negotiation', stage_entry_date: day(-40), owner_id: 'rep2', organization_id: 'org1' },
];

const nudgeTasks = (): Rec[] => [
  { id: 't1', related_to_opportunity: 'o1', subject: 'Advance stalled deal: Stalled One', status: 'not_started' },
  { id: 't2', related_to_opportunity: 'o2', subject: 'Advance stalled deal: Stalled Two', status: 'not_started' },
];

describe('flow run summary — the three flows the silent-no-op incident covered', () => {
  it('opportunity_stagnation reports what it selected and what it wrote', async () => {
    const h = makeFlowHarness({ opportunity_stagnation: OpportunityStagnationFlow }, {
      crm_opportunity: stalledDeals(), crm_task: [],
    });
    const s = summaryOf(await h.engine.execute('opportunity_stagnation', { params: {}, userId: 'u', event: 'schedule' } as never));

    expect(s.selected, 'the sweep selected no stalled deals').toBeGreaterThan(0);
    expect(s.acted, 'the sweep selected deals but wrote nothing — the silent no-op').toBeGreaterThan(0);
    // The counters are the run's, not a node's: `acted` covers the notification
    // AND the follow-up task, so it outruns the two deals that were selected.
    expect(s.acted).toBe(h.store.crm_task.length + h.notifications.length);
    expect(s.nodes.find((n) => n.nodeId === 'query_stalled')?.selected).toBe(2);
  });

  it('contract_renewal reports what it selected and what it wrote', async () => {
    const contract = (over: Rec): Rec => ({
      id: 'k1', contract_number: 'CTR-1', status: 'activated', crm_account: 'acc1',
      owner_id: 'rep1', contract_value: 90_000, auto_renewal: false, renewal_notice_days: 30,
      end_date: day(+20), organization_id: 'org1', ...over,
    });
    const h = makeFlowHarness({ contract_renewal: ContractRenewalFlow }, {
      crm_contract: [contract({}), contract({ id: 'k2', contract_number: 'CTR-2', end_date: day(+10), auto_renewal: true })],
      crm_task: [], crm_opportunity: [],
    });
    const s = summaryOf(await h.engine.execute('contract_renewal', { params: {}, userId: 'u', event: 'schedule' } as never));

    expect(s.selected).toBeGreaterThan(0);
    expect(s.acted, 'the sweep selected contracts but wrote nothing').toBeGreaterThan(0);
    expect(s.nodes.find((n) => n.nodeId === 'query_contracts')?.selected).toBe(2);
    expect(s.nodes.find((n) => n.nodeId === 'create_renewal_task')?.acted).toBe(2);
  });

  it('campaign_enrollment reports on its TERMINAL leg, not its screen pause', async () => {
    // This one is a `screen` flow, not a scheduled sweep — it was a Monday-9-AM
    // schedule when the incident was recorded and was rewritten since. The run
    // therefore pauses at the screen, and a paused run has not finished doing
    // its work yet, so it carries no summary. The summary arrives on resume.
    const h = makeFlowHarness({ campaign_enrollment: CampaignEnrollmentFlow }, {
      crm_campaign: [{ id: 'cmp1', name: 'Spring Push', status: 'in_progress' }],
      crm_lead: [
        { id: 'l_new', status: 'new', is_converted: false, email: 'a@acme.io', email_opt_out: false },
        { id: 'l_new2', status: 'new', is_converted: false, email: 'b@acme.io', email_opt_out: false },
      ],
      crm_contact: [], crm_campaign_member: [],
    });

    const paused = await h.engine.execute('campaign_enrollment', { params: { recordId: 'cmp1' }, userId: 'u', event: 'manual' } as never) as { status?: string; runId?: string; summary?: unknown };
    expect(paused.status, 'the screen flow did not pause at its screen').toBe('paused');
    expect(paused.summary, 'a paused run must not claim a summary — it has not finished').toBeUndefined();

    const s = summaryOf(await h.engine.resume(paused.runId!, {
      variables: { memberSource: 'leads', leadStatus: 'new', contactDepartment: 'engineering' },
    } as never));
    expect(s.acted, 'the enrolment wrote no members').toBe(h.store.crm_campaign_member.length);
    expect(s.nodes.find((n) => n.nodeId === 'query_leads')?.selected).toBe(2);
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
  const runStagnation = async (flow: unknown, tasks: Rec[]) => {
    const h = makeFlowHarness({ opportunity_stagnation: flow as never }, {
      crm_opportunity: stalledDeals(), crm_task: tasks,
    });
    return summaryOf(await h.engine.execute('opportunity_stagnation', { params: {}, userId: 'u', event: 'schedule' } as never));
  };

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

  it('both shapes trip the run-level predicate, so it cannot be alerted on alone', async () => {
    const healthy = await runStagnation(OpportunityStagnationFlow, nudgeTasks());
    const broken = await runStagnation(withDeadGate(), []);

    const trips = (s: RunSummary) => s.selected > 0 && s.acted === 0 && (s.unmeasured ?? 0) === 0;
    expect(trips(healthy), 'a correctly idempotent run no longer trips the predicate — re-check the qualifier in the admin docs').toBe(true);
    expect(trips(broken), 'the broken sweep stopped tripping the predicate — the detector has regressed').toBe(true);
  });

  it('the per-node fold tells them apart: are the gate skips accounted for?', async () => {
    const healthy = await runStagnation(OpportunityStagnationFlow, nudgeTasks());
    const broken = await runStagnation(withDeadGate(), []);

    const probe = (s: RunSummary) => s.nodes.find((n) => n.nodeId === 'find_existing_task')?.selected ?? 0;
    const gateSkips = (s: RunSummary) => s.gates.reduce((n, g) => n + g.skipped, 0);

    // Healthy: the idempotency lookup found an open task for every deal it
    // skipped, so every skip has a reason.
    expect(gateSkips(healthy)).toBe(2);
    expect(probe(healthy), 'the skips are explained by work already done').toBe(2);

    // Broken: the same skips, with nothing found to justify any of them.
    expect(gateSkips(broken)).toBe(2);
    expect(probe(broken), 'the gate closed on records nothing had handled — the dead-gate signature').toBe(0);
  });
});
