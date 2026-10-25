// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * A sales rep reads and joins the Discussion of the records they can read, and
 * of no other (#2029), and deletes comments only where they can edit the
 * record (#2038).
 *
 * ### What was wrong
 *
 * Measured on a fresh `pnpm dev` box (`@objectstack/*` 17.7.0), signed in as
 * `na.rep` (`sales_rep` + `na_sales_team`): the record page's Discussion panel
 * said "You don't have permission to view comments on this record." and the
 * same for its activity, and `sys_comment` and `sys_activity` both answered 403
 * `PERMISSION_DENIED` to every read and to a post. Both are objects like any
 * other, the platform's member baseline names neither, and no permission set of
 * this app granted them.
 *
 * ### The two halves this file measures together
 *
 * Whether a person may open the panel at all is this app's: the `sys_comment`
 * and `sys_activity` grants on their permission set (canonical note on
 * `enable.feeds` in `src/sales/objects/index.ts`). Which threads it then reaches
 * is the platform's: `plugin-audit` narrows both reads to rows whose parent the
 * caller can read, and refuses a post to a thread whose record the caller
 * cannot read. So the fixture puts one comment and one activity row on a quote
 * the rep reaches through the territory rule and one of each on a quote they
 * cannot reach, and asserts both sides.
 *
 * ### Deleting a comment (#2038)
 *
 * The grant carries delete. The platform takes it only from the comment's
 * author or a person whose by-id update of the parent would be admitted
 * (objectstack-ai/objectstack#24549, in 18.1.0; until that release the bit was
 * held back, because the gate did not yet give that answer). So the fixture
 * adds a contract under the reachable account, which the rep reads and may not
 * edit (`sales_rep` holds no edit on `crm_contract`), and the delete cases
 * assert both sides.
 *
 * The shared boot carries `AuditPlugin`, which owns both objects and their read
 * gates (`test/helpers/verify-stack.ts`), so this file needs no boot of its own.
 */

type AnyRec = Record<string, any>;

const SYS = { isSystem: true } as AnyRec;

let verify: VerifyStack;
/** The rep under test: the positions `pnpm demo:staff` gives `na.rep`. */
let rep: Person;
/** Fixture ids, by role. */
const id: Record<string, string> = {};

/** Insert as the system (the handle's `seed` door), returning the new row's id. */
const insert = async (object: string, doc: AnyRec): Promise<string> => {
  const [row] = await verify.seed(object, [doc]);
  return String(row?.id);
};

const thread = (recordId: string, object = 'crm_quote') => `${object}:${recordId}`;

beforeAll(async () => {
  verify = await hotcrmStack();

  rep = await signUpPerson(verify, 'rep@comments.test', {
    name: 'Discussion Rep', positions: ['sales_rep', 'na_sales_team'],
  });
  id.owner = await insert('sys_user', { name: 'Another Owner', email: 'owner@comments.test' });

  // Two accounts the rep owns neither of: the US one reaches them through
  // `north_america_territory`, the JP one does not. The territory is derived
  // from the address by `account_protection`, so it is left unstated here.
  const account = (name: string, country: string) => insert('crm_account', {
    name, type: 'customer', is_active: true, owner_id: id.owner, billing_address: { country },
  });
  id.acct_US = await account('Comments US Customer', 'US');
  id.acct_JP = await account('Comments JP Customer', 'JP');

  // `crm_quote` is controlled_by_parent under the account, so each quote
  // follows its account's reach.
  const quote = (accountId: string, name: string) => insert('crm_quote', {
    name, crm_account: accountId, owner_id: id.owner, status: 'draft',
    quote_date: '2026-01-01', expiration_date: '2026-02-01',
  });
  id.quote_US = await quote(id.acct_US, 'Comments US Quote');
  id.quote_JP = await quote(id.acct_JP, 'Comments JP Quote');

  // One comment by the owner and one activity row on each quote.
  for (const region of ['US', 'JP'] as const) {
    const quoteId = id[`quote_${region}`];
    id[`cmt_${region}`] = await insert('sys_comment', {
      thread_id: thread(quoteId), author_id: id.owner, author_name: 'Another Owner', body: `${region} pricing note`,
    });
    id[`act_${region}`] = await insert('sys_activity', {
      type: 'updated', summary: `${region} quote updated`, object_name: 'crm_quote', record_id: quoteId, actor_id: id.owner,
    });
  }

  // For the delete cases (#2038): a second owner comment on the reachable
  // quote, and a contract under the reachable account with an owner comment.
  // `crm_contract` is controlled_by_parent, so the rep reads it, and
  // `sales_rep` holds no edit on the object.
  const ownerComment = (threadId: string, body: string) => insert('sys_comment', {
    thread_id: threadId, author_id: id.owner, author_name: 'Another Owner', body,
  });
  id.cmt_US_other = await ownerComment(thread(id.quote_US), 'US discount note');
  id.contact_US = await insert('crm_contact', {
    first_name: 'Ann', last_name: 'Comments', email: 'ann@comments.test', crm_account: id.acct_US, owner_id: id.owner,
  });
  id.contract_US = await insert('crm_contract', {
    crm_account: id.acct_US, crm_contact: id.contact_US, owner_id: id.owner, status: 'draft',
    contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 1000,
  });
  id.cmt_contract_US = await ownerComment(thread(id.contract_US, 'crm_contract'), 'US contract note');

  // The boot backfill ran before this population existed. The sharing service
  // is a kernel service the handle does not front, so it is driven directly.
  const rules: AnyRec = verify.kernel.getService('sharingRules');
  await rules.evaluateRule('north_america_territory', SYS);
}, 120_000);

/** The fixture's own labels for the rows a response carries. */
const fixtureLabels = (records: AnyRec[]): string[] => {
  const byId = new Map(Object.entries(id).map(([label, value]) => [value, label]));
  return records
    .map((r) => byId.get(String(r.id)))
    .filter((label): label is string => label !== undefined)
    .sort();
};

/** One query on the data door, as `token`: its status and the fixture rows it served. */
const query = async (token: string, object: string, filters: unknown[][]) => {
  const res = await verify.apiAs(token, 'POST', `/data/${object}/query`, { filters, top: 500 });
  const body = (await res.json()) as AnyRec;
  return { status: res.status, labels: fixtureLabels(body.records ?? []), body };
};

describe('the fixture discriminates (controls)', () => {
  it('the rep reads the US quote and not the JP one', async () => {
    // The parent-derived gate can only be seen if the parents differ in reach.
    expect(await verify.rows('crm_quote', { id: id.quote_US }, { as: rep.token })).toHaveLength(1);
    expect(await verify.rows('crm_quote', { id: id.quote_JP }, { as: rep.token })).toHaveLength(0);
  });

  it('the rep reads the US contract and may not update it', async () => {
    // The delete cases tell "may edit the record" from "may read it" only if
    // one parent is readable and not editable.
    expect(await verify.rows('crm_contract', { id: id.contract_US }, { as: rep.token })).toHaveLength(1);
    const res = await verify.apiAs(rep.token, 'PATCH', `/data/crm_contract/${id.contract_US}`, { contract_value: 2 });
    expect(res.status, await res.clone().text()).toBe(403);
  });

  it('both quotes carry a comment and an activity row', async () => {
    expect(fixtureLabels(await verify.rows('sys_comment', { thread_id: { $in: [thread(id.quote_US), thread(id.quote_JP)] } })))
      .toEqual(['cmt_JP', 'cmt_US', 'cmt_US_other']);
    expect(fixtureLabels(await verify.rows('sys_activity', { object_name: 'crm_quote' }))).toEqual(['act_JP', 'act_US']);
  });
});

describe('a sales rep and the Discussion panel of a quote (#2029)', () => {
  it('lists the comments of a quote they can read, and of no other', async () => {
    const res = await verify.apiAs(rep.token, 'GET', '/data/sys_comment');
    const body = (await res.json()) as AnyRec;
    // Before #2029: 403 PERMISSION_DENIED, the panel's "view comments" refusal.
    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(fixtureLabels(body.records ?? [])).toEqual(['cmt_US', 'cmt_US_other', 'cmt_contract_US']);
    // Asked for the other thread by name, the answer is still nothing.
    const other = await query(rep.token, 'sys_comment', [['thread_id', '=', thread(id.quote_JP)]]);
    expect({ status: other.status, labels: other.labels }, JSON.stringify(other.body)).toEqual({ status: 200, labels: [] });
  });

  it('reads the activity of a quote they can read, and of no other', async () => {
    // The panel's own read: the activity rows of one record.
    const mine = await query(rep.token, 'sys_activity', [['object_name', '=', 'crm_quote'], ['record_id', '=', id.quote_US]]);
    // Before #2029: 403 PERMISSION_DENIED, the panel's "view activity" refusal.
    expect({ status: mine.status, labels: mine.labels }, JSON.stringify(mine.body)).toEqual({ status: 200, labels: ['act_US'] });
    const other = await query(rep.token, 'sys_activity', [['object_name', '=', 'crm_quote'], ['record_id', '=', id.quote_JP]]);
    expect({ status: other.status, labels: other.labels }, JSON.stringify(other.body)).toEqual({ status: 200, labels: [] });
  });

  it('posts on a quote they can read, and is refused on one they cannot', async () => {
    const posted = await verify.apiAs(rep.token, 'POST', '/data/sys_comment', { thread_id: thread(id.quote_US), body: 'Rep reply' });
    expect(posted.status, await posted.clone().text()).toBe(201);

    const refused = await verify.apiAs(rep.token, 'POST', '/data/sys_comment', { thread_id: thread(id.quote_JP), body: 'Stray reply' });
    const body = (await refused.json()) as AnyRec;
    // The platform's parent gate, not the object gate: the rep holds create.
    expect({ status: refused.status, code: body.code }, JSON.stringify(body)).toEqual({
      status: 403, code: 'RECORD_NOT_ACCESSIBLE',
    });
    expect(fixtureLabels(await verify.rows('sys_comment', { thread_id: thread(id.quote_JP) }))).toEqual(['cmt_JP']);
  });

});

describe('a sales rep deletes comments where they can edit the record (#2038)', () => {
  it('deletes their own comment', async () => {
    const posted = await verify.apiAs(rep.token, 'POST', '/data/sys_comment', { thread_id: thread(id.quote_US), body: 'Rep typo' });
    expect(posted.status, await posted.clone().text()).toBe(201);
    const [mine] = await verify.rows('sys_comment', { thread_id: thread(id.quote_US), body: 'Rep typo' });
    // Before #2038: 403 PERMISSION_DENIED, the grant carried no delete.
    const res = await verify.apiAs(rep.token, 'DELETE', `/data/sys_comment/${mine!.id}`);
    expect(res.status, await res.clone().text()).toBe(200);
    expect(await verify.rows('sys_comment', { id: mine!.id })).toHaveLength(0);
  });

  it("deletes another person's comment on a quote they can edit", async () => {
    // The platform's rule: the author and anyone who can edit the record.
    const res = await verify.apiAs(rep.token, 'DELETE', `/data/sys_comment/${id.cmt_US_other}`);
    expect(res.status, await res.clone().text()).toBe(200);
    expect(await verify.rows('sys_comment', { id: id.cmt_US_other })).toHaveLength(0);
  });

  it("is refused a delete of another person's comment where they cannot edit the record", async () => {
    // The rep holds delete on sys_comment, so the refusal is the platform's
    // parent gate, not the object gate. On the contract they read: refused by
    // name. On the quote they cannot reach: the comment is not there for them.
    const contract = await verify.apiAs(rep.token, 'DELETE', `/data/sys_comment/${id.cmt_contract_US}`);
    const contractBody = (await contract.json()) as AnyRec;
    expect({ status: contract.status, code: contractBody.code }, JSON.stringify(contractBody)).toEqual({
      status: 403, code: 'RECORD_NOT_ACCESSIBLE',
    });
    const quote = await verify.apiAs(rep.token, 'DELETE', `/data/sys_comment/${id.cmt_JP}`);
    const quoteBody = (await quote.json()) as AnyRec;
    expect({ status: quote.status, code: quoteBody.code }, JSON.stringify(quoteBody)).toEqual({
      status: 404, code: 'RECORD_NOT_FOUND',
    });
    expect(fixtureLabels(await verify.rows('sys_comment', { id: { $in: [id.cmt_contract_US, id.cmt_JP] } })))
      .toEqual(['cmt_JP', 'cmt_contract_US']);
  });
});
