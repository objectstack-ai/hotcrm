// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * Nine record titles are STORED, not formulas (#2230).
 *
 * objectstack-ai/objectstack#24981 ruling A: the import matches a lookup cell
 * against a stored title only, and sort and search read stored columns. So a
 * composite title that must round-trip through import is a stored field
 * carrying an `expression`, which the engine computes on every insert and every
 * update by id. Until #2230 these nine `nameField`s were `Field.formula`, and a
 * contact export whose Account column read `ACC-000004 - Stark Medical`
 * answered `reference_not_found` on re-import.
 *
 * What is pinned here, each against the booted app:
 *
 * - the metadata: each `nameField` names a non-formula field with an
 *   `expression`, `readonly` so no form offers it;
 * - an insert stores the title with its autonumber (objectstack#25073, fixed
 *   in 18.1.0: before it, `CASE-…` was missing from the stored value);
 * - an import resolves a lookup cell by the target's stored title;
 * - the backfill's re-save (`scripts/backfill-record-titles.ts`) titles a row
 *   stored before the title was, including the two frozen states whose
 *   freezes would otherwise refuse the computed title as an edit: an accepted
 *   quote and a converted lead.
 */

type Rec = Record<string, any>;

const TITLES: Record<string, string> = {
  crm_account: 'display_title',
  crm_contact: 'full_name',
  crm_lead: 'display_title',
  crm_forecast: 'display_title',
  crm_product: 'display_title',
  crm_quote: 'display_title',
  crm_campaign: 'display_title',
  crm_case: 'display_title',
  crm_knowledge_article: 'display_title',
};

let verify: VerifyStack;
let manager: Person;
let admin: string;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  manager = await signUpPerson(verify, 'manager@stored-record-titles.test', {
    name: 'Title Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  admin = await verify.signIn();
}, 180_000);

const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;

const rest = async (token: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: Rec }> => {
  const res = await verify.apiAs(token, method, path, body);
  const text = await res.text();
  let parsed: Rec = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
};

/**
 * Put a row back in the state an in-place upgrade leaves it in: the title
 * column empty. Written through the datasource driver, beneath the engine,
 * because no engine write can store anything but the computed value.
 */
const untitle = async (object: string, id: string): Promise<void> => {
  const ql = verify.kernel.getService<Rec>('objectql');
  await ql.getDriverForObject(object).update(object, id, { [TITLES[object]!]: null });
  expect((await stored(object, id))[TITLES[object]!] ?? null, `${object} ${id} is untitled`).toBeNull();
};

describe('the nine record titles are stored fields', () => {
  it.each(Object.entries(TITLES))('%s titles its records with a stored, readonly expression field', (object, title) => {
    const schema = verify.metadata.object(object) as Rec;
    expect(schema.nameField).toBe(title);
    const field = schema.fields[title] as Rec;
    expect(field.type, `${object}.${title} is a column, not a formula`).not.toBe('formula');
    expect(field.expression, `${object}.${title} is computed by the engine`).toBeTruthy();
    expect(field.readonly).toBe(true);
  });
});

describe('a write stores the title', () => {
  it('a case inserted through REST stores its number in its title', async () => {
    const res = await rest(admin, 'POST', '/data/crm_case', {
      subject: `Stored title ${++k}`, description: 'probe', status: 'new', priority: 'low', origin: 'web',
    });
    expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
    const row = await stored('crm_case', String(res.body.id));
    expect(row.case_number).toMatch(/^CASE-\d+$/);
    expect(row.display_title).toBe(`${row.case_number} - Stored title ${k}`);
  });

  it('an update by id recomputes it, and a client-sent title does not stand', async () => {
    const [account] = await verify.seed('crm_account', [{ name: `Titled Co ${++k}`, type: 'prospect' }]);
    const id = String(account!.id);
    const before = await stored('crm_account', id);
    expect(before.display_title).toBe(`${before.account_number} - Titled Co ${k}`);

    await rest(admin, 'PATCH', `/data/crm_account/${id}`, { name: `Renamed Co ${k}`, display_title: 'forged' });
    expect((await stored('crm_account', id)).display_title).toBe(`${before.account_number} - Renamed Co ${k}`);
  });
});

describe('an import resolves a lookup cell by the stored title', () => {
  it('a contact row naming its account by title is linked to that account', async () => {
    const [account] = await verify.seed('crm_account', [{ name: `Import Target ${++k}`, type: 'prospect' }]);
    const title = (await stored('crm_account', String(account!.id))).display_title as string;
    const email = `import${k}@stored-record-titles.test`;
    const res = await rest(admin, 'POST', '/data/crm_contact/import', {
      format: 'json', rows: [{ first_name: 'Ida', last_name: `Import ${k}`, email, crm_account: title }],
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.errors, JSON.stringify(res.body.results)).toBe(0);
    const [contact] = await verify.rows('crm_contact', { email });
    expect(contact!.crm_account).toBe(account!.id);
  });
});

describe("the backfill's re-save titles a row stored before the title was", () => {
  it('an open account', async () => {
    const [account] = await verify.seed('crm_account', [{ name: `Upgraded Co ${++k}`, type: 'prospect' }]);
    const id = String(account!.id);
    await untitle('crm_account', id);
    const res = await rest(admin, 'PATCH', `/data/crm_account/${id}`, { name: `Upgraded Co ${k}` });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const row = await stored('crm_account', id);
    expect(row.display_title).toBe(`${row.account_number} - Upgraded Co ${k}`);
  });

  it("an accepted quote, which the quote's freeze holds", async () => {
    const [account] = await verify.seed('crm_account', [{ name: `Quote Holder ${++k}`, type: 'prospect', owner_id: manager.id }]);
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Sam', last_name: `Signer ${k}`, email: `signer${k}@stored-record-titles.test`,
      crm_account: account!.id, owner_id: manager.id,
    }]);
    const [quote] = await verify.seed('crm_quote', [{
      name: `Settled Quote ${k}`, status: 'accepted', crm_account: account!.id, crm_contact: contact!.id,
      quote_date: '2026-01-01', expiration_date: '2030-12-31', owner_id: manager.id,
    }]);
    const id = String(quote!.id);
    await untitle('crm_quote', id);

    const res = await rest(admin, 'PATCH', `/data/crm_quote/${id}`, { name: `Settled Quote ${k}` });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const row = await stored('crm_quote', id);
    expect(row.display_title).toBe(`${row.quote_number} - Settled Quote ${k}`);

    // The freeze itself still holds: a real edit is refused.
    const edit = await rest(manager.token, 'PATCH', `/data/crm_quote/${id}`, { name: `Edited ${k}` });
    expect(edit.status).toBe(409);
    expect(edit.body.code).toBe('RECORD_LOCKED');
  });

  it("a converted lead, which the lead's freeze holds", async () => {
    const company = `Converted Co ${++k}`;
    const lead = await verify.hooks.run('crm_lead', 'insert', {
      company, email: `lead${k}@stored-record-titles.test`, first_name: 'Joe', last_name: 'Green', status: 'qualified',
    }, { as: manager.token });
    const started = await verify.flows.run('lead_conversion', { recordId: lead.id }, { as: manager.token });
    await verify.flows.resume(started, { createOpportunity: false }, { as: manager.token });
    const id = String(lead.id);
    expect((await stored('crm_lead', id)).is_converted).toBeTruthy();
    await untitle('crm_lead', id);

    const res = await rest(manager.token, 'PATCH', `/data/crm_lead/${id}`, { company });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((await stored('crm_lead', id)).display_title).toBe(`Joe Green - ${company}`);

    const edit = await rest(manager.token, 'PATCH', `/data/crm_lead/${id}`, { company: `Elsewhere ${k}` });
    expect(edit.status).toBe(409);
  });
});
