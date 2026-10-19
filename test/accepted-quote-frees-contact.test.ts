// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { REFUSAL_CODES } from '../src/sales/objects/_refusal';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * An accepted quote no longer makes its contact undeletable (#2161).
 *
 * ### The defect
 *
 * `contact_integrity` counted an accepted quote as "active", so a sales manager
 * deleting the contact, or the prospect account above it, was told 409
 * `DELETE_RESTRICTED` "… 1 active quote(s) … Close or reassign the
 * opportunities and quotes first". Neither remedy could be followed: accepted
 * is a settled state, and `quote_workflow`'s freeze refuses a new contact on
 * it. The one-word count fix alone was not enough — measured on 18.0.0-next.3,
 * the engine's referential clear `{ crm_contact: null }` on the accepted quote
 * was then refused by #1017's `requiredWhen`, 400 "Contact is required".
 *
 * ### The ruling (maintainer, 2026-10-19, letter A)
 *
 * `crm_quote.crm_contact` is required on the write that turns a quote INTO
 * Presented or Accepted, and while it is Presented; an already-accepted quote
 * lets the engine's referential cleanup clear it. `contact_integrity` stops
 * counting an accepted quote, and its refusal names only remedies that free
 * the contact. Both #720 ("A frozen record must not make the people it
 * references undeletable") and #1017 (no contract drafted without a
 * recipient) hold.
 *
 * ### The shapes, and which one each pin covers
 *
 * - A DIRECT contact delete: the accepted quote survives, `crm_contact`
 *   cleared, every other business field untouched.
 * - An ACCOUNT delete where the accepted quote sits on ANOTHER account: the
 *   contact goes with its account, and the quote survives the same way.
 * - An ACCOUNT delete where the accepted quote sits UNDER the deleted account:
 *   `crm_quote.crm_account` is a master-detail with `deleteBehavior:
 *   'cascade'`, so the engine deletes the quote as the account's child. "The
 *   quote survives" does not apply to that shape, in any option; what the pin
 *   holds is that the delete lands.
 * - CONTROL: an open (presented) quote still holds its contact, on both doors.
 *
 * Every request goes through the REST door as a signed-up sales manager — the
 * caller the card measured — and each refusal is asserted by its envelope
 * (`code` + `status`), never by "it threw".
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let manager: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  manager = await signUpPerson(verify, 'manager@accepted-quote-frees-contact.test', {
    name: 'Erasure Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 180_000);

const stored = async (object: string, id: string): Promise<Rec | undefined> => (await verify.rows(object, { id }))[0];

/** A REST call as the manager: status and parsed body. */
const rest = async (method: string, path: string, body?: unknown): Promise<{ status: number; body: Rec }> => {
  const res = await verify.apiAs(manager.token, method, path, body);
  const text = await res.text();
  let parsed: Rec = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
};

/**
 * A prospect account with one contact, and a quote in `status` naming that
 * contact — under the contact's own account, or under a second account when
 * `quoteElsewhere`. Seeded as the system: the fixture is not the subject.
 */
const build = async (status: string, quoteElsewhere = false) => {
  const n = ++k;
  const [account] = await verify.seed('crm_account', [{ name: `Erasure Co ${n}`, type: 'prospect', owner_id: manager.id }]);
  const [other] = await verify.seed('crm_account', [{ name: `Erasure Other ${n}`, type: 'prospect', owner_id: manager.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Ada', last_name: `Erasure ${n}`, email: `ada${n}@accepted-quote-frees-contact.test`,
    crm_account: account!.id, owner_id: manager.id,
  }]);
  const [quote] = await verify.seed('crm_quote', [{
    name: `EQ-${n}`, status, crm_account: quoteElsewhere ? other!.id : account!.id, crm_contact: contact!.id,
    quote_date: '2026-01-01', expiration_date: '2030-12-31', tax: 100, internal_notes: `signed ${n}`, owner_id: manager.id,
  }]);
  return { account: account!, other: other!, contact: contact!, quote: (await stored('crm_quote', String(quote!.id)))! };
};

/** The columns a referential clear may move: the link itself and the engine's audit stamp. */
const MOVED = new Set(['crm_contact', 'updated_at', 'updated_by']);
const unmoved = (row: Rec): Rec =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !MOVED.has(key)));

describe('deleting a contact whose only referent is an ACCEPTED quote', () => {
  it('direct delete: lands, and the accepted quote survives with only its contact cleared', async () => {
    const { contact, quote } = await build('accepted');
    const res = await rest('DELETE', `/data/crm_contact/${contact.id}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await stored('crm_contact', String(contact.id))).toBeUndefined();

    const after = await stored('crm_quote', String(quote.id));
    expect(after, 'the accepted quote was destroyed').toBeDefined();
    expect(after!.status).toBe('accepted');
    expect(after!.crm_contact ?? null).toBeNull();
    // Every other column is as it was: the clear is the engine's one write.
    expect(unmoved(after!)).toEqual(unmoved(quote));
  });

  it('account delete, the quote on ANOTHER account: lands, and the quote survives with its contact cleared', async () => {
    const { account, other, contact, quote } = await build('accepted', true);
    const res = await rest('DELETE', `/data/crm_account/${account.id}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await stored('crm_account', String(account.id))).toBeUndefined();
    expect(await stored('crm_contact', String(contact.id))).toBeUndefined();

    const after = await stored('crm_quote', String(quote.id));
    expect(after, 'the accepted quote on the other account was destroyed').toBeDefined();
    expect(after!.crm_account).toBe(other.id);
    expect(after!.status).toBe('accepted');
    expect(after!.crm_contact ?? null).toBeNull();
    expect(unmoved(after!)).toEqual(unmoved(quote));
  });

  it('account delete, the quote UNDER that account: lands, and the quote goes with it as its master-detail child', async () => {
    // The card's literal repro. The quote does NOT survive here, and no option
    // could make it: `crm_quote.crm_account` cascades. What changed is that
    // the delete is no longer refused.
    const { account, contact, quote } = await build('accepted');
    const res = await rest('DELETE', `/data/crm_account/${account.id}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await stored('crm_account', String(account.id))).toBeUndefined();
    expect(await stored('crm_contact', String(contact.id))).toBeUndefined();
    expect(await stored('crm_quote', String(quote.id))).toBeUndefined();
  });
});

describe('CONTROL — an open quote still holds its contact', () => {
  const expectHeld = (res: { status: number; body: Rec }) => {
    expect(res.status, JSON.stringify(res.body)).toBe(REFUSAL_CODES.delete_restricted.status);
    expect(res.body.code).toBe(REFUSAL_CODES.delete_restricted.code);
  };

  it('a PRESENTED quote refuses the direct delete, and nothing moves', async () => {
    const { contact, quote } = await build('presented');
    const res = await rest('DELETE', `/data/crm_contact/${contact.id}`);
    expectHeld(res);
    expect(String(res.body.error)).toContain(`Contact Ada Erasure ${k} is still referenced by 1 open quote, so it cannot be deleted`);
    expect(await stored('crm_contact', String(contact.id))).toBeDefined();
    expect((await stored('crm_quote', String(quote.id)))!.crm_contact).toBe(contact.id);
  });

  it('a PRESENTED quote refuses the account delete too, and the chain stays', async () => {
    const { account, contact, quote } = await build('presented');
    const res = await rest('DELETE', `/data/crm_account/${account.id}`);
    expectHeld(res);
    expect(await stored('crm_account', String(account.id))).toBeDefined();
    expect(await stored('crm_contact', String(contact.id))).toBeDefined();
    expect((await stored('crm_quote', String(quote.id)))!.crm_contact).toBe(contact.id);
  });
});

describe('the refusal names what holds the contact, and only remedies that free it', () => {
  it('counts with real plurals, lists no zero, and offers no remedy that keeps the contact held', async () => {
    const { account, contact } = await build('presented');
    await verify.seed('crm_quote', [{
      name: `EQ-${k}-b`, status: 'draft', crm_account: account.id, crm_contact: contact.id,
      quote_date: '2026-01-01', expiration_date: '2030-12-31', owner_id: manager.id,
    }]);
    await verify.seed('crm_opportunity', [{
      name: `Erasure deal ${k}`, crm_account: account.id, primary_contact: contact.id, stage: 'proposal',
      amount: 10, close_date: '2030-06-30', owner_id: manager.id,
    }]);
    const res = await rest('DELETE', `/data/crm_contact/${contact.id}`);
    expect(res.status, JSON.stringify(res.body)).toBe(REFUSAL_CODES.delete_restricted.status);
    expect(res.body.code).toBe(REFUSAL_CODES.delete_restricted.code);
    const message = String(res.body.error);
    expect(message).toContain('is still referenced by 1 open opportunity and 2 open quotes, so it cannot be deleted');
    expect(message).toContain(
      'To free the contact, close each open opportunity or give it another primary contact; and give each open quote another contact or reject it.',
    );
    // A-17: no "(s)" / "(ies)" shape, and no referent counted at zero.
    expect(message).not.toMatch(/\((s|ies)\)/);
    expect(message).not.toMatch(/\b0 /);
    expect(message).not.toContain('contract');
    // Accepting is not offered for a quote: it drafts a contract naming the
    // same person, and a contract keeps its primary contact for life.
    expect(message).not.toMatch(/accept/i);
  });
});

describe('the gate still stands where #1017 put it', () => {
  const expectContactRequired = (res: { status: number; body: Rec }) => {
    expect(res.status, JSON.stringify(res.body)).toBe(REFUSAL_CODES.invalid_value.status);
    expect(res.body.code).toBe(REFUSAL_CODES.invalid_value.code);
    expect((res.body.fields ?? []).map((f: Rec) => `${f.field}:${f.code}`)).toContain('crm_contact:required');
  };

  it('refuses the write that accepts a presented quote while clearing its contact', async () => {
    const { quote } = await build('presented');
    const res = await rest('PATCH', `/data/crm_quote/${quote.id}`, { status: 'accepted', crm_contact: null });
    expectContactRequired(res);
    const after = await stored('crm_quote', String(quote.id));
    expect(after!.status).toBe('presented');
    expect(after!.crm_contact).toBe(quote.crm_contact);
  });

  it('refuses a quote born accepted with no contact (an insert has no previous row)', async () => {
    const { account } = await build('draft');
    const res = await rest('POST', '/data/crm_quote', {
      name: `EQ-${k}-born`, status: 'accepted', crm_account: account.id,
      quote_date: '2026-01-01', expiration_date: '2030-12-31',
    });
    expectContactRequired(res);
    expect(await verify.rows('crm_quote', { name: `EQ-${k}-born` })).toHaveLength(0);
  });
});
