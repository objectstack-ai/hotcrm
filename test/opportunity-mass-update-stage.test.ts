// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { Opportunity } from '../src/sales/objects/opportunity.object';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * Update Stage on the opportunity list (#2586, #2587, #2588, #2589).
 *
 * Before: one aggregate dispatch into a script body. A body runs
 * system-elevated, so it moved deals the caller could only read and deals an
 * approval had locked (#2586); the bar reported its one rejection as N
 * failures with English summary lines (#2587, #2588); and the dialog offered
 * Closed Won / Closed Lost, which the dialog cannot collect a reason for
 * (#2589).
 *
 * Now: a declared write (`operation: 'update'`, no body), dispatched once per
 * row. The platform action door writes the collected stage AS THE CALLER, so
 * the caller's row access, the approval lock and the object's hooks decide
 * each row exactly as for a `PATCH`. These cases go through that door
 * (`verify.actions.run`, the console's own route).
 */

type Rec = Record<string, any>;

const action = ((stack as Rec).actions as Rec[]).find((a) => a.name === 'mass_update_stage')!;

describe('Update Stage is a declared write (#2586)', () => {
  it('declares the write and has no body', () => {
    expect(action, 'no mass_update_stage action').toBeTruthy();
    expect(action.operation).toBe('update');
    expect(action.body, 'a body runs system-elevated and skips the caller\'s permissions (#2586)').toBeUndefined();
    expect(action.execution).toBe('perRecord');
  });

  it('is offered only to a user who may edit opportunities', () => {
    const visible = action.visible;
    const source = typeof visible === 'string' ? visible : visible?.source;
    expect(source).toBe(`current_user.can('crm_opportunity', 'edit')`);
  });

  it('offers exactly the open stages, in field order (#2589)', () => {
    const param = (action.params as Rec[]).find((p) => p.name === 'stage')!;
    const open = Opportunity.fields.stage.options!
      .filter((o) => (o.kind ?? 'open') === 'open')
      .map((o) => String(o.value));
    expect((param.options as Rec[]).map((o) => String(o.value))).toEqual(open);
    expect(open).not.toContain('closed_won');
    expect(open).not.toContain('closed_lost');
  });
});

describe('through the action door, as the caller (#2586)', () => {
  let verify: VerifyStack;
  let rep: Person;
  let other: Person;
  let accountId: string;
  let k = 0;

  beforeAll(async () => {
    verify = await hotcrmStack();
    rep = await signUpPerson(verify, 'rep@mass-update-stage.test', {
      name: 'Stage Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    other = await signUpPerson(verify, 'other@mass-update-stage.test', {
      name: 'Other Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    const [account] = await verify.seed('crm_account', [{ name: 'Stage Co', owner_id: rep.id, approval_status: 'approved' }]);
    accountId = String(account!.id);
  }, 180_000);

  const deal = async (doc: Rec = {}): Promise<string> => {
    const [row] = await verify.seed('crm_opportunity', [{
      name: `Stage Deal ${++k}`, stage: 'prospecting', amount: 1_000, close_date: '2030-06-30',
      crm_account: accountId, owner_id: rep.id, ...doc,
    }]);
    return String(row!.id);
  };
  const stageOf = async (id: string): Promise<string> =>
    String((await verify.rows('crm_opportunity', { id }))[0]!.stage);
  const run = (who: Person, recordId: string, stage: string) =>
    verify.actions.run('crm_opportunity', 'mass_update_stage', { as: who.token, recordId, params: { stage } });
  const refusal = (p: Promise<unknown>): Promise<Rec> => p.then(() => ({}), (e: Rec) => e);

  it('moves a deal the caller may edit', async () => {
    const id = await deal();
    await run(rep, id, 'needs_analysis');
    expect(await stageOf(id)).toBe('needs_analysis');
  });

  it('refuses a deal the caller may not edit, and leaves it where it was', async () => {
    // A rep's grant is own-scope: another rep's deal is out of reach, as it
    // is for the record page's own edit.
    const id = await deal();
    const err = await refusal(run(other, id, 'proposal'));
    expect([403, 404]).toContain(err.status);
    expect(await stageOf(id)).toBe('prospecting');
  });

  it('refuses a deal an approval has locked, and leaves it where it was', async () => {
    // Raising a deal across the large-deal line opens `opportunity_approval`,
    // whose review node locks the record (`lockRecord: true`).
    const id = await deal({ stage: 'proposal', amount: 42_000 });
    await verify.hooks.run('crm_opportunity', 'update', { id, amount: 120_000 }, { as: rep.token });
    const pending = (await verify.rows('sys_approval_request', { record_id: id })).filter((r) => r.status === 'pending');
    expect(pending, 'the large-deal approval did not open').toHaveLength(1);
    const err = await refusal(run(rep, id, 'negotiation'));
    expect(err.code).toBe('RECORD_LOCKED');
    expect(await stageOf(id)).toBe('proposal');
  });

  it('refuses a closing stage from every caller, not only in the dialog (#2589)', async () => {
    const id = await deal();
    for (const stage of ['closed_won', 'closed_lost']) {
      const err = await refusal(run(rep, id, stage));
      expect(err.status, `${stage} got through the params gate`).toBe(400);
    }
    expect(await stageOf(id)).toBe('prospecting');
  });
});
