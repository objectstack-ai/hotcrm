// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * The quote's lifecycle actions (#2366 row 9).
 *
 * Measured on 18.2.0 before them (#2320 Revenue S3): a quote's status moved
 * only through Edit and the Status dropdown. Now each step of
 * `quote_status_progression` has a button, offered only where the step leaves
 * from (`src/revenue/actions/quote.actions.ts`).
 *
 * What is pinned:
 *
 *  - the MACHINE AGREES: every status an action is offered on, read off its
 *    `visible` by evaluating it, is a status its patch is a declared move
 *    from — and every declared move but `→ expired` (the sweep's) has an
 *    action. The machine is read off the object, so a change to either side
 *    that the other does not follow turns this red;
 *  - the OFFER follows the grant: a persona whose sets may not edit a quote is
 *    offered none of them, by the effective permissions the server publishes;
 *  - the WRITE is the caller's: a rep walks their own quote through Submit,
 *    Mark Presented and Accept, and Reject and Revise, through the action door
 *    the console posts to; another rep, who may not edit that quote, moves
 *    nothing.
 */

type Rec = Record<string, any>;

const ACTIONS = ['submit_quote_for_review', 'mark_quote_presented', 'accept_quote', 'reject_quote', 'revise_quote'] as const;
const STATUSES = ['draft', 'in_review', 'presented', 'accepted', 'rejected', 'expired'] as const;

const actions: Rec[] = (stack as Rec).actions ?? [];
const actionNamed = (name: string): Rec => {
  const a = actions.find((x) => x.name === name);
  if (!a) throw new Error(`no ${name} action registered`);
  return a;
};
const quote: Rec = ((stack as Rec).objects as Rec[]).find((o) => o.name === 'crm_quote')!;
const machine: Record<string, string[]> =
  (quote.validations as Rec[]).find((v) => v.name === 'quote_status_progression')!.transitions;

/** Evaluate an action's `visible` the way the console does. */
const offered = (name: string, record: Rec, permissions: Rec = { crm_quote: { allowEdit: true } }): boolean => {
  const result = ExpressionEngine.evaluate<boolean>(actionNamed(name).visible, {
    user: { id: 'u1', positions: [] }, record, permissions: permissions as never,
  });
  expect(result.ok, `${name}.visible did not evaluate: ${JSON.stringify(result)}`).toBe(true);
  return (result as Rec).value === true;
};
const fromStatuses = (name: string): string[] => STATUSES.filter((status) => offered(name, { status }));

describe('each action is a declared step of the quote machine', () => {
  it.each(ACTIONS)('%s is a declarative update of the status alone, offered only where its move is declared', (name) => {
    const action = actionNamed(name);
    expect(action.operation).toBe('update');
    expect(Object.keys(action.patch)).toEqual(['status']);
    const to = action.patch.status as string;
    const from = fromStatuses(name);
    expect(from.length, `${name} is offered on no status`).toBeGreaterThan(0);
    for (const status of from) expect(machine[status], `${name}: ${status} → ${to} is not a declared move`).toContain(to);
  });

  it('every declared move but the expiry sweep has its action', () => {
    const covered = new Set(ACTIONS.flatMap((name) => fromStatuses(name).map((from) => `${from}→${actionNamed(name).patch.status}`)));
    const declared = Object.entries(machine).flatMap(([from, tos]) => tos.filter((to) => to !== 'expired').map((to) => `${from}→${to}`));
    expect(declared.filter((move) => !covered.has(move))).toEqual([]);
  });

  it.each(ACTIONS)('%s is withheld before the record has loaded, and names the quote when it succeeds', (name) => {
    expect(offered(name, {})).toBe(false);
    const message = actionNamed(name).successMessage;
    expect(String(message?.source ?? message)).toContain('{{ record.display_title }}');
  });

  it('only Accept asks first: it cannot be walked back from the quote', () => {
    expect(ACTIONS.filter((name) => actionNamed(name).confirmText)).toEqual(['accept_quote']);
  });
});

let verify: VerifyStack;
let rep: Person;
let otherRep: Person;
let marketer: Person;
let agent: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@quote-lifecycle.test', {
    name: 'Life Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  otherRep = await signUpPerson(verify, 'other@quote-lifecycle.test', {
    name: 'Other Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  marketer = await signUpPerson(verify, 'mkt@quote-lifecycle.test', {
    name: 'Life Marketer', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
  agent = await signUpPerson(verify, 'agent@quote-lifecycle.test', {
    name: 'Life Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
}, 180_000);

const permissionsOf = async (p: Person): Promise<Rec> => {
  const res = await verify.apiAs(p.token, 'GET', '/auth/me/permissions');
  expect(res.status, await res.clone().text()).toBe(200);
  const body: Rec = await res.json();
  return (body.data ?? body).objects;
};

describe('the offer follows the grant to edit a quote', () => {
  it('is made to a rep, on the statuses each step leaves from', async () => {
    const permissions = await permissionsOf(rep);
    expect(offered('submit_quote_for_review', { status: 'draft' }, permissions)).toBe(true);
    expect(offered('accept_quote', { status: 'presented' }, permissions)).toBe(true);
  });

  it.each([['marketing_user', () => marketer], ['service_agent', () => agent]] as const)(
    'is withheld from a %s, whose sets may not edit a quote',
    async (_name, who) => {
      const permissions = await permissionsOf(who());
      for (const name of ACTIONS) {
        for (const status of STATUSES) expect(offered(name, { status }, permissions), `${name} on ${status}`).toBe(false);
      }
    },
  );
});

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_quote', { id }))[0]!;
const run = (name: string, id: string, who: Person = rep): Promise<unknown> =>
  verify.actions.run('crm_quote', name, { as: who.token, recordId: id });

/** A draft quote on an account and contact the rep owns. */
const draftQuote = async (): Promise<Rec> => {
  const [account] = await verify.seed('crm_account', [{ name: `Life Co ${++k}`, owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Lia', last_name: `Life ${k}`, email: `lia${k}@quote-lifecycle.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  return verify.hooks.run('crm_quote', 'insert', {
    name: `Life Quote ${k}`, crm_account: account!.id, crm_contact: contact!.id, status: 'draft',
    quote_date: '2026-01-01', expiration_date: '2030-12-31', discount: 0, tax: 0, shipping_handling: 0,
  }, { as: rep.token });
};

describe('the write is the caller’s', () => {
  it('walks a quote from Draft to Accepted, one step per action', async () => {
    const q = await draftQuote();
    await run('submit_quote_for_review', q.id);
    expect((await stored(q.id)).status).toBe('in_review');
    await run('mark_quote_presented', q.id);
    expect((await stored(q.id)).status).toBe('presented');
    await run('accept_quote', q.id);
    expect((await stored(q.id)).status).toBe('accepted');
  });

  it('rejects a presented quote, and Revise takes it back to Draft', async () => {
    const q = await draftQuote();
    await run('submit_quote_for_review', q.id);
    await run('mark_quote_presented', q.id);
    await run('reject_quote', q.id);
    expect((await stored(q.id)).status).toBe('rejected');
    await run('revise_quote', q.id);
    expect((await stored(q.id)).status).toBe('draft');
  });

  it('moves nothing for a rep who may not edit the quote', async () => {
    const q = await draftQuote();
    const err = (await run('submit_quote_for_review', q.id, otherRep).then(() => null, (e: Rec) => e)) as Rec | null;
    expect(err, 'another rep moved a quote they cannot edit').toBeTruthy();
    expect([err!.code, err!.status]).toEqual(['RECORD_NOT_FOUND', 404]);
    expect((await stored(q.id)).status).toBe('draft');
  });
});
