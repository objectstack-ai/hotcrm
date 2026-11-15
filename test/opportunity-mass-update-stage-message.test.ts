// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * What a rep reads when Update Stage moves only part of a selection (#2511).
 *
 * Before: the rejection listed record ids and the engine's hook wrapper text
 * ("hook 'opportunity_lifecycle' threw: Error: …") and always ended with "re-run
 * the action to retry", even for a closed deal that answers the same every time.
 *
 * Now, through the action door as the console calls it:
 * - each refusal's own sentence, which names the deal and is already in the
 *   caller's language (the sales refusal catalogue, #2509);
 * - a deal that did not move without such a sentence, by its name;
 * - a deal that is gone or invisible, counted, never by id;
 * - how many did and did not move, since the rows that moved keep their stage;
 * - the retry line only when a re-run could change the answer.
 *
 * Locale route: a script action body is given no locale on 18.5.0
 * (`ctx.session` carries userId, organizationId and positions), so only the
 * refusal sentences follow the caller's locale; the body's own lines are
 * English.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let k = 0;
const PACKAGE = 'test.opportunity-mass-update-stage-message';
/** A deal whose next update this file's hook fails with a plain Error (a fault, not a refusal). */
const faulty = new Set<string>();

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@mass-update-stage-message.test', {
    name: 'Stage Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  verify.kernel.getService<Rec>('objectql').registerHook('beforeUpdate', async (ctx: Rec) => {
    const id = ctx.input?.id ?? ctx.input?.data?.id ?? ctx.previous?.id;
    if (ctx.object !== 'crm_opportunity' || !faulty.has(id)) return;
    faulty.delete(id);
    throw new Error('simulated storage fault');
  }, { object: 'crm_opportunity', priority: 50, packageId: PACKAGE });
}, 180_000);

afterAll(() => {
  verify?.kernel.getService<Rec>('objectql').unregisterHooksByPackage?.(PACKAGE);
});

const deals = async (): Promise<{ open: Rec; won: Rec }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Stage Co ${++k}`, owner_id: rep.id }]);
  const [open, won] = await verify.seed('crm_opportunity', [
    { name: `Open Deal ${k}`, stage: 'prospecting', amount: 1_000, close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id },
    {
      name: `Won Deal ${k}`, stage: 'closed_won', amount: 1_000, close_date: '2026-06-30', crm_account: account!.id,
      owner_id: rep.id, win_reason: 'better_price',
    },
  ]);
  return { open: open!, won: won! };
};

const updateStage = async (ids: string[], locale = 'en'): Promise<{ status: number; error: Rec }> => {
  const res = await verify.raw('/api/v1/actions/crm_opportunity/mass_update_stage', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${rep.token}`, 'accept-language': locale },
    body: JSON.stringify({ params: { stage: 'negotiation', _selectedIds: ids } }),
  });
  const body = (await res.json()) as Rec;
  return { status: res.status, error: body.error ?? {} };
};

const stageOf = async (id: string): Promise<string> => (await verify.rows('crm_opportunity', { id }))[0]!.stage;

const RETRY = 'Run Update Stage on the selection again to retry the ones that did not move.';

describe('Update Stage over a selection with a closed deal (#2511)', () => {
  it('names the closed deal by its refusal, keeps the move it made, and offers no retry', async () => {
    const { open, won } = await deals();
    const { status, error } = await updateStage([won.id, open.id]);
    expect(status, JSON.stringify(error)).toBe(409);
    expect(error.code).toBe('RECORD_LOCKED');
    expect(error.userMessage).toBe([
      `Opportunity Won Deal ${k} is closed (Closed Won); only its Description and Next Steps can still be edited.`,
      '1 of 2 selected opportunities did not move to the new stage; 1 did.',
    ].join('\n'));
    // The console's bulk result dialog prints `message`, so it reads the same.
    expect(error.message).toBe(error.userMessage.replace(/\n/g, ' '));
    for (const text of [error.message, error.userMessage]) {
      expect(text).not.toContain(won.id);
      expect(text).not.toContain(open.id);
      expect(text).not.toMatch(/hook '|threw|mass_update_stage|retry/);
    }
    expect(await stageOf(open.id), 'the open deal moved').toBe('negotiation');
    expect(await stageOf(won.id), 'the closed deal stayed').toBe('closed_won');
  });

  it('carries the refusal in the caller’s language', async () => {
    const { open, won } = await deals();
    const { status, error } = await updateStage([won.id, open.id], 'zh-CN');
    expect(status, JSON.stringify(error)).toBe(409);
    expect(error.userMessage).toBe([
      `商机Won Deal ${k}已关闭（成交）；只能修改它的描述和下一步。`,
      '1 of 2 selected opportunities did not move to the new stage; 1 did.',
    ].join('\n'));
    expect(await stageOf(open.id)).toBe('negotiation');
  });
});

describe('Update Stage over a selection with a deal that is gone (#2511)', () => {
  it('counts it without an id, and offers no retry', async () => {
    const { open } = await deals();
    const gone = 'opp_deleted_between_select_and_submit';
    const { status, error } = await updateStage([gone, open.id]);
    expect(status, JSON.stringify(error)).toBe(404);
    expect(error.userMessage).toBe([
      '1 selected opportunity no longer exists or is not visible to you.',
      '1 of 2 selected opportunities did not move to the new stage; 1 did.',
    ].join('\n'));
    expect(error.message).not.toContain(gone);
    expect(await stageOf(open.id)).toBe('negotiation');
  });
});

describe('Update Stage over a selection where a write faults (#2511)', () => {
  it('names the deal, keeps the engine text out, and offers the retry', async () => {
    const { open } = await deals();
    const [account] = await verify.seed('crm_account', [{ name: `Fault Co ${k}`, owner_id: rep.id }]);
    const [other] = await verify.seed('crm_opportunity', [{
      name: `Fault Deal ${k}`, stage: 'prospecting', amount: 1_000, close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id,
    }]);
    faulty.add(other!.id);
    const { status, error } = await updateStage([other!.id, open.id]);
    expect(faulty.has(other!.id), 'the fault hook never fired').toBe(false);
    expect(status, JSON.stringify(error)).toBeGreaterThanOrEqual(400);
    expect(error.userMessage).toBe([
      `Opportunity Fault Deal ${k} did not move to the new stage.`,
      '1 of 2 selected opportunities did not move to the new stage; 1 did.',
      RETRY,
    ].join('\n'));
    expect(error.message).not.toMatch(/simulated storage fault|hook '/);
    expect(await stageOf(open.id)).toBe('negotiation');
    // The re-run the line offers does move it.
    const again = await verify.raw('/api/v1/actions/crm_opportunity/mass_update_stage', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${rep.token}` },
      body: JSON.stringify({ params: { stage: 'negotiation', _selectedIds: [other!.id, open.id] } }),
    });
    expect(again.status, await again.clone().text()).toBe(200);
    expect(await stageOf(other!.id)).toBe('negotiation');
  });
});
