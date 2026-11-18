// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

/**
 * Win Reason and Loss Reason belong to a deal that is closing that way (#2592).
 *
 * The field-level `visibleWhen` hides each on an open deal (record page,
 * inline edit, forms); the same predicate on every OPTION is the half the
 * server enforces, so a write that puts a reason on an open deal is refused.
 * Pinned here on the booted app, through the engine's real write path:
 *
 *   - an open deal refuses a win or loss reason, for its owner;
 *   - closing as Lost with a reason, and asking to close as Won with one
 *     (the status-change request), are both accepted;
 *   - the writes that leave a reason behind on an open deal — the approver's
 *     rejection clearing `requested_status`, and an ordinary edit of a row
 *     that held a reason before this rule — are NOT refused: the rule judges
 *     the value a write picks, not one it carries along unchanged.
 */

type Row = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let accountId: string;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  await verify.signIn();
  rep = await signUpPerson(verify, 'rep@opportunity-close-reason.test', {
    name: 'Reason Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Reason Co', owner_id: rep.id }]);
  accountId = String(account!.id);
}, 120_000);

const openDeal = async (extra: Row = {}): Promise<string> => {
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Reason Deal ${++k}`, stage: 'negotiation', amount: 100, close_date: '2030-06-30',
    crm_account: accountId, owner_id: rep.id, ...extra,
  }]);
  return String(deal!.id);
};

const asRep = (id: string, patch: Row) =>
  verify.hooks.run('crm_opportunity', 'update', { id, ...patch }, { as: rep.token });

const read = async (id: string): Promise<Row> =>
  (await verify.kernel.getService<Row>('objectql').findOne('crm_opportunity', { where: { id }, context: { isSystem: true } })) as Row;

describe('close reasons on an open deal (#2592)', () => {
  it('refuses a loss reason on an open deal', async () => {
    const id = await openDeal();
    await expect(asRep(id, { loss_reason: 'competitor' })).rejects.toThrow(/loss_reason|competitor|option/i);
    expect((await read(id)).loss_reason ?? null).toBeNull();
  });

  it('refuses a win reason on an open deal', async () => {
    const id = await openDeal();
    await expect(asRep(id, { win_reason: 'best_fit' })).rejects.toThrow(/win_reason|best_fit|option/i);
  });

  it('accepts closing as Lost with a reason', async () => {
    const id = await openDeal();
    await asRep(id, { stage: 'closed_lost', loss_reason: 'competitor' });
    const row = await read(id);
    expect(row.stage).toBe('closed_lost');
    expect(row.loss_reason).toBe('competitor');
  });

  it('accepts a win reason sent with a request to close as Won', async () => {
    const id = await openDeal();
    await asRep(id, { requested_status: 'closed_won', win_reason: 'best_fit' });
    expect((await read(id)).win_reason).toBe('best_fit');
  });

  it('does not refuse the rejection that clears the request and leaves the reason', async () => {
    const id = await openDeal();
    await asRep(id, { requested_status: 'closed_won', win_reason: 'best_fit' });
    // What the status-change flow's `clear_request` writes on a rejection.
    await systemUpdate(verify, 'crm_opportunity', { id, status_change_approval_status: 'rejected', requested_status: null });
    const row = await read(id);
    expect(row.requested_status ?? null).toBeNull();
  });

  it('does not refuse an ordinary edit of an open row that already holds a reason', async () => {
    // A row from before this rule: an open deal holding a reason. No write can
    // put one there now, so the row is made the way the rule leaves room for:
    // closed as Lost with its reason, then moved back to an open stage by a
    // system write that does not send the reason (the engine judges only the
    // values a write sends, `pickedGatedOptions` in @objectstack/objectql).
    const id = await openDeal({ stage: 'closed_lost', loss_reason: 'timing' });
    await systemUpdate(verify, 'crm_opportunity', { id, stage: 'negotiation' });
    expect((await read(id)).stage).toBe('negotiation');
    expect((await read(id)).loss_reason).toBe('timing');
    await asRep(id, { amount: 250 });
    const row = await read(id);
    expect(row.amount).toBe(250);
    expect(row.loss_reason).toBe('timing');
  });
});
