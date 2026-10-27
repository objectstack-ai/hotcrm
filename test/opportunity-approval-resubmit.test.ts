// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { REFUSAL_CODES } from '../src/sales/objects/_refusal';
import { LARGE_DEAL_AMOUNT } from '../src/sales/objects/_thresholds';
import { OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow } from '../src/sales/flows/opportunity-approval.flow';
import { hotcrmStack, signUpPerson, systemUpdate, conditionHolds as holdsOn, type Person } from './helpers/verify-stack';

/**
 * The Large Deal Approval after a request ENDS without approval (#2334).
 *
 * Two holes, one predicate. Measured on 18.2.0 before this change, both through
 * real writes and real decisions on the booted app:
 *
 * - **Reject.** `opportunity_approval` entered only from `not_required`/null, so
 *   once an approver rejected a deal no later save could open a new request,
 *   and nothing refused the rep's direct move to `closed_won`: one rejection
 *   followed by any save let a large deal close won with no approval at all.
 * - **Recall (#2320 Sales D5).** The platform's recall restores the status the
 *   deal held before it entered approval (`not_required`), and that write
 *   re-fired the same start condition, so a fresh request opened in the same
 *   second and the deal stayed locked: a rep could never take a deal back.
 *
 * The start condition now tells a write that ENDS a request apart from a later
 * save: the platform writes the end of a request (recall, reject) onto a deal
 * that was `pending` a moment before, and nothing else does. From `rejected`,
 * the next save is the resubmission. `opportunity_lifecycle` refuses a user's
 * move to `closed_won` while the verdict is `pending` or `rejected` at or above
 * `LARGE_DEAL_AMOUNT`, with the sibling gates' envelope.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let manager: Person;
let accountId: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@opportunity-approval-resubmit.test', {
    name: 'Resubmit Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  // The bench `manager_review` routes to, so a decision is a real approver's.
  manager = await signUpPerson(verify, 'manager@opportunity-approval-resubmit.test', {
    name: 'Resubmit Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Resubmit Co', owner_id: rep.id, approval_status: 'approved' }]);
  accountId = String(account!.id);
}, 180_000);

const as = (p: Person) => ({ as: p.token });
const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_opportunity', { id }))[0]!;
const requests = (id: string): Promise<Rec[]> => verify.rows('sys_approval_request', { object_name: 'crm_opportunity', record_id: id });
const pending = async (id: string): Promise<Rec[]> => (await requests(id)).filter((r) => r.status === 'pending');
const refusalOf = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);

/**
 * Long enough for a record-change flow the last write fired to have opened its
 * request, so "nothing opened" is read after it, not before it.
 */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 750));

/** A rep's open deal under the line, raised across it by the rep: the request is theirs, pending. */
const dealInApproval = async (amount = 120_000): Promise<string> => {
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Resubmit Deal ${++k}`, stage: 'proposal', amount: 42_000, close_date: '2030-06-30',
    crm_account: accountId, owner_id: rep.id,
  }]);
  const id = String(deal!.id);
  await verify.hooks.run('crm_opportunity', 'update', { id, amount }, as(rep));
  await vi.waitFor(async () => {
    expect(await pending(id)).toHaveLength(1);
    expect((await stored(id)).approval_status).toBe('pending');
  }, { timeout: 15_000, interval: 100 });
  return id;
};

/** Act on the deal's one pending request through the approvals door. */
const act = async (id: string, who: Person, verb: 'approve' | 'reject' | 'recall'): Promise<void> => {
  const [open] = await pending(id);
  expect(open, 'the deal has no pending request to act on').toBeTruthy();
  const res = await verify.apiAs(who.token, 'POST', `/approvals/requests/${open!.id}/${verb}`, { comment: `${verb} by test.` });
  expect(res.status, await res.clone().text()).toBe(200);
  await settle();
};

const closeWon = (id: string, who: Person = rep): Promise<unknown> =>
  verify.hooks.run('crm_opportunity', 'update', { id, stage: 'closed_won', win_reason: 'best_fit' }, as(who));

describe('reject: the flow\'s own write opens nothing, the next save is the resubmission', () => {
  it('the rejection leaves the deal rejected with no new request', async () => {
    const id = await dealInApproval();
    await act(id, manager, 'reject');
    expect((await stored(id)).approval_status).toBe('rejected');
    expect(await pending(id), 'the rejection\'s own status write re-opened the approval').toHaveLength(0);
    expect(await requests(id)).toHaveLength(1);
  });

  it('a revised save after the rejection opens a NEW request and locks the deal again', async () => {
    const id = await dealInApproval(600_000);
    await act(id, manager, 'reject');
    await verify.hooks.run('crm_opportunity', 'update', { id, amount: 550_000 }, as(rep));
    await vi.waitFor(async () => {
      expect(await pending(id), 'the revised deal was not sent back for approval').toHaveLength(1);
      expect((await stored(id)).approval_status).toBe('pending');
    }, { timeout: 15_000, interval: 100 });
    expect(await requests(id)).toHaveLength(2);
    // ...and the resubmission is decided like any other request.
    await act(id, manager, 'approve');
    expect((await stored(id)).approval_status).not.toBe('rejected');
  });
});

describe('recall (#2320 Sales D5): the deal is handed back, unlocked, with no request', () => {
  it('opens no new request on the recall\'s own status write', async () => {
    const id = await dealInApproval();
    await act(id, rep, 'recall');
    const after = await stored(id);
    expect(after.approval_status, 'the recall did not hand the deal back').toBe('not_required');
    expect(await pending(id), 'the recall re-submitted the deal in the same breath').toHaveLength(0);
    expect((await requests(id)).map((r) => r.status)).toEqual(['recalled']);
  });

  it('the recalled deal is unlocked: the rep\'s edit lands, and that save sends it for approval again', async () => {
    const id = await dealInApproval();
    await act(id, rep, 'recall');
    await verify.hooks.run('crm_opportunity', 'update', { id, amount: 110_000, next_step: 'Revised after recall' }, as(rep));
    expect(await stored(id)).toMatchObject({ amount: 110_000, next_step: 'Revised after recall' });
    await vi.waitFor(async () => expect(await pending(id)).toHaveLength(1), { timeout: 15_000, interval: 100 });
  });

  it('recalling a RESUBMISSION hands the deal back as rejected — still refused at close', async () => {
    const id = await dealInApproval();
    await act(id, manager, 'reject');
    await verify.hooks.run('crm_opportunity', 'update', { id, amount: 115_000 }, as(rep));
    await vi.waitFor(async () => expect(await pending(id)).toHaveLength(1), { timeout: 15_000, interval: 100 });
    await act(id, rep, 'recall');
    // The platform restores the status the request was submitted from.
    expect((await stored(id)).approval_status).toBe('rejected');
    expect(await pending(id)).toHaveLength(0);
    const err = await refusalOf(closeWon(id));
    expect(err, 'a recalled resubmission closed won with no approval').toBeTruthy();
    expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
  });
});

describe('closing won — opportunity_lifecycle refuses a large deal its approval has not granted', () => {
  it('refuses a rejected deal moving to closed_won, and nothing is stored', async () => {
    const id = await dealInApproval();
    await act(id, manager, 'reject');
    const err = await refusalOf(closeWon(id));
    expect(err, 'a rejected large deal closed won with no approval').toBeTruthy();
    // ADR-0112 envelope: the CODE and the STATUS are the contract.
    expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    expect((await stored(id)).stage).toBe('proposal');
  });

  it('the card\'s steps 3 and 4: revise, move to Negotiation, then Closed Won — refused, the revision is in approval', async () => {
    const id = await dealInApproval(600_000);
    await act(id, manager, 'reject');
    await verify.hooks.run('crm_opportunity', 'update', { id, amount: 550_000 }, as(rep));
    await vi.waitFor(async () => expect(await pending(id)).toHaveLength(1), { timeout: 15_000, interval: 100 });
    // The resubmission locks the deal, so neither move lands.
    expect(await refusalOf(verify.hooks.run('crm_opportunity', 'update', { id, stage: 'negotiation' }, as(rep)))).toBeTruthy();
    const err = await refusalOf(closeWon(id));
    expect(err, 'the resubmitted deal closed won with no approval').toBeTruthy();
    expect(err!.code).toBe(REFUSAL_CODES.locked.code);
    expect((await stored(id)).stage).toBe('proposal');
  });

  it('lets an APPROVED large deal close won', async () => {
    const id = await dealInApproval();
    await act(id, manager, 'approve');
    expect((await stored(id)).approval_status).toBe('approved');
    await expect(closeWon(id)).resolves.toBeTruthy();
    expect((await stored(id)).stage).toBe('closed_won');
  });

  it('lets closed_lost through from rejected — losing a deal needs no approval', async () => {
    const id = await dealInApproval();
    await act(id, manager, 'reject');
    await expect(verify.hooks.run('crm_opportunity', 'update', { id, stage: 'closed_lost', loss_reason: 'price' }, as(rep))).resolves.toBeTruthy();
  });

  it('leaves a deal under the line untouched, whatever its verdict says', async () => {
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Small Deal ${++k}`, stage: 'proposal', amount: LARGE_DEAL_AMOUNT - 1, close_date: '2030-06-30',
      crm_account: accountId, owner_id: rep.id,
    }]);
    const id = String(deal!.id);
    await systemUpdate(verify, 'crm_opportunity', { id, approval_status: 'rejected' });
    await expect(closeWon(id)).resolves.toBeTruthy();
    expect((await stored(id)).stage).toBe('closed_won');
    expect(await requests(id)).toHaveLength(0);
  });

  it('judges only USER writes — a system close of a rejected deal is not refused', async () => {
    const id = await dealInApproval();
    await act(id, manager, 'reject');
    await expect(systemUpdate(verify, 'crm_opportunity', { id, stage: 'closed_won', win_reason: 'best_fit' })).resolves.toBeTruthy();
  });
});

describe('opportunity_approval — start condition, as a truth table', () => {
  const update = (OpportunityApprovalFlow.nodes as Rec[]).find((n) => n.id === 'start')!.config.condition;
  const insert = (OpportunityApprovalOnCreateFlow.nodes as Rec[]).find((n) => n.id === 'start')!.config.condition;
  const holds = (condition: unknown, record: Rec, previous?: Rec): boolean =>
    holdsOn(verify, condition, previous === undefined ? { record } : { record, previous });
  const big = { amount: LARGE_DEAL_AMOUNT, stage: 'proposal' };

  it('opens on a save that crosses the line, or any later save of a deal no request holds', () => {
    expect(holds(update, { ...big, approval_status: 'not_required' }, { amount: 1, approval_status: 'not_required' })).toBe(true);
    expect(holds(update, { ...big, approval_status: 'not_required' }, { ...big, approval_status: 'not_required' })).toBe(true);
    expect(holds(update, { ...big, approval_status: 'rejected' }, { ...big, approval_status: 'rejected' })).toBe(true);
  });

  it('opens nothing on the write that ENDS a request — recall or reject, both from pending', () => {
    expect(holds(update, { ...big, approval_status: 'not_required' }, { ...big, approval_status: 'pending' })).toBe(false);
    expect(holds(update, { ...big, approval_status: 'rejected' }, { ...big, approval_status: 'pending' })).toBe(false);
  });

  it('opens nothing while a request is pending, once approved, or on a settled deal', () => {
    expect(holds(update, { ...big, approval_status: 'pending' }, { ...big, approval_status: 'not_required' })).toBe(false);
    expect(holds(update, { ...big, approval_status: 'approved' }, { ...big, approval_status: 'pending' })).toBe(false);
    expect(holds(update, { ...big, stage: 'closed_won', approval_status: 'rejected' }, { ...big, approval_status: 'rejected' })).toBe(false);
  });

  it('is TOTAL — no prior status visible reads as a submission, never an abort', () => {
    expect(holds(update, { ...big, approval_status: 'rejected' }, {})).toBe(true);
    expect(holds(update, { ...big }, {})).toBe(true);
    // No prior row bound at all: `has(previous.x)` would abort here.
    expect(holds(update, { ...big, approval_status: 'rejected' })).toBe(true);
    expect(holdsOn(verify, update, { record: { ...big }, previous: null })).toBe(true);
  });

  it('the insert twin keeps its own condition — it reads no `previous` and never enters from rejected', () => {
    expect(holds(insert, { ...big, approval_status: 'not_required' })).toBe(true);
    expect(holds(insert, { ...big })).toBe(true);
    expect(holds(insert, { ...big, approval_status: 'rejected' })).toBe(false);
  });
});
