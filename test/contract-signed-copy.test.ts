// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { defaultRecordPageObject } from '@objectstack/spec/ui';
import { PrintServicePlugin } from '@objectstack/service-print';
import artifact from '../objectstack.config';
import { PrintContractAction } from '../src/sales/actions/contract.actions';
import { PrintQuoteAction } from '../src/revenue/actions/quote.actions';
import { Contract } from '../src/sales/objects/contract.object';
import { Quote } from '../src/revenue/objects/quote.object';
import { ContractViews } from '../src/sales/views/contract.view';
import { QuoteViews } from '../src/revenue/views/quote.view';
import { hotcrmStack, signUpPerson, committedFile, today, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Print Contract and the signed copy (REQ-0008 phases 2–3, #2317).
 *
 * Three facts, each pinned at the layer that decides it:
 *
 *  1. The contract prints on its own page (`contract_print_page`) through the
 *     print service's door, and still OPENS on its working page
 *     (`contract_detail_page`), the way the console's record route picks one.
 *     The door is mounted once, by the app package, for both prints.
 *  2. Filing the signed copy fills `signed_date` when it is empty
 *     (`contract_signed_copy_date`), in the filing write itself.
 *  3. `signed_copy` is RECORDED, NOT YET REQUIRED (ruling on #2317,
 *     2026-11-05): Activated (contract) and Accepted (quote) still save
 *     without one, and a contract activated without one saves every other
 *     edit. The `requiredWhen` gate waits on objectstack-ai/objectstack#30184
 *     (the console's Edit form checks it on every save); when it comes back,
 *     these cases turn into the gate's.
 */

// ───────────────────────────────────────────────────────── metadata ──

type PageLike = { name?: string; type?: string; object?: string; isDefault?: boolean; kind?: string; print?: unknown; slots?: Record<string, unknown> };

const pages = ((artifact as { packages?: { manifest?: { pages?: PageLike[] } }[] }).packages ?? [])
  .flatMap((pkg) => pkg.manifest?.pages ?? []);
const contractPages = pages.filter((p) => p.type === 'record' && p.object === 'crm_contract');

describe('the contract record page and its print page (#2317)', () => {
  it('declares the print page and a default page beside it', () => {
    expect(contractPages.map((p) => p.name).sort()).toEqual(['contract_detail_page', 'contract_print_page']);
  });

  it('opens a contract on contract_detail_page, the synthesized layout, never the print page', () => {
    // The console's pick (`usePageAssignment`): the default record page, else
    // the FIRST record page of the object.
    const opened = contractPages.find((p) => defaultRecordPageObject(p) === 'crm_contract') ?? contractPages[0];
    expect(opened?.name).toBe('contract_detail_page');
    expect(opened?.print).toBeUndefined();
    expect(opened?.kind).toBe('slotted');
    expect(Object.keys(opened?.slots ?? {})).toEqual([]);
    expect(contractPages.find((p) => p.name === 'contract_print_page')?.isDefault).not.toBe(true);
  });

  it('prints the parties, term, value, billing, renewal and a signature block', () => {
    const page = contractPages.find((p) => p.name === 'contract_print_page') as Rec;
    expect(page.print).toMatchObject({ pageNumbers: true, repeatHeader: true });
    const main = (page.regions as Rec[]).find((r) => r.name === 'main')!;
    const ids = (main.components as Rec[]).map((c) => c.id);
    expect(ids).toEqual(['contract_print_parties', 'contract_print_terms', 'contract_print_value', 'contract_print_renewal', 'contract_print_signatures']);
    const parties = (main.components as Rec[])[0]!.properties.sections[0].fields as string[];
    // Every field it names is a field of the contract, and the internal deal
    // link is not one of them.
    for (const f of parties) expect(Object.keys(Contract.fields), f).toContain(f);
    expect(parties).not.toContain('crm_opportunity');
    expect((main.components as Rec[]).slice(1, 4).map((c) => c.properties.sections)).toEqual([[{ group: 'terms' }], [{ group: 'value' }], [{ group: 'renewal' }]]);
  });
});

describe('print_contract (#2317)', () => {
  it('calls the print door for the contract, on the print page', () => {
    expect(PrintContractAction).toMatchObject({
      objectName: 'crm_contract', type: 'api', target: '/api/v1/print/records', method: 'POST',
      execution: 'perRecord', recordIdParam: 'recordId',
      bodyExtra: { app: 'app.objectstack.hotcrm', object: 'crm_contract', page: 'contract_print_page' },
    });
    expect(contractPages.map((p) => p.name)).toContain(PrintContractAction.bodyExtra!.page);
  });

  it('mounts the print door once, for Print Contract and Print Quote alike', () => {
    // `plugins` concatenate across the four package stacks, so a second
    // composition would mount the door twice.
    const plugins = ((artifact as { plugins?: unknown[] }).plugins ?? []).filter((p) => p instanceof PrintServicePlugin);
    expect(plugins).toHaveLength(1);
    expect(PrintQuoteAction.target).toBe(PrintContractAction.target);
  });
});

// ───────────────────────────────────────────────────────── runtime ──

let verify: VerifyStack;
let manager: Person;
let rep: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  manager = await signUpPerson(verify, 'manager@contract-signed-copy.test', {
    name: 'Sales Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
  });
  rep = await signUpPerson(verify, 'rep@contract-signed-copy.test', {
    name: 'Sales Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const as = (who: Person) => ({ as: who.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const TERM = { start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12 };

/** An account and contact of the rep's, written as the system. */
const parties = async (): Promise<{ account: Rec; contact: Rec }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Signed Co ${++k}`, type: 'prospect', owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Sia', last_name: `Signer ${k}`, email: `sia${k}@contract-signed-copy.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  return { account: account!, contact: contact! };
};

/** A contract in `doc`'s stored state, written as the system. */
const contractOf = async (doc: Rec): Promise<Rec> => {
  const { account, contact } = await parties();
  return (await verify.seed('crm_contract', [{
    crm_account: account.id, crm_contact: contact.id, contract_type: 'subscription', contract_value: 12_000,
    owner_id: manager.id, ...TERM, ...doc,
  }]))[0]!;
};

describe('contract_signed_copy_date — filing the signed copy dates the signature', () => {
  it('fills an empty signed_date with today on the write that files the copy', async () => {
    const c = await contractOf({ status: 'in_approval' });
    const file = await committedFile(verify, manager.id);
    await verify.hooks.run('crm_contract', 'update', { id: c.id, signed_copy: file }, as(manager));
    const row = await stored('crm_contract', c.id);
    expect(row.signed_date).toBe(today());
    expect(row.signed_copy?.id ?? row.signed_copy).toBe(file);
  });

  it('keeps a signed_date already on the contract', async () => {
    const c = await contractOf({ status: 'in_approval', signed_date: '2026-03-03' });
    await verify.hooks.run('crm_contract', 'update', { id: c.id, signed_copy: await committedFile(verify, manager.id) }, as(manager));
    expect((await stored('crm_contract', c.id)).signed_date).toBe('2026-03-03');
  });

  it('keeps a signed_date typed on the same save', async () => {
    const c = await contractOf({ status: 'in_approval' });
    await verify.hooks.run('crm_contract', 'update', {
      id: c.id, signed_copy: await committedFile(verify, manager.id), signed_date: '2026-02-02',
    }, as(manager));
    expect((await stored('crm_contract', c.id)).signed_date).toBe('2026-02-02');
  });

  it('dates nothing on a save that files no copy', async () => {
    const c = await contractOf({ status: 'draft' });
    await verify.hooks.run('crm_contract', 'update', { id: c.id, description: 'Re-read.' }, as(manager));
    expect((await stored('crm_contract', c.id)).signed_date ?? null).toBeNull();
  });

  it('leaves the date alone when the copy is cleared off a contract that is not activated', async () => {
    const c = await contractOf({ status: 'in_approval' });
    await verify.hooks.run('crm_contract', 'update', { id: c.id, signed_copy: await committedFile(verify, manager.id) }, as(manager));
    await verify.hooks.run('crm_contract', 'update', { id: c.id, signed_copy: null }, as(manager));
    const row = await stored('crm_contract', c.id);
    expect(row.signed_copy ?? null).toBeNull();
    expect(row.signed_date).toBe(today());
  });
});

describe('a signed copy is recorded, not yet required (held on objectstack#30184)', () => {
  it('activates a contract without a signed copy', async () => {
    const c = await contractOf({ status: 'in_approval' });
    await verify.hooks.run('crm_contract', 'update', { id: c.id, status: 'activated' }, as(manager));
    const row = await stored('crm_contract', c.id);
    expect(row.status).toBe('activated');
    expect(row.signed_copy ?? null).toBeNull();
  });

  it('saves an unrelated edit on an activated contract with no copy, over REST, and it still ends', async () => {
    // The row a legacy contract is: activated, never given a copy. Over REST
    // and through the engine its other edits save; the console's Edit form is
    // where the held gate would have refused them (objectstack#30184).
    const c = await contractOf({ status: 'activated' });
    const res = await verify.apiAs(manager.token, 'PATCH', `/data/crm_contract/${c.id}`, { special_terms: 'Renewal at list.' });
    expect(res.status).toBe(200);
    expect((await stored('crm_contract', c.id)).special_terms).toBe('Renewal at list.');
    await verify.hooks.run('crm_contract', 'update', { id: c.id, status: 'terminated' }, as(manager));
    expect((await stored('crm_contract', c.id)).status).toBe('terminated');
  });

  it('accepts a quote through the Accept button without a signed copy', async () => {
    const { account, contact } = await parties();
    const [q] = await verify.seed('crm_quote', [{
      name: `Signed Quote ${++k}`, crm_account: account.id, crm_contact: contact.id, owner_id: rep.id, status: 'presented',
      quote_date: '2030-01-01', expiration_date: '2030-02-01',
    }]);
    await verify.actions.run('crm_quote', 'accept_quote', { as: rep.token, recordId: q!.id });
    const row = await stored('crm_quote', q!.id);
    expect(row.status).toBe('accepted');
    expect(row.signed_copy ?? null).toBeNull();
  });
});

describe('signed_copy, as declared', () => {
  it.each([[Contract], [Quote]] as const)('%#: a plain, optional file field, with no requiredWhen until #30184', (object) => {
    const field = (object.fields as Rec).signed_copy;
    expect(field.type).toBe('file');
    expect(field.required ?? false).toBe(false);
    expect(field.requiredWhen).toBeUndefined();
  });

  // Measured in the browser pass: a field no form section lists has no
  // upload control on Edit, so the rep could never file it from the console.
  it.each([['crm_contract', ContractViews], ['crm_quote', QuoteViews]] as const)('%s: the edit form offers the upload', (_object, views) => {
    const fields = ((views as Rec).form.sections as Rec[]).flatMap((s) => s.fields.map((f: Rec | string) => (typeof f === 'string' ? f : f.field)));
    expect(fields).toContain('signed_copy');
  });
});
