// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import { REFUSAL_CODES } from '../src/sales/objects/_refusal';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

/**
 * A settled quote offers only what it can still take (#2366 rows 2 and 3).
 *
 * Measured on 18.2.0 before this change (#2320 Revenue S7, S10): an accepted
 * quote still offered Edit and a New on its line items, and both ended in
 * `quote_workflow`'s refusal at save; the New Quote form offered Accepted,
 * Rejected and Expired, and a rep's REST create at any of them answered 201.
 *
 * Two halves, both pinned, because a hidden button is not a guard:
 *
 *  - the OFFER — `crm_quote.userActions.edit`, `crm_quote_line_item`'s
 *    `userActions.create` (evaluated against the host quote on its related
 *    list) and the settled options' `visibleWhen`, evaluated here on the
 *    platform's CEL engine against the records the console binds;
 *  - the GUARD — `quote_workflow` refuses a user's create at a settled status
 *    and a user's edit of a Rejected quote's fields and lines, and lets a
 *    Rejected quote move back to Draft, where it is revised.
 *
 * Settled is Accepted, Rejected and Expired (the card's reading). Rejected is
 * not terminal: its one way on is Revise (`revise_quote`), so the freeze keeps
 * its status writable and nothing else.
 */

type Rec = Record<string, any>;

const objects: Rec[] = (stack as Rec).objects ?? [];
const objectNamed = (name: string): Rec => {
  const o = objects.find((x) => x.name === name);
  if (!o) throw new Error(`no ${name} object registered`);
  return o;
};

/** Evaluate a predicate as the console does: the record in scope as `record`. */
const holds = (predicate: unknown, record: Rec): boolean => {
  const result = ExpressionEngine.evaluate<boolean>(predicate as never, { record });
  expect(result.ok, `predicate did not evaluate on ${JSON.stringify(record)}: ${JSON.stringify(result)}`).toBe(true);
  return (result as Rec).value === true;
};

const SETTLED = ['accepted', 'rejected', 'expired'] as const;
const OPEN = ['draft', 'in_review', 'presented'] as const;

describe('the offer: no Edit and no line New on a settled quote', () => {
  const editWhen = (): unknown => objectNamed('crm_quote').userActions?.edit?.visibleWhen;
  const newLineWhen = (): unknown => objectNamed('crm_quote_line_item').userActions?.create?.visibleWhen;

  it('declares both predicates', () => {
    expect(editWhen(), 'crm_quote.userActions.edit.visibleWhen').toBeTruthy();
    expect(newLineWhen(), 'crm_quote_line_item.userActions.create.visibleWhen').toBeTruthy();
  });

  it.each(SETTLED)('hides Edit, and New on the lines, on an %s quote', (status) => {
    expect(holds(editWhen(), { status })).toBe(false);
    expect(holds(newLineWhen(), { status }), 'the related list binds the HOST quote').toBe(false);
  });

  it.each(OPEN)('CONTROL — offers both on a %s quote', (status) => {
    expect(holds(editWhen(), { status })).toBe(true);
    expect(holds(newLineWhen(), { status })).toBe(true);
  });

  it('is total: a record with no status yet (the first render) offers Edit', () => {
    expect(holds(editWhen(), {})).toBe(true);
  });
});

describe('the offer: a new quote starts unsettled', () => {
  const options = (): Rec[] => objectNamed('crm_quote').fields.status.options;

  it.each(SETTLED)('withholds %s on the New form (no created_at yet) and offers it on a stored quote', (value) => {
    const option = options().find((o) => o.value === value)!;
    expect(holds(option.visibleWhen, { name: 'New quote' }), 'offered on the New form').toBe(false);
    expect(holds(option.visibleWhen, { created_at: '2026-01-01T00:00:00.000Z', status: 'presented' })).toBe(true);
  });

  it.each(OPEN)('CONTROL — %s carries no predicate and is offered on both', (value) => {
    expect(options().find((o) => o.value === value)!.visibleWhen).toBeUndefined();
  });
});

let verify: VerifyStack;
let rep: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@quote-settled-actions.test', {
    name: 'Settle Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 180_000);

const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const refusalOf = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);

/** An account and contact the rep owns, so the rep may write quotes on it. */
const customer = async (): Promise<{ account: Rec; contact: Rec }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Settle Co ${++k}`, owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Sam', last_name: `Settle ${k}`, email: `sam${k}@quote-settled-actions.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  return { account: account!, contact: contact! };
};

const quoteBody = (c: { account: Rec; contact: Rec }, status: string): Rec => ({
  name: `Settle Quote ${++k}`, crm_account: c.account.id, crm_contact: c.contact.id, status,
  quote_date: '2026-01-01', expiration_date: '2030-12-31', discount: 0, tax: 0, shipping_handling: 0,
});

describe('the guard: a user cannot create a quote at a settled status', () => {
  it.each(SETTLED)('refuses a rep creating a quote as %s, through the REST door, and stores nothing', async (status) => {
    const c = await customer();
    const body = quoteBody(c, status);
    const res = await verify.apiAs(rep.token, 'POST', '/data/crm_quote', body);
    const answer = (await res.json()) as Rec;
    expect({ status: res.status, code: answer.code }, JSON.stringify(answer)).toEqual({
      status: REFUSAL_CODES.invalid_value.status, code: REFUSAL_CODES.invalid_value.code,
    });
    const label = { accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired' }[status];
    expect(answer.userMessage).toBe(
      `Quote ${body.name} cannot be created as ${label}. A quote starts as Draft, In Review or Presented, and is accepted, rejected or expired from there.`,
    );
    expect(await verify.rows('crm_quote', { name: body.name })).toHaveLength(0);
  });

  it.each(OPEN)('CONTROL — a rep still creates a quote as %s', async (status) => {
    const c = await customer();
    const created = await verify.hooks.run('crm_quote', 'insert', quoteBody(c, status), { as: rep.token });
    expect((await stored('crm_quote', created.id)).status).toBe(status);
  });

  it('CONTROL — a system write still stores a settled quote (the seed carries settled history)', async () => {
    const c = await customer();
    const [row] = await verify.seed('crm_quote', [{ ...quoteBody(c, 'accepted'), owner_id: rep.id }]);
    expect((await stored('crm_quote', row!.id)).status).toBe('accepted');
  });
});

describe('the guard: a Rejected quote is revised at Draft, not in place', () => {
  /** A rep's quote with one line, then rejected the way the app rejects it. */
  const rejectedQuote = async (): Promise<{ quote: Rec; line: Rec; product: Rec }> => {
    const c = await customer();
    const quote = await verify.hooks.run('crm_quote', 'insert', quoteBody(c, 'draft'), { as: rep.token });
    const [product] = await verify.seed('crm_product', [{ name: `Settle Product ${k}`, product_code: `ST-${k}`, is_active: true, list_price: 100 }]);
    const line = await verify.hooks.run('crm_quote_line_item', 'insert', {
      crm_quote: quote.id, crm_product: product!.id, quantity: 2, unit_price: 100,
    }, { as: rep.token });
    await systemUpdate(verify, 'crm_quote', { id: quote.id, status: 'rejected' });
    return { quote: await stored('crm_quote', quote.id), line, product: product! };
  };

  it('refuses a rep changing its fields, naming the way out', async () => {
    const { quote } = await rejectedQuote();
    const err = await refusalOf(verify.hooks.run('crm_quote', 'update', { id: quote.id, discount: 5 }, { as: rep.token }));
    expect([err?.code, err?.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    expect(err!.userMessage).toBe(
      `Quote ${quote.quote_number} - ${quote.name} is Rejected; revise it back to Draft to change it. Until then only its Internal Notes can be edited.`,
    );
    expect(Number((await stored('crm_quote', quote.id)).discount)).toBe(0);
  });

  it('refuses a rep adding a line to it', async () => {
    const { quote, product } = await rejectedQuote();
    const err = await refusalOf(verify.hooks.run('crm_quote_line_item', 'insert', {
      crm_quote: quote.id, crm_product: product.id, quantity: 1, unit_price: 100,
    }, { as: rep.token }));
    expect([err?.code, err?.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    expect(err!.userMessage).toBe(
      `Quote ${quote.quote_number} - ${quote.name} is Rejected, so its line items can no longer be added, changed or removed. Revise it back to Draft to change them.`,
    );
    expect(await verify.rows('crm_quote_line_item', { crm_quote: quote.id })).toHaveLength(1);
  });

  it('lets the rep move it back to Draft, and then revise its numbers and lines', async () => {
    const { quote, line } = await rejectedQuote();
    await verify.hooks.run('crm_quote', 'update', { id: quote.id, status: 'draft' }, { as: rep.token });
    await verify.hooks.run('crm_quote', 'update', { id: quote.id, discount: 5 }, { as: rep.token });
    await verify.hooks.run('crm_quote_line_item', 'update', { id: line.id, quantity: 3 }, { as: rep.token });
    const after = await stored('crm_quote', quote.id);
    expect(after.status).toBe('draft');
    expect(Number(after.discount)).toBe(5);
    expect(Number((await stored('crm_quote_line_item', line.id)).quantity)).toBe(3);
  });

  it('still takes its Internal Notes in place', async () => {
    const { quote } = await rejectedQuote();
    await verify.hooks.run('crm_quote', 'update', { id: quote.id, internal_notes: 'Customer wants a 3-year term.' }, { as: rep.token });
    expect((await stored('crm_quote', quote.id)).internal_notes).toBe('Customer wants a 3-year term.');
  });
});
