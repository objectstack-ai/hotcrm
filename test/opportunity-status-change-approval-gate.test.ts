// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { OpportunityApprovalFlow } from '../src/sales/flows/opportunity-approval.flow';
import { OpportunityStatusChangeApprovalFlow } from '../src/sales/flows/opportunity-status-change-approval.flow';
import {
  hotcrmStack, signUpPerson, systemUpdate, flowRuns, conditionHolds as holdsOn, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The status-change gate (REQ-0006 steps 13-14), and the thing that has to
 * hold about it first: **it is OFF in the box** (acceptance 3, "with it off
 * (the default), the existing amount-tiered behaviour of
 * `opportunity-approval.flow.ts` is bit-for-bit what it is today").
 *
 * The gate is authored across three surfaces that must agree —
 * `crm_opportunity.status_change_approval_status`'s default (the switch),
 * `opportunity_status_change_approval`'s start condition, and the
 * `beforeUpdate` refusal in `opportunity_lifecycle`. One file, for the reason
 * the lead sibling gives: a gate that is off on two surfaces and on for the
 * third is worse than one that is simply on.
 *
 * ⚠️ Armed, the gate has to hold in BOTH non-approved states. `rejected` is
 * not a release: a deal an approver refused must still not be closable by a
 * direct stage write, and it must still be able to ask again. Both halves are
 * pinned below, because each was missing once.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const opportunity = objects.find((o) => o.name === 'crm_opportunity') as AnyRec | undefined;

/*
 * On the shipped app booted by `@objectstack/verify`: conditions are evaluated
 * by the booted automation service (`conditionHolds`); the write path is a
 * sales rep's real update of their own deal (or a system write), the app's
 * `opportunity_lifecycle` hook judging it inside the engine's write; and the
 * flow is reached through real writes and a real approval decision.
 */
let verify: VerifyStack;
let admin: string;
let rep: Person;
let accountId: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@opportunity-status-change-approval-gate.test', {
    name: 'Gate Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Status Gate Co', owner_id: rep.id }]);
  accountId = String(account!.id);
}, 120_000);

/** Evaluate a flow condition exactly as the engine does. */
const conditionHolds = (condition: unknown, vars: Record<string, unknown>): boolean => holdsOn(verify, condition, vars);

/**
 * The rep's deal, standing in `previous`: written as the system — the gate's
 * verdict column is `readonly`, so only a system write can put it in a state.
 */
const dealIn = async (previous: AnyRec): Promise<string> => {
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Big Deal ${++k}`, stage: 'negotiation', amount: 100, close_date: '2030-06-30',
    crm_account: accountId, owner_id: rep.id,
  }]);
  if (Object.keys(previous).length > 0) await systemUpdate(verify, 'crm_opportunity', { id: deal!.id, ...previous });
  return String(deal!.id);
};

const startNode = (OpportunityStatusChangeApprovalFlow.nodes as Rec[]).find((n) => n.id === 'start');
const startCondition = startNode?.config?.condition;
const reviewNode = (OpportunityStatusChangeApprovalFlow.nodes as Rec[]).find((n) => n.type === 'approval');

/** A request arriving on this write: `previous` had none, `record` has one. */
const requesting = (gate: AnyRec, requested = 'closed_won') => ({
  record: { id: 'o1', stage: 'negotiation', ...gate, requested_status: requested },
  previous: { id: 'o1', stage: 'negotiation', ...gate, requested_status: null },
});

/** The verdict column in every shape a real record can present it OFF in. */
const OFF_SHAPES: [string, AnyRec][] = [
  ['the shipped default', { status_change_approval_status: 'not_required' }],
  ['an approved deal', { status_change_approval_status: 'approved' }],
  ['a deal older than the column', {}],
  ['an explicit null', { status_change_approval_status: null }],
];
/** …and the two shapes an ARMED gate holds in. */
const ARMED_SHAPES: [string, AnyRec][] = [
  ['awaiting a first request', { status_change_approval_status: 'pending' }],
  ['refused by an approver', { status_change_approval_status: 'rejected' }],
];

describe('the gate ships OFF — the field default is the switch', () => {
  it('found the opportunity object and both gate columns', () => {
    expect(opportunity, 'crm_opportunity missing from the stack').toBeTruthy();
    expect(opportunity?.fields?.status_change_approval_status, 'the verdict column is gone').toBeTruthy();
    expect(opportunity?.fields?.requested_status, 'the request column is gone').toBeTruthy();
  });

  it('defaults to not_required, at FIELD level, and only the platform writes it', () => {
    const f = opportunity!.fields.status_change_approval_status as AnyRec;
    // Field-level: an option-level `default: true` only preselects in a UI form,
    // so an API insert would land a null. `'pending'` here would arm the gate
    // for every new deal of every install — the one value this pin exists for.
    expect(f.defaultValue).toBe('not_required');
    expect(f.readonly, 'a user-writable verdict is not a verdict').toBe(true);
    // The request is the half a person writes.
    expect(opportunity!.fields.requested_status.readonly).not.toBe(true);
  });

  it('is a transition gate, not an invariant: no validation re-states it', () => {
    // AGENTS.md metadata semantics rule 7: a `validations[]` copy would be
    // evaluated against `{...previous, ...data}` and judge every deal already
    // closed before the gate was armed.
    const rules = (opportunity?.validations ?? []) as AnyRec[];
    const restating = rules.filter((r) => /status_change_approval_status|requested_status/.test(JSON.stringify(r)));
    expect(restating.map((r) => r.name)).toEqual([]);
  });

  it('has its own verdict column — the amount-tiered flow keeps `approval_status` to itself', () => {
    // Sharing the column would let either gate's verdict erase the other's and
    // re-trigger the amount flow, whose entry keys on `approval_status`.
    expect(reviewNode?.config?.approvalStatusField).toBe('status_change_approval_status');
    const amountNodes = (OpportunityApprovalFlow.nodes as Rec[]).filter((n) => n.type === 'approval');
    expect(amountNodes.length).toBeGreaterThan(0);
    for (const n of amountNodes) expect(n.config?.approvalStatusField).toBe('approval_status');
  });
});

describe('opportunity_status_change_approval — start condition', () => {
  it('is an update trigger on crm_opportunity, elevated, and locks the deal while it waits', () => {
    expect(OpportunityStatusChangeApprovalFlow.name).toBe('opportunity_status_change_approval');
    expect(OpportunityStatusChangeApprovalFlow.type).toBe('record_change');
    expect(OpportunityStatusChangeApprovalFlow.runAs).toBe('system');
    expect(startNode?.config?.objectName).toBe('crm_opportunity');
    expect(startNode?.config?.triggerType).toBe('record-after-update');
    expect(reviewNode?.config?.lockRecord).toBe(true);
  });

  it.each(OFF_SHAPES)('opens NO approval request for %s, even with a request on the write', (_l, shape) => {
    expect(conditionHolds(startCondition, requesting(shape))).toBe(false);
  });

  it.each(ARMED_SHAPES)('opens a request for a deal %s when the rep asks for a status', (_l, shape) => {
    expect(conditionHolds(startCondition, requesting(shape))).toBe(true);
    expect(conditionHolds(startCondition, requesting(shape, 'closed_lost'))).toBe(true);
  });

  it('does not re-open on the approval node\'s own `pending` stamp (TRANSITION, not current value)', () => {
    // `approvalStatusField` stamps `pending` through an update of this record
    // while the request is still open. The request is unchanged on that write,
    // so it is not a new request — testing the current value alone re-fired
    // this flow on its own write-back (measured on 17.6.0: one re-entry per
    // request, stopped only by the engine's self-trigger guard).
    const gate = { status_change_approval_status: 'pending', requested_status: 'closed_won' };
    expect(conditionHolds(startCondition, {
      record: { id: 'o1', stage: 'negotiation', ...gate },
      previous: { id: 'o1', stage: 'negotiation', ...gate },
    })).toBe(false);
  });

  it('opens nothing on an armed deal until a request is actually written', () => {
    const gate = { status_change_approval_status: 'pending', requested_status: null };
    expect(conditionHolds(startCondition, {
      record: { id: 'o1', stage: 'negotiation', description: 'edited', ...gate },
      previous: { id: 'o1', stage: 'negotiation', ...gate },
    })).toBe(false);
  });

  it('claims no new request when the prior row is invisible (fail-closed, the bulk-update shape)', () => {
    expect(conditionHolds(startCondition, {
      record: { id: 'o1', status_change_approval_status: 'pending', requested_status: 'closed_won' },
      previous: null,
    })).toBe(false);
  });

  it('is TOTAL — a deal with neither column reads as "not gated", never as an abort', () => {
    expect(conditionHolds(startCondition, { record: { id: 'o1', name: 'Acme' }, previous: { id: 'o1' } })).toBe(false);
  });
});

describe('the approval branches leave the gate unable to re-enter', () => {
  const node = (id: string) => (OpportunityStatusChangeApprovalFlow.nodes as Rec[]).find((n) => n.id === id);
  const edge = (label: string) => (OpportunityStatusChangeApprovalFlow.edges as Rec[])
    .find((e) => e.source === reviewNode?.id && e.label === label);

  it('approve applies the REQUEST to the stage and stamps `approved` in the same write', () => {
    expect(edge('approve')?.target).toBe('apply_status');
    const fields = node('apply_status')?.config?.fields as AnyRec;
    expect(fields.stage).toBe('{oppRecord.requested_status}');
    expect(fields.status_change_approval_status).toBe('approved');
  });

  it('reject clears the request and keeps the verdict `rejected` — still armed, free to ask again', () => {
    expect(edge('reject')?.target).toBe('clear_request');
    const fields = node('clear_request')?.config?.fields as AnyRec;
    expect(fields).toEqual({ status_change_approval_status: 'rejected', requested_status: null });
    // …and from there a NEW request opens a fresh approval.
    expect(conditionHolds(startCondition, requesting({ status_change_approval_status: 'rejected' }))).toBe(true);
  });
});

describe('the write path — opportunity_lifecycle refuses a direct close while the gate holds', () => {
  // `null` = a system write.
  const write = async (input: AnyRec, previous: AnyRec, user: Person | null = rep): Promise<void> => {
    const id = await dealIn(previous);
    if (user) await verify.hooks.run('crm_opportunity', 'update', { id, ...input }, { as: user.token });
    else await systemUpdate(verify, 'crm_opportunity', { id, ...input });
  };

  const refusal = (input: AnyRec, previous: AnyRec): Promise<AnyRec> =>
    write(input, previous).then(() => null, (e: AnyRec) => e) as Promise<AnyRec>;

  it.each(ARMED_SHAPES)('refuses a deal %s moving straight to closed_won or closed_lost', async (_l, shape) => {
    for (const stage of ['closed_won', 'closed_lost']) {
      const err = await refusal(stage === 'closed_won' ? { stage, win_reason: 'best_fit' } : { stage, loss_reason: 'price' }, shape);
      expect(err, `the gate let a direct ${stage} through`).toBeTruthy();
      // ADR-0112 envelope: the CODE and the STATUS are the contract. A bare
      // `toThrow()` would pass on an unenveloped Error.
      expect(err.code).toBe('RECORD_LOCKED');
      expect(err.status).toBe(409);
      // The sentence names the way forward, so the rep is not left guessing.
      expect(String(err.message)).toContain('Requested Status');
    }
  });

  it.each(OFF_SHAPES)('lets a direct close through for %s — today\'s behaviour, unchanged', async (_l, shape) => {
    await expect(write({ stage: 'closed_won', win_reason: 'best_fit' }, shape)).resolves.toBeUndefined();
  });

  it('lets the approving flow\'s own write through: the verdict is read INPUT-FIRST', async () => {
    // `apply_status` writes the stage and `approved` in one payload, under the
    // triggering user (elevation is not anonymity). Reading `previous` first
    // would see `pending` and refuse the flow's own decision. Run end to end:
    // the rep asks for the close on an armed deal, the approval opens, the
    // admin (nobody holds `sales_manager`, so the request is the admin's to
    // decide) approves it through the approvals door, and the flow's own write
    // must land.
    const id = await dealIn({ status_change_approval_status: 'pending' });
    await verify.hooks.run('crm_opportunity', 'update', { id, requested_status: 'closed_won', win_reason: 'best_fit' }, { as: rep.token });
    const [request] = await verify.rows('sys_approval_request', { record_id: id });
    expect(request, 'the request opened no approval').toBeTruthy();
    const decided = await verify.apiAs(admin, 'POST', `/approvals/requests/${request!.id}/approve`, { comment: 'Approved.' });
    expect(decided.status, await decided.clone().text()).toBe(200);
    const [closed] = await verify.rows('crm_opportunity', { id });
    expect(closed!.stage, 'the approving flow\'s own close was refused').toBe('closed_won');
    expect(closed!.status_change_approval_status).toBe('approved');
  });

  it('stops one act, not the work: an armed deal stays editable short of closing', async () => {
    await expect(write(
      { stage: 'proposal', requested_status: 'closed_lost', loss_reason: 'price' },
      { status_change_approval_status: 'pending' },
    )).resolves.toBeUndefined();
  });

  it('judges only USER writes — a system write (no user) carries no session to refuse', async () => {
    // This repo's system-write signal (AGENTS.md: `ctx.user` is absent on
    // system and seed writes), the same boundary the closed-deal freeze below
    // it draws. Acceptance 4 is the FLOW's half: a request written with no
    // session still opens an approval — pinned in the next block.
    await expect(write({ stage: 'closed_won', win_reason: 'best_fit' },
      { status_change_approval_status: 'pending' }, null)).resolves.toBeUndefined();
  });
});

/**
 * REQ-0006 acceptance 4: "A gate opened by a writer with no session still
 * engages — the measured failure recorded in `opportunity-approval.flow.ts`'s
 * docstring does not recur." That failure was a user-less trigger dying at the
 * flow's first data node, leaving the deal ungated. So the run is fired here
 * with NO trigger user, and the counter-proof strips `runAs` back to its
 * schema default — direction decided before running it: the stripped run must
 * fail at `get_opportunity` with the engine's `[runAs]` refusal.
 */
describe('acceptance 4 — a request written with no session still reaches the approval', () => {
  it('passes `get_opportunity` and stops only at the approval node', async () => {
    // The request arrives on a SYSTEM write — no session, no trigger user.
    const id = await dealIn({ status_change_approval_status: 'pending' });
    await systemUpdate(verify, 'crm_opportunity', { id, requested_status: 'closed_won', win_reason: 'best_fit' });

    const [run] = await flowRuns(verify, 'opportunity_status_change_approval', id);
    expect(String(run?.error ?? ''), 'the request is bypassing approval').not.toContain('[runAs]');
    // The run parks at the approval node with a request open — the gate
    // engaged, as it does for a person's request.
    expect(run?.status).toBe('paused');
    expect(await verify.rows('sys_approval_request', { record_id: id })).toHaveLength(1);
  });

  it('…and never gets that far once `runAs` is dropped', async () => {
    // On 17.7.0 the runAs-less variant is refused before it can run at all:
    // the platform's flow-authoring door names the `readonly` verdict column a
    // user-scoped run would silently drop.
    const { runAs: _dropped, ...withoutRunAs } = OpportunityStatusChangeApprovalFlow as unknown as Rec;
    const res = await verify.apiAs(admin, 'POST', '/automation', { ...withoutRunAs, name: 'opportunity_status_change_approval_without_runas' });
    expect(res.status).toBe(422);
    const body = await res.json() as Rec;
    expect(body.error.code).toBe('INVALID_METADATA');
    expect(JSON.stringify(body.error.details)).toContain('flow-update-readonly-field');
  });
});
