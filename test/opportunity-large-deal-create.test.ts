// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { REFUSAL_CODES } from '../src/sales/objects/_refusal';
import { LARGE_DEAL_AMOUNT } from '../src/sales/objects/_thresholds';
import { allHooks } from '../objectstack.composition';
import { hotcrmStack, signUpPerson, systemInsert, runShippedHook, type Person } from './helpers/verify-stack';

/**
 * A deal of `LARGE_DEAL_AMOUNT` or more CREATED at Closed Won (#2387).
 *
 * Ruling B (#2350) refuses a user's MOVE to `closed_won` unless the Large Deal
 * Approval is `approved`, and judged updates only. Measured on 18.2.0 before
 * this change, a rep's create of a 250,000 deal already at Closed Won was
 * accepted through every door (REST 201, JSON and CSV import `created`, the
 * console New form 201), stored at `not_required`, and opened no request.
 *
 * Maintainer ruling (2026-11-02, 「只拦非管理员」): refuse that create for
 * every user but an administrator, who can still load historical won deals.
 * The administrator is told by the platform's built-in identities in
 * `ctx.session.positions` (`platform_admin`, `org_owner`, `org_admin`); the
 * comment above the refusal in `opportunity.hook.ts` carries the measurement.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let admin: string;
let accountId: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@opportunity-large-deal-create.test', {
    name: 'Create Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  // The dev admin: the platform projects `platform_admin` and `org_owner` into its positions.
  admin = await verify.signIn();
  const [account] = await verify.seed('crm_account', [{ name: 'Large Create Co', owner_id: rep.id, approval_status: 'approved' }]);
  accountId = String(account!.id);
}, 180_000);

const deal = (over: Rec = {}): Rec => ({
  name: `Large Create Deal ${++k}`, stage: 'closed_won', amount: 250_000, close_date: '2026-10-01',
  crm_account: accountId, win_reason: 'best_fit', ...over,
});
const byName = (name: string): Promise<Rec[]> => verify.rows('crm_opportunity', { name });
const create = async (token: string, doc: Rec): Promise<{ status: number; body: Rec }> => {
  const res = await verify.apiAs(token, 'POST', '/data/crm_opportunity', doc);
  return { status: res.status, body: (await res.json()) as Rec };
};

describe('creating a large deal already Closed Won — opportunity_lifecycle (#2387)', () => {
  it('refuses a rep\'s REST create, with the update refusal\'s envelope, and stores nothing', async () => {
    const doc = deal();
    const { status, body } = await create(rep.token, doc);
    expect(status, 'a rep created a large deal already won with no approval').toBe(REFUSAL_CODES.locked.status);
    expect(body.error?.code ?? body.code).toBe(REFUSAL_CODES.locked.code);
    expect(await byName(doc.name)).toHaveLength(0);
  });

  it('refuses it at the line itself: a deal at exactly LARGE_DEAL_AMOUNT is large', async () => {
    const doc = deal({ amount: LARGE_DEAL_AMOUNT });
    expect((await create(rep.token, doc)).status).toBe(REFUSAL_CODES.locked.status);
    expect(await byName(doc.name)).toHaveLength(0);
  });

  it('refuses a rep\'s import row the same way', async () => {
    const doc = deal();
    const res = await verify.apiAs(rep.token, 'POST', '/data/crm_opportunity/import', { format: 'json', rows: [doc] });
    const body = (await res.json()) as Rec;
    expect(body.created, 'a rep imported a large deal already won').toBe(0);
    expect(body.results?.[0]?.ok).toBe(false);
    expect(await byName(doc.name)).toHaveLength(0);
  });

  it('accepts an administrator\'s create, so historical won deals can still be loaded', async () => {
    const doc = deal();
    expect((await create(admin, doc)).status).toBe(201);
    const [stored] = await byName(doc.name);
    expect(stored).toMatchObject({ stage: 'closed_won', amount: 250_000 });
  });

  it('accepts an organization admin\'s create: a member promoted to admin, no other grant', async () => {
    const token = await verify.signUp('org.admin@opportunity-large-deal-create.test', undefined, 'Create Org Admin');
    const { userId } = await verify.contextFor(token);
    const [member] = await verify.rows('sys_member', { user_id: String(userId) });
    const promoted = await verify.apiAs(admin, 'POST', '/auth/organization/update-member-role', { memberId: member!.id, role: 'admin' });
    expect(promoted.status, 'fixture: the dev admin promotes the member').toBe(200);
    expect((await verify.contextFor(token)).positions, 'fixture: the platform projects org_admin').toContain('org_admin');
    const doc = deal();
    expect((await create(token, doc)).status).toBe(201);
    expect((await byName(doc.name))[0]?.stage).toBe('closed_won');
  });

  it('accepts an administrator\'s import of a historical won deal', async () => {
    const doc = deal();
    const res = await verify.apiAs(admin, 'POST', '/data/crm_opportunity/import', { format: 'json', rows: [doc] });
    expect(((await res.json()) as Rec).created).toBe(1);
    expect((await byName(doc.name))[0]?.stage).toBe('closed_won');
  });

  it('accepts a system write (no user): the seed\'s won deals keep loading', async () => {
    const doc = deal();
    await expect(systemInsert(verify, 'crm_opportunity', doc)).resolves.toBeTruthy();
    expect((await byName(doc.name))[0]?.stage).toBe('closed_won');
  });

  it('accepts a rep\'s create under the line, or at an open stage', async () => {
    const small = deal({ amount: LARGE_DEAL_AMOUNT - 1 });
    expect((await create(rep.token, small)).status).toBe(201);
    expect((await byName(small.name))[0]?.stage).toBe('closed_won');
    const open = deal({ stage: 'proposal', win_reason: undefined });
    expect((await create(rep.token, open)).status).toBe(201);
    expect((await byName(open.name))[0]?.stage).toBe('proposal');
  });

  it('exempts the CREATE only: an administrator still cannot move a large deal to Closed Won unapproved', async () => {
    const [open] = await verify.seed('crm_opportunity', [deal({ stage: 'proposal', win_reason: null, owner_id: rep.id })]);
    const res = await verify.apiAs(admin, 'PATCH', `/data/crm_opportunity/${open!.id}`, { stage: 'closed_won', win_reason: 'best_fit' });
    expect(res.status).toBe(REFUSAL_CODES.locked.status);
    expect((await verify.rows('crm_opportunity', { id: open!.id }))[0]?.stage).toBe('proposal');
  });
});

describe('the shipped (lowered, QuickJS) body reads the administrator signal too (#2387)', () => {
  const lifecycle = (allHooks as Rec[]).find((h) => h.name === 'opportunity_lifecycle')!;

  it('refuses the rep and lets the administrator through', async () => {
    const err = await runShippedHook(verify, lifecycle, { event: 'beforeInsert', input: deal(), as: rep.token }).then(() => null, (e: Rec) => e);
    expect(err, 'the lowered body let a rep create a large deal already won').toBeTruthy();
    expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    await expect(runShippedHook(verify, lifecycle, { event: 'beforeInsert', input: deal(), as: admin })).resolves.toBeTruthy();
  });
});
