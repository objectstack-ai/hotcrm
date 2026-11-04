// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * Four record titles are STORED, not formulas (#2230); five more are the
 * record's own name (#2369 row 10).
 *
 * objectstack-ai/objectstack#24981 ruling A: the import matches a lookup cell
 * against a stored title only, and sort and search read stored columns. So a
 * composite title that must round-trip through import is a stored field
 * carrying an `expression`, which the engine computes on every insert and every
 * update by id. Until #2230 these `nameField`s were `Field.formula`, and a
 * contact export whose Account column read `ACC-000004 - Stark Medical`
 * answered `reference_not_found` on re-import.
 *
 * #2369 row 10, maintainer ruling A (hotcrm#2369 comment 6632353953): account,
 * product, quote, campaign and knowledge article are titled by their name
 * alone. Their stored `display_title` is gone; the number is a list column
 * and leads `highlightFields`, so the lookup picker shows it under the name.
 * Case keeps its number first; lead and forecast were not ruled on.
 *
 * What is pinned here, each against the booted app:
 *
 * - the metadata: each composite `nameField` names a non-formula field with an
 *   `expression`, `readonly` so no form offers it; each of the five names its
 *   own name column, carries no `display_title`, and leads its strip with the
 *   number;
 * - an insert stores the title with its autonumber (objectstack#25073, fixed
 *   in 18.1.0: before it, `CASE-…` was missing from the stored value);
 * - an import resolves a lookup cell by the target's title, and on 18.3.0 by
 *   a unique field (the number) when a shared name cannot name one record;
 * - the backfill's re-save (`scripts/backfill-record-titles.ts`) titles a row
 *   stored before the title was, including a converted lead, whose freeze
 *   would otherwise refuse the computed title as an edit.
 */

type Rec = Record<string, any>;

const TITLES: Record<string, string> = {
  crm_contact: 'full_name',
  crm_lead: 'display_title',
  crm_forecast: 'display_title',
  crm_case: 'display_title',
};

/** #2369 row 10: the five titled by their name alone, and the number shown under it. */
const NAMED: Record<string, { name: string; number: string }> = {
  crm_account: { name: 'name', number: 'account_number' },
  crm_product: { name: 'name', number: 'product_code' },
  crm_quote: { name: 'name', number: 'quote_number' },
  crm_campaign: { name: 'name', number: 'campaign_code' },
  crm_knowledge_article: { name: 'title', number: 'article_number' },
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

describe('the four composite record titles are stored fields', () => {
  it.each(Object.entries(TITLES))('%s titles its records with a stored, readonly expression field', (object, title) => {
    const schema = verify.metadata.object(object) as Rec;
    expect(schema.nameField).toBe(title);
    const field = schema.fields[title] as Rec;
    expect(field.type, `${object}.${title} is a column, not a formula`).not.toBe('formula');
    expect(field.expression, `${object}.${title} is computed by the engine`).toBeTruthy();
    expect(field.readonly).toBe(true);
  });
});

describe('five records are titled by their name alone (#2369 row 10, ruling A)', () => {
  it.each(Object.entries(NAMED))('%s: nameField is its own name, no display_title, the number leads the strip', (object, { name, number }) => {
    const schema = verify.metadata.object(object) as Rec;
    expect(schema.nameField).toBe(name);
    expect(schema.fields[name]?.type, `${object}.${name} is a plain stored column`).toBe('text');
    expect(schema.fields.display_title, `${object} carries no display_title`).toBeUndefined();
    expect(schema.fields[number]?.type).toBe('autonumber');
    expect(schema.highlightFields?.[0], `${object}'s picker shows ${number} under the name`).toBe(number);
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
    const res = await rest(admin, 'POST', '/data/crm_case', {
      subject: `Titled case ${++k}`, description: 'probe', status: 'new', priority: 'low', origin: 'web',
    });
    expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
    const id = String(res.body.id);
    const before = await stored('crm_case', id);
    expect(before.display_title).toBe(`${before.case_number} - Titled case ${k}`);

    await rest(admin, 'PATCH', `/data/crm_case/${id}`, { subject: `Renamed case ${k}`, display_title: 'forged' });
    expect((await stored('crm_case', id)).display_title).toBe(`${before.case_number} - Renamed case ${k}`);
  });
});

describe('an import resolves a lookup cell by the title', () => {
  it('a contact row naming its account by name is linked to that account', async () => {
    const name = `Import Target ${++k}`;
    const [account] = await verify.seed('crm_account', [{ name, type: 'prospect' }]);
    expect((await stored('crm_account', String(account!.id))).name).toBe(name);
    const email = `import${k}@stored-record-titles.test`;
    const res = await rest(admin, 'POST', '/data/crm_contact/import', {
      format: 'json', rows: [{ first_name: 'Ida', last_name: `Import ${k}`, email, crm_account: name }],
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.errors, JSON.stringify(res.body.results)).toBe(0);
    const [contact] = await verify.rows('crm_contact', { email });
    expect(contact!.crm_account).toBe(account!.id);
  });

  // The ruling's accepted cost: product, quote, campaign and article names may
  // repeat. A shared name names no one record, so the row is refused rather
  // than guessed; the number (a unique autonumber, which the 18.3.0 matcher
  // tries after the name) or the record id names it.
  it('a shared product name is refused as ambiguous; the product code links the row', async () => {
    const name = `Twin Widget ${++k}`;
    const [first, second] = await verify.seed('crm_product', [
      { name, is_active: true, list_price: 10 },
      { name, is_active: true, list_price: 20 },
    ]);
    const code = String((await stored('crm_product', String(second!.id))).product_code);
    expect(code).toMatch(/^PRD-\d+$/);
    const [book] = await verify.seed('crm_price_book', [{ name: `Import Book ${k}`, is_active: true }]);

    const byName = await rest(admin, 'POST', '/data/crm_price_book_entry/import', {
      format: 'json', rows: [{ crm_price_book: book!.id, crm_product: name, list_price: 15 }],
    });
    expect(byName.status, JSON.stringify(byName.body)).toBe(200);
    expect(byName.body.results?.[0]?.code, JSON.stringify(byName.body.results)).toBe('reference_ambiguous');

    const byCode = await rest(admin, 'POST', '/data/crm_price_book_entry/import', {
      format: 'json', rows: [{ crm_price_book: book!.id, crm_product: code, list_price: 15 }],
    });
    expect(byCode.status, JSON.stringify(byCode.body)).toBe(200);
    expect(byCode.body.errors, JSON.stringify(byCode.body.results)).toBe(0);
    const entries = await verify.rows('crm_price_book_entry', { crm_price_book: book!.id });
    expect(entries.map((e) => e.crm_product)).toEqual([second!.id]);
    expect(first!.id).not.toBe(second!.id);
  });
});

describe("the backfill's re-save titles a row stored before the title was", () => {
  it('an open case', async () => {
    const res = await rest(admin, 'POST', '/data/crm_case', {
      subject: `Upgraded case ${++k}`, description: 'probe', status: 'new', priority: 'low', origin: 'web',
    });
    expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
    const id = String(res.body.id);
    await untitle('crm_case', id);
    const resave = await rest(admin, 'PATCH', `/data/crm_case/${id}`, { subject: `Upgraded case ${k}` });
    expect(resave.status, JSON.stringify(resave.body)).toBe(200);
    const row = await stored('crm_case', id);
    expect(row.display_title).toBe(`${row.case_number} - Upgraded case ${k}`);
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
