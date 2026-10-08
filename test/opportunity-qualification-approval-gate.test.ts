// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { OpportunityApprovalFlow } from '../src/sales/flows/opportunity-approval.flow';
import { OpportunityStatusChangeApprovalFlow } from '../src/sales/flows/opportunity-status-change-approval.flow';
import { OpportunityQualificationApprovalFlow } from '../src/sales/flows/opportunity-qualification-approval.flow';
import {
  hotcrmStack, signUpPerson, systemUpdate, flowRuns, conditionHolds as holdsOn, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The 立项 (qualification) gate, REQ-0006 step 11:
 * 「销售立项需走审批流程；新增商机可跟进，立项通过后方可更新阶段、投标、赢丢单操作。」
 *
 * The sibling of `test/opportunity-status-change-approval-gate.test.ts`, and
 * built the same way, because the gate is: three surfaces that must agree —
 * `crm_opportunity.qualification_approval_status`'s default (the switch),
 * `opportunity_qualification_approval`'s start condition, and the
 * `beforeUpdate` refusal in `opportunity_lifecycle`. A gate that is off on two
 * surfaces and on for the third is worse than one that is simply on.
 *
 * What this file adds over its sibling is the DESIGN POINT of the card: two
 * gates on one record. The matrix block at the bottom drives every
 * combination (off/off, on/off, off/on, on/on, plus 立项 approved) through
 * the same four acts, and states which gate answers each — so "立项 comes
 * first" and "once 立项 is approved the status-change gate behaves exactly as
 * today" are executable rather than prose.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const opportunity = objects.find((o) => o.name === 'crm_opportunity') as AnyRec | undefined;

/*
 * On the shipped app booted by `@objectstack/verify`: conditions are evaluated
 * by the booted automation service (`conditionHolds`); the write path is a
 * sales rep's real update of their own deal (or a system write), the app's
 * `opportunity_lifecycle` hook judging it inside the engine's write; and each
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
  rep = await signUpPerson(verify, 'rep@opportunity-qualification-approval-gate.test', {
    name: 'Gate Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Qualification Gate Co', owner_id: rep.id }]);
  accountId = String(account!.id);
}, 120_000);

/** Evaluate a flow condition exactly as the engine does. */
const conditionHolds = (condition: unknown, vars: Record<string, unknown>): boolean => holdsOn(verify, condition, vars);

/**
 * The rep's deal, standing in `previous`: written as the system — both gates'
 * verdict columns are `readonly`, so only a system write can put them in a
 * state.
 */
const dealIn = async (previous: AnyRec): Promise<string> => {
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Big Deal ${++k}`, stage: 'qualification', amount: 100, close_date: '2030-06-30',
    crm_account: accountId, owner_id: rep.id,
  }]);
  if (Object.keys(previous).length > 0) await systemUpdate(verify, 'crm_opportunity', { id: deal!.id, ...previous });
  return String(deal!.id);
};

/** Decide the deal's one open approval request as the admin (nobody holds `sales_manager`). */
const decide = async (dealId: string, decision: 'approve' | 'reject'): Promise<void> => {
  const open = (await verify.rows('sys_approval_request', { record_id: dealId })).filter((r) => r.status === 'pending');
  expect(open, 'the deal has no single open approval request').toHaveLength(1);
  const res = await verify.apiAs(admin, 'POST', `/approvals/requests/${open[0]!.id}/${decision}`, { comment: `${decision}d.` });
  expect(res.status, await res.clone().text()).toBe(200);
};

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_opportunity', { id }))[0]!;

const FLOW = OpportunityQualificationApprovalFlow;
const startNode = (FLOW.nodes as Rec[]).find((n) => n.id === 'start');
const startCondition = startNode?.config?.condition;
const reviewNode = (FLOW.nodes as Rec[]).find((n) => n.type === 'approval');

/** A request arriving on this write: the box was unticked, now it is ticked. */
const requesting = (gate: AnyRec) => ({
  record: { id: 'o1', stage: 'prospecting', ...gate, qualification_requested: true },
  previous: { id: 'o1', stage: 'prospecting', ...gate, qualification_requested: false },
});

/** The verdict column in every shape a real record can present it OFF in. */
const OFF_SHAPES: [string, AnyRec][] = [
  ['the shipped default', { qualification_approval_status: 'not_required' }],
  ['a qualified deal', { qualification_approval_status: 'approved' }],
  ['a deal older than the column', {}],
  ['an explicit null', { qualification_approval_status: null }],
];
/** …and the two shapes an ARMED gate holds in. */
const ARMED_SHAPES: [string, AnyRec][] = [
  ['awaiting 立项', { qualification_approval_status: 'pending' }],
  ['refused 立项 by an approver', { qualification_approval_status: 'rejected' }],
];

describe('the gate ships OFF — the field default is the switch', () => {
  it('found the opportunity object and both gate columns, in the qualification group', () => {
    expect(opportunity, 'crm_opportunity missing from the stack').toBeTruthy();
    for (const k of ['qualification_approval_status', 'qualification_requested']) {
      expect(opportunity?.fields?.[k], `${k} is gone`).toBeTruthy();
      expect(opportunity?.fields?.[k]?.group).toBe('qualification');
    }
  });

  it('defaults to not_required, at FIELD level, and only the platform writes it', () => {
    const f = opportunity!.fields.qualification_approval_status as AnyRec;
    // `'pending'` here would arm the gate for every new deal of every install —
    // the one value this pin exists for.
    expect(f.defaultValue).toBe('not_required');
    expect(f.readonly, 'a user-writable verdict is not a verdict').toBe(true);
    // The request is the half a person writes, and it is STORED unticked on
    // every new deal, so the start condition's `has(previous.…)` holds on
    // every driver.
    const req = opportunity!.fields.qualification_requested as AnyRec;
    expect(req.readonly).not.toBe(true);
    expect(req.defaultValue).toBe(false);
  });

  it('is a transition gate, not an invariant: no validation re-states it', () => {
    const rules = (opportunity?.validations ?? []) as AnyRec[];
    const restating = rules.filter((r) => /qualification_approval_status|qualification_requested/.test(JSON.stringify(r)));
    expect(restating.map((r) => r.name)).toEqual([]);
  });

  it('has its own verdict column — neither sibling gate shares it', () => {
    expect(reviewNode?.config?.approvalStatusField).toBe('qualification_approval_status');
    const siblings = [OpportunityApprovalFlow, OpportunityStatusChangeApprovalFlow]
      .flatMap((f) => (f.nodes as Rec[]).filter((n) => n.type === 'approval'))
      .map((n) => n.config?.approvalStatusField);
    expect(siblings).toEqual(['approval_status', 'approval_status', 'status_change_approval_status']);
  });
});

describe('opportunity_qualification_approval — start condition', () => {
  it('is an update trigger on crm_opportunity, elevated, and leaves the deal OPEN while it waits', () => {
    expect(FLOW.name).toBe('opportunity_qualification_approval');
    expect(FLOW.type).toBe('record_change');
    expect(FLOW.runAs).toBe('system');
    expect(startNode?.config?.objectName).toBe('crm_opportunity');
    expect(startNode?.config?.triggerType).toBe('record-after-update');
    expect(reviewNode?.config?.approvers).toEqual([{ type: 'position', value: 'sales_manager' }]);
    expect(reviewNode?.config?.onEmptyApprovers).toBe('admin_rescue');
    // 「新增商机可跟进」: the platform lock would refuse every user edit while
    // the request is open; the three gated acts are the hook's job either way.
    expect(reviewNode?.config?.lockRecord).toBe(false);
  });

  it.each(OFF_SHAPES)('opens NO approval request for %s, even with the box ticked on the write', (_l, shape) => {
    expect(conditionHolds(startCondition, requesting(shape))).toBe(false);
  });

  it.each(ARMED_SHAPES)('opens a request for a deal %s when the rep ticks the box', (_l, shape) => {
    expect(conditionHolds(startCondition, requesting(shape))).toBe(true);
  });

  it('does not re-open on the approval node\'s own `pending` stamp (TRANSITION, not current value)', () => {
    const gate = { qualification_approval_status: 'pending', qualification_requested: true };
    expect(conditionHolds(startCondition, {
      record: { id: 'o1', stage: 'prospecting', ...gate },
      previous: { id: 'o1', stage: 'prospecting', ...gate },
    })).toBe(false);
  });

  it('opens nothing on an armed deal while the box stays unticked', () => {
    const gate = { qualification_approval_status: 'pending', qualification_requested: false };
    expect(conditionHolds(startCondition, {
      record: { id: 'o1', stage: 'prospecting', next_step: 'call back', ...gate },
      previous: { id: 'o1', stage: 'prospecting', ...gate },
    })).toBe(false);
  });

  it('claims no new request when the prior row is invisible (fail-closed, the bulk-update shape)', () => {
    expect(conditionHolds(startCondition, {
      record: { id: 'o1', qualification_approval_status: 'pending', qualification_requested: true },
      previous: null,
    })).toBe(false);
  });

  it('is TOTAL — a deal with neither column reads as "not gated", never as an abort', () => {
    expect(conditionHolds(startCondition, { record: { id: 'o1', name: 'Acme' }, previous: { id: 'o1' } })).toBe(false);
  });
});

describe('the approval branches leave the gate unable to re-enter, and trip no other gate', () => {
  const node = (id: string) => (FLOW.nodes as Rec[]).find((n) => n.id === id);
  const edge = (label: string) => (FLOW.edges as Rec[]).find((e) => e.source === reviewNode?.id && e.label === label);

  it('approve stamps `approved` and nothing else — no stage, no request', () => {
    expect(edge('approve')?.target).toBe('mark_qualified');
    expect(node('mark_qualified')?.config?.fields).toEqual({ qualification_approval_status: 'approved' });
  });

  it('reject unticks the request and keeps the verdict `rejected` — still armed, free to ask again', () => {
    expect(edge('reject')?.target).toBe('clear_request');
    expect(node('clear_request')?.config?.fields).toEqual({
      qualification_approval_status: 'rejected', qualification_requested: false,
    });
    expect(conditionHolds(startCondition, requesting({ qualification_approval_status: 'rejected' }))).toBe(true);
  });
});

// ─── the write path ────────────────────────────────────────────────────────

/** One write against the rep's deal standing in `previous`; `null` = a system write. */
const write = async (input: AnyRec, previous: AnyRec, user: Person | null = rep): Promise<void> => {
  const id = await dealIn(previous);
  if (user) await verify.hooks.run('crm_opportunity', 'update', { id, ...input }, { as: user.token });
  else await systemUpdate(verify, 'crm_opportunity', { id, ...input });
};

const refusal = (input: AnyRec, previous: AnyRec): Promise<AnyRec> =>
  write(input, previous).then(() => null, (e: AnyRec) => e) as Promise<AnyRec>;

/** The two acts step 11 holds until 立项 — 更新阶段 and 赢丢单 (a direct close is a stage change). */
const HELD_ACTS: [string, AnyRec, string][] = [
  ['a stage move', { stage: 'needs_analysis' }, 'Stage'],
  ['a direct close', { stage: 'closed_won', win_reason: 'best_fit' }, 'Stage'],
  ['a won/lost request', { requested_status: 'closed_lost', loss_reason: 'price' }, 'Requested Status'],
];

/**
 * Will Bid is RELEASED (#2004, the maintainer's ruling, option B). REQ-0006
 * step 8 has the rep fill 是否投标 as INPUT to 立项, for the approver to read;
 * holding it until approval would have the approver decide without it. Step
 * 11's 投标 is the act of bidding, which HotCRM does not model.
 */
const RELEASED_ACTS: [string, AnyRec, AnyRec][] = [
  ['recording the bid decision (yes)', { will_bid: true }, {}],
  ['recording the bid decision (no)', { will_bid: false }, {}],
  ['changing the bid decision', { will_bid: false }, { will_bid: true }],
];

describe('the write path — opportunity_lifecycle holds two acts until 立项 is approved', () => {
  for (const [shapeLabel, shape] of ARMED_SHAPES) {
    it.each(HELD_ACTS)(`refuses ${shapeLabel}: %s`, async (_l, input, named) => {
      const err = await refusal(input, shape);
      expect(err, 'the gate let it through').toBeTruthy();
      // ADR-0112 envelope: the CODE and the STATUS are the contract.
      expect(err.code).toBe('RECORD_LOCKED');
      expect(err.status).toBe(409);
      // The sentence names the way forward and what was held.
      expect(String(err.message)).toContain('Request Qualification Approval');
      expect(String(err.message)).toContain(named);
    });
  }

  for (const [shapeLabel, shape] of ARMED_SHAPES) {
    it.each(RELEASED_ACTS)(`lets through, for a deal ${shapeLabel}: %s — input to 立项 (step 8)`, async (_l, input, prior) => {
      await expect(write(input, { ...shape, ...prior })).resolves.toBeUndefined();
    });
  }

  it('names only what is still held when a write carries a held act beside Will Bid', async () => {
    const err = await refusal({ stage: 'needs_analysis', will_bid: true }, { qualification_approval_status: 'pending' });
    expect(err?.code).toBe('RECORD_LOCKED');
    expect(err?.status).toBe(409);
    expect(String(err?.message)).toContain('Stage');
    expect(String(err?.message)).not.toContain('Will Bid');
  });

  it.each(OFF_SHAPES)('lets every held act through for %s — today\'s behaviour, unchanged', async (_l, shape) => {
    for (const [, input] of HELD_ACTS) await expect(write(input, shape)).resolves.toBeUndefined();
  });

  it('「新增商机可跟进」: an unqualified deal stays workable short of the two acts', async () => {
    const pending = { qualification_approval_status: 'pending', will_bid: true, requested_status: null };
    await expect(write({
      amount: 250, next_step: 'site visit', description: 'kick-off notes',
      customer_background: 'listed utility', expected_tender_date: '2030-03-01', controllability: 'high',
      // A form save that echoes the unchanged values back is not a move.
      stage: 'qualification', will_bid: true, requested_status: null,
    }, pending)).resolves.toBeUndefined();
    // …and asking for 立项 is itself an ordinary edit.
    await expect(write({ qualification_requested: true }, pending)).resolves.toBeUndefined();
  });

  it('reads the verdict INPUT-FIRST, as the step-14 gate does', async () => {
    // No real user write can carry the verdict: it is `readonly`, and the
    // engine strips it from a user payload BEFORE beforeUpdate hooks run — so
    // a rep's write that tries is judged by the STORED verdict, and refused.
    const err = await refusal({ stage: 'needs_analysis', qualification_approval_status: 'approved' },
      { qualification_approval_status: 'pending' });
    expect(err?.code, 'a rep wrote their own 立项 verdict').toBe('RECORD_LOCKED');
    // What reaches the verdict is the approval: decided, the flow's own write
    // stamps `approved`, and the same act then goes through.
    const id = await dealIn({ qualification_approval_status: 'pending' });
    await verify.hooks.run('crm_opportunity', 'update', { id, qualification_requested: true }, { as: rep.token });
    await decide(id, 'approve');
    expect((await stored(id)).qualification_approval_status).toBe('approved');
    await expect(verify.hooks.run('crm_opportunity', 'update', { id, stage: 'needs_analysis' }, { as: rep.token }))
      .resolves.toBeTruthy();
  });

  it('judges only USER writes — a system write (no user) carries no session to refuse', async () => {
    await expect(write({ stage: 'needs_analysis', will_bid: true },
      { qualification_approval_status: 'pending' }, null)).resolves.toBeUndefined();
  });

  it('the flow\'s own stamps land even on a deal that closed meanwhile (APPROVAL_FIELDS)', async () => {
    // A deal can only close before 立项 through a write this hook does not
    // judge (no user). The flow stamps the verdict under the triggering user,
    // so the closed-deal freeze would judge it as a user edit and refuse it.
    // End to end: the rep asks for 立项, a system write closes the deal while
    // the request is open, and the approver decides.
    for (const stage of ['closed_won', 'closed_lost']) {
      for (const decision of ['approve', 'reject'] as const) {
        const id = await dealIn({ qualification_approval_status: 'pending' });
        await verify.hooks.run('crm_opportunity', 'update', { id, qualification_requested: true }, { as: rep.token });
        await systemUpdate(verify, 'crm_opportunity', stage === 'closed_won'
          ? { id, stage, win_reason: 'best_fit' } : { id, stage, loss_reason: 'price' });
        await decide(id, decision);
        const after = await stored(id);
        expect(after.qualification_approval_status, `the ${decision} stamp did not land on a ${stage} deal`)
          .toBe(decision === 'approve' ? 'approved' : 'rejected');
        if (decision === 'reject') expect(Boolean(after.qualification_requested)).toBe(false);
      }
    }
  });
});

// ─── the two gates on one record ───────────────────────────────────────────

/**
 * Which gate answers which act, for every combination of the two switches.
 * `ok` = the write goes through; `立项` = refused by this gate; `status` =
 * refused by the step-14 gate. With only one gate armed the other is inert;
 * with both, 立项 answers first; once 立项 is approved the status-change
 * gate behaves exactly as it does alone. The bid decision is held by neither
 * (#2004): it is input to 立项, so it reads `ok` in every row.
 */
type Verdict = 'ok' | '立项' | 'status';
const ACTS: [string, AnyRec][] = [
  ['stage move', { stage: 'needs_analysis' }],
  ['bid decision', { will_bid: true }],
  ['won/lost request', { requested_status: 'closed_won', win_reason: 'best_fit' }],
  ['direct close', { stage: 'closed_won', win_reason: 'best_fit' }],
];
const MATRIX: [string, AnyRec, Verdict[]][] = [
  ['off/off', { qualification_approval_status: 'not_required', status_change_approval_status: 'not_required' },
    ['ok', 'ok', 'ok', 'ok']],
  ['立项 on (pending) / status off', { qualification_approval_status: 'pending', status_change_approval_status: 'not_required' },
    ['立项', 'ok', '立项', '立项']],
  ['立项 on (rejected) / status off', { qualification_approval_status: 'rejected', status_change_approval_status: 'not_required' },
    ['立项', 'ok', '立项', '立项']],
  ['立项 approved / status off', { qualification_approval_status: 'approved', status_change_approval_status: 'not_required' },
    ['ok', 'ok', 'ok', 'ok']],
  ['立项 off / status on', { qualification_approval_status: 'not_required', status_change_approval_status: 'pending' },
    ['ok', 'ok', 'ok', 'status']],
  ['both on, before 立项', { qualification_approval_status: 'pending', status_change_approval_status: 'pending' },
    ['立项', 'ok', '立项', '立项']],
  ['both on, 立项 approved', { qualification_approval_status: 'approved', status_change_approval_status: 'pending' },
    ['ok', 'ok', 'ok', 'status']],
];

const answeredBy = (err: AnyRec | null): Verdict => {
  if (!err) return 'ok';
  expect(err.code).toBe('RECORD_LOCKED');
  expect(err.status).toBe(409);
  const m = String(err.message);
  if (m.includes('qualification approval first')) return '立项';
  if (m.includes('status change needs approval')) return 'status';
  throw new Error(`refused by something else: ${m}`);
};

describe('two gates, one deal — the interaction matrix', () => {
  it.each(MATRIX)('%s', async (_l, gates, expected) => {
    const got: Verdict[] = [];
    for (const [, input] of ACTS) got.push(answeredBy(await refusal(input, gates)));
    expect(Object.fromEntries(ACTS.map(([a], i) => [a, got[i]])))
      .toEqual(Object.fromEntries(ACTS.map(([a], i) => [a, expected[i]])));
  });

  it('the step-14 approval\'s own close still lands once 立项 is approved', async () => {
    // End to end: the rep asks for the close, the step-14 approval opens, and
    // its approve branch writes the stage and its verdict in one payload.
    const id = await dealIn({ qualification_approval_status: 'approved', status_change_approval_status: 'pending' });
    await verify.hooks.run('crm_opportunity', 'update', { id, requested_status: 'closed_won', win_reason: 'best_fit' }, { as: rep.token });
    await decide(id, 'approve');
    const after = await stored(id);
    expect(after.stage, 'the step-14 approval\'s own close was refused').toBe('closed_won');
    expect(after.status_change_approval_status).toBe('approved');
  });

  it('the 立项 approval\'s own stamps trip neither the step-14 gate nor the freeze', async () => {
    for (const decision of ['approve', 'reject'] as const) {
      const id = await dealIn({ qualification_approval_status: 'pending', status_change_approval_status: 'pending' });
      await verify.hooks.run('crm_opportunity', 'update', { id, qualification_requested: true }, { as: rep.token });
      await decide(id, decision);
      const after = await stored(id);
      expect(after.qualification_approval_status).toBe(decision === 'approve' ? 'approved' : 'rejected');
      if (decision === 'reject') expect(Boolean(after.qualification_requested)).toBe(false);
    }
  });

  it('neither flow opens on the other gate\'s request', () => {
    // A 立项 tick with only the status-change gate armed opens nothing here…
    expect(conditionHolds(startCondition, requesting({
      qualification_approval_status: 'not_required', status_change_approval_status: 'pending',
    }))).toBe(false);
    // …and a won/lost request with only 立项 armed opens nothing there.
    const statusStart = (OpportunityStatusChangeApprovalFlow.nodes as Rec[]).find((n) => n.id === 'start')?.config?.condition;
    expect(conditionHolds(statusStart, {
      record: { id: 'o1', qualification_approval_status: 'approved', status_change_approval_status: 'not_required', requested_status: 'closed_won' },
      previous: { id: 'o1', qualification_approval_status: 'approved', status_change_approval_status: 'not_required', requested_status: null },
    })).toBe(false);
  });
});

/**
 * The gate engages for a request written with no session — the reading both
 * siblings take from `opportunity-approval.flow.ts`'s measured failure. The
 * run is fired with NO trigger user; the counter-proof strips `runAs` back to
 * its schema default, direction decided before running it: the stripped run
 * must fail at `get_opportunity` with the engine's `[runAs]` refusal.
 */
describe('a request written with no session still reaches the approval', () => {
  it('passes `get_opportunity` and stops only at the approval node', async () => {
    // The request arrives on a SYSTEM write — no session, no trigger user.
    const id = await dealIn({ qualification_approval_status: 'pending' });
    await systemUpdate(verify, 'crm_opportunity', { id, qualification_requested: true });

    const [run] = await flowRuns(verify, 'opportunity_qualification_approval', id);
    expect(String(run?.error ?? ''), 'the request is bypassing approval').not.toContain('[runAs]');
    // The run parks at the approval node with a request open.
    expect(run?.status).toBe('paused');
    expect(await verify.rows('sys_approval_request', { record_id: id })).toHaveLength(1);
  });

  it('…and never gets that far once `runAs` is dropped', async () => {
    // On 17.7.0 the runAs-less variant is refused before it can run at all:
    // the platform's flow-authoring door names the `readonly` verdict column a
    // user-scoped run would silently drop.
    const { runAs: _dropped, ...withoutRunAs } = FLOW as unknown as Rec;
    const res = await verify.apiAs(admin, 'POST', '/automation', { ...withoutRunAs, name: 'opportunity_qualification_approval_without_runas' });
    expect(res.status).toBe(422);
    const body = await res.json() as Rec;
    expect(body.error.code).toBe('INVALID_METADATA');
    expect(JSON.stringify(body.error.details)).toContain('flow-update-readonly-field');
  });
});
