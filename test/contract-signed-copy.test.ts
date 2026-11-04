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
 *  3. `signed_copy` is a transition gate (`requiredWhen`, AGENTS.md Metadata
 *     semantics rule 7): Activated (contract) and Accepted (quote) are refused
 *     without one, on that field, and accepted with one; a row already past the
 *     gate without one — the data that predates the rule — is left alone.
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
    expect(ids).toEqual(['contract_print_parties', 'contract_print_terms', 'contract_print_signatures']);
    const parties = (main.components as Rec[])[0]!.properties.sections[0].fields as string[];
    // Every field it names is a field of the contract, and the internal deal
    // link is not one of them.
    for (const f of parties) expect(Object.keys(Contract.fields), f).toContain(f);
    expect(parties).not.toContain('crm_opportunity');
    expect((main.components as Rec[])[1]!.properties.sections).toEqual([{ group: 'terms' }, { group: 'value' }, { group: 'renewal' }]);
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
    name: 'Sales Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  rep = await signUpPerson(verify, 'rep@contract-signed-copy.test', {
    name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const as = (who: Person) => ({ as: who.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const refusal = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);
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

/**
 * A row that was ALREADY past the gate without a file when the rule shipped —
 * the data that predates it. No write through the engine can make one now (the
 * gate refuses it), so the stored column is cleared beneath the engine, on the
 * driver, the way the row existed before this change.
 */
const predating = async (object: string, id: string): Promise<void> => {
  const ql = verify.kernel.getService<Rec>('objectql');
  const driver = ql.getDriverForObject(object) as Rec;
  await driver.update(object, id, { signed_copy: null });
  expect((await stored(object, id)).signed_copy ?? null, 'the fixture row still holds a file').toBeNull();
};

/** The engine's refusal of a missing signed copy: a validation error on that field. */
const expectSignedCopyRefusal = (err: Rec | null) => {
  expect(err, 'the write was accepted without a signed copy').toBeTruthy();
  expect(err!.code).toBe('VALIDATION_FAILED');
  expect(JSON.stringify(err!.fields ?? err!.details ?? null)).toContain('signed_copy');
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

describe('Activated requires the signed copy (crm_contract.signed_copy, a transition gate)', () => {
  it('refuses activation without a signed copy, on that field, and keeps the status', async () => {
    const c = await contractOf({ status: 'in_approval' });
    expectSignedCopyRefusal(await refusal(verify.hooks.run('crm_contract', 'update', { id: c.id, status: 'activated' }, as(manager))));
    expect((await stored('crm_contract', c.id)).status).toBe('in_approval');
  });

  it('answers 400 VALIDATION_FAILED over REST, naming Signed Copy', async () => {
    const c = await contractOf({ status: 'in_approval' });
    const res = await verify.apiAs(manager.token, 'PATCH', `/data/crm_contract/${c.id}`, { status: 'activated' });
    const body = await res.json() as Rec;
    expect(res.status).toBe(400);
    expect(JSON.stringify(body)).toContain('VALIDATION_FAILED');
    expect(JSON.stringify(body)).toContain('Signed Copy');
    expect((await stored('crm_contract', c.id)).status).toBe('in_approval');
  });

  it('activates once the signed copy is filed, in the same save or before it', async () => {
    const before = await contractOf({ status: 'in_approval' });
    await verify.hooks.run('crm_contract', 'update', { id: before.id, signed_copy: await committedFile(verify, manager.id) }, as(manager));
    await verify.hooks.run('crm_contract', 'update', { id: before.id, status: 'activated' }, as(manager));
    expect((await stored('crm_contract', before.id)).status).toBe('activated');

    const same = await contractOf({ status: 'in_approval' });
    await verify.hooks.run('crm_contract', 'update', {
      id: same.id, status: 'activated', signed_copy: await committedFile(verify, manager.id),
    }, as(manager));
    const row = await stored('crm_contract', same.id);
    expect(row.status).toBe('activated');
    expect(row.signed_date).toBe(today());
  });

  it('refuses a contract created already activated without one, a system write included', async () => {
    const { account, contact } = await parties();
    expectSignedCopyRefusal(await refusal(verify.seed('crm_contract', [{
      crm_account: account.id, crm_contact: contact.id, contract_value: 1, owner_id: manager.id, status: 'activated', ...TERM,
    }])));
  });

  it('refuses clearing the signed copy off an activated contract', async () => {
    const c = await contractOf({ status: 'activated', signed_copy: await committedFile(verify, manager.id) });
    expectSignedCopyRefusal(await refusal(verify.hooks.run('crm_contract', 'update', { id: c.id, signed_copy: null }, as(manager))));
  });

  it('leaves a contract activated before the rule alone: other edits save, and it still ends', async () => {
    const c = await contractOf({ status: 'activated', signed_copy: await committedFile(verify, manager.id) });
    await predating('crm_contract', c.id);
    await verify.hooks.run('crm_contract', 'update', { id: c.id, special_terms: 'Renewal at list.' }, as(manager));
    expect((await stored('crm_contract', c.id)).special_terms).toBe('Renewal at list.');
    await verify.hooks.run('crm_contract', 'update', { id: c.id, status: 'terminated' }, as(manager));
    expect((await stored('crm_contract', c.id)).status).toBe('terminated');
  });
});

describe('Accepted requires the signed copy (crm_quote.signed_copy, a transition gate)', () => {
  /** A presented quote of the rep's, written as the system. */
  const presentedQuote = async (doc: Rec = {}): Promise<Rec> => {
    const { account, contact } = await parties();
    return (await verify.seed('crm_quote', [{
      name: `Signed Quote ${++k}`, crm_account: account.id, crm_contact: contact.id, owner_id: rep.id, status: 'presented',
      quote_date: '2030-01-01', expiration_date: '2030-02-01', ...doc,
    }]))[0]!;
  };
  const accept = (id: string) => verify.actions.run('crm_quote', 'accept_quote', { as: rep.token, recordId: id });

  it('refuses the Accept button without a signed copy, on that field, and keeps the quote presented', async () => {
    const q = await presentedQuote();
    expectSignedCopyRefusal(await refusal(accept(q.id)));
    expect((await stored('crm_quote', q.id)).status).toBe('presented');
  });

  it('refuses an Edit to Accepted without one, over REST', async () => {
    const q = await presentedQuote();
    const res = await verify.apiAs(rep.token, 'PATCH', `/data/crm_quote/${q.id}`, { status: 'accepted' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('Signed Copy');
    expect((await stored('crm_quote', q.id)).status).toBe('presented');
  });

  it('accepts once the rep files the signed copy on the presented quote', async () => {
    const q = await presentedQuote();
    await verify.hooks.run('crm_quote', 'update', { id: q.id, signed_copy: await committedFile(verify, rep.id) }, as(rep));
    await accept(q.id);
    expect((await stored('crm_quote', q.id)).status).toBe('accepted');
  });

  it('leaves a quote accepted before the rule alone', async () => {
    const q = await presentedQuote({ status: 'accepted', signed_copy: await committedFile(verify, rep.id) });
    await predating('crm_quote', q.id);
    // A settled quote takes only Internal Notes (`quote_workflow`), and that
    // edit still saves.
    await verify.hooks.run('crm_quote', 'update', { id: q.id, internal_notes: 'Countersigned on paper.' }, as(rep));
    expect((await stored('crm_quote', q.id)).internal_notes).toBe('Countersigned on paper.');
  });
});

describe('the requirement is the field’s, as declared', () => {
  it.each([[Contract, 'activated'], [Quote, 'accepted']] as const)('%#: signed_copy is a file field gated on one status', (object, status) => {
    const field = (object.fields as Rec).signed_copy;
    expect(field.type).toBe('file');
    expect(field.required ?? false).toBe(false);
    expect(String(field.requiredWhen?.source ?? field.requiredWhen)).toContain(`record.status == "${status}"`);
  });
});
