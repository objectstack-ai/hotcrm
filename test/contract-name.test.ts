// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { Contract } from '../src/sales/objects/contract.object';
import { ContractViews } from '../src/sales/views/contract.view';
import { ContractPrintPage } from '../src/sales/pages/contract_print.page';
import { contracts } from '../src/sales/data/contract.seed';
import { contractsZhCN } from '../src/sales/data/contract.zh-CN.seed';
import { commerce as en } from '../src/sales/translations/en/objects.commerce';
import { commerce as zhCN } from '../src/sales/translations/zh-CN/objects.commerce';
import { commerce as esES } from '../src/sales/translations/es-ES/objects.commerce';
import { commerce as jaJP } from '../src/sales/translations/ja-JP/objects.commerce';
import {
  hotcrmStack, signUpPerson, switchFlow, committedFile, today, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * A contract has a name, and the name is its title (hotcrm#2746).
 *
 * Until then a contract's title was its autonumber, so the account's
 * Contracts tab, the contract pickers on plan steps and invoices, approvals
 * and notices showed CTR- numbers alone, and a customer's several contracts
 * read alike. The ruling (the product owner, on the card): a required Contract
 * Name is the `nameField`, shown first on the form, the list and the header;
 * the number stays beside it; a contract drafted from an accepted quote takes
 * the quote's name, else its opportunity's; existing contracts are named.
 *
 * The drafted-from-an-order name is pinned in `sales-order-draft-contract.test.ts`
 * and the notices' number-and-name in `contract-drafted-notice.test.ts` and
 * `flow-scheduled.test.ts`; the backfill script's query bodies in
 * `backfill-query-bodies.test.ts`.
 */

const fields = Contract.fields as Rec;

describe('the contract is titled by its name', () => {
  it('Contract Name is a required text field and the record title', () => {
    expect(Contract.nameField).toBe('name');
    expect(fields.name).toMatchObject({ type: 'text', label: 'Contract Name', required: true });
    expect(Contract.searchableFields).toEqual(expect.arrayContaining(['name', 'contract_number']));
  });

  it('carries no column constraint, so an installed database takes the field (AGENTS.md rule 11)', () => {
    // On 18.6.0 adding a NOT NULL column to an existing contract table fails
    // the contract's schema sync (SQLite: "Cannot add a NOT NULL column with
    // default value NULL"). `required` is the write contract; see the field's comment.
    expect(fields.name.storage?.notNull).toBeUndefined();
  });

  it('the number stands beside the name: first in the strip the picker reads, a column after the name', () => {
    expect(Contract.highlightFields?.[0]).toBe('contract_number');
    const columns = (ContractViews.list!.columns as Rec[]).map((c) => c.field);
    expect(columns.slice(0, 2)).toEqual(['name', 'contract_number']);
    expect((ContractViews.list!.columns as Rec[])[0]).toMatchObject({ link: true });
    const tab = fields.crm_account.relatedListColumns as string[];
    expect(tab.slice(0, 2)).toEqual(['name', 'contract_number']);
  });

  it('the new-contract form asks for the name first, and the printed contract carries it', () => {
    const form = ContractViews.form as Rec;
    expect(form.sections[0].fields[0]).toBe('name');
    const parties = (ContractPrintPage.regions as Rec[])
      .flatMap((r) => r.components as Rec[])
      .find((c) => c.id === 'contract_print_parties')!;
    expect(parties.properties.sections[0].fields[0]).toBe('name');
  });

  it.each([
    ['en', en, 'Contract Name'],
    ['zh-CN', zhCN, '合同名称'],
    ['es-ES', esES, 'Nombre del Contrato'],
    ['ja-JP', jaJP, '契約名'],
  ])('the %s pack labels it', (_locale, pack, label) => {
    expect((pack as Rec).crm_contract.fields.name).toEqual({ label });
  });

  it('every demo contract has a name, in both stories', () => {
    for (const seed of [contracts, contractsZhCN]) {
      for (const record of seed.records as Rec[]) {
        expect(typeof record.name === 'string' && record.name.trim() !== '', String(record.description)).toBe(true);
      }
    }
  });
});

describe('on the booted stack', () => {
  let verify: VerifyStack;
  let admin: string;
  let rep: Person;
  let k = 0;

  const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
  const refusal = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);

  /** An account and its contact, as the system. */
  const parties = async (): Promise<{ account: Rec; contact: Rec }> => {
    const n = ++k;
    const [account] = await verify.seed('crm_account', [{ name: `Named Contract Co ${n}`, owner_id: rep.id }]);
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Nina', last_name: `Named ${n}`, email: `nina${n}@contract-name.test`, crm_account: account!.id, owner_id: rep.id,
    }]);
    return { account: account!, contact: contact! };
  };
  const contractDoc = (p: { account: Rec; contact: Rec }, doc: Rec = {}): Rec => ({
    crm_account: p.account.id, crm_contact: p.contact.id, status: 'draft', contract_type: 'service',
    contract_term_months: 12, start_date: '2027-01-01', end_date: '2028-01-01', contract_value: 1_000, ...doc,
  });

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    rep = await signUpPerson(verify, 'rep@contract-name.test', {
      name: 'Name Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
  }, 180_000);

  it('a contract without a name is refused, on that field, at the engine and over REST', async () => {
    const p = await parties();
    const err = await refusal(verify.hooks.run('crm_contract', 'insert', contractDoc(p), { as: admin }));
    expect(err, 'a nameless contract was saved').not.toBeNull();
    expect(err).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((err!.fields as Rec[]).map((f) => f.field)).toContain('name');
    const res = await verify.apiAs(admin, 'POST', '/data/crm_contract', contractDoc(p));
    expect(res.status).toBe(400);
    const body = (await res.json()) as Rec;
    expect(body.code ?? body.error?.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(body)).toContain('Contract Name');
  });

  it('clearing a contract\'s name is refused, and the name is kept', async () => {
    const c = await verify.hooks.run('crm_contract', 'insert', contractDoc(await parties(), { name: 'Keep Me' }), { as: admin });
    const err = await refusal(verify.hooks.run('crm_contract', 'update', { id: c.id, name: null }, { as: admin }));
    expect(err).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((err!.fields as Rec[]).map((f) => f.field)).toContain('name');
    expect((await row('crm_contract', c.id)).name).toBe('Keep Me');
  });

  it('a contract saved before names existed still saves an edit that leaves the name alone', async () => {
    const c = await verify.hooks.run('crm_contract', 'insert', contractDoc(await parties(), { name: 'Soon Unnamed' }), { as: admin });
    // As an upgraded database holds it: no name, written past the engine.
    await verify.kernel.getService<Rec>('objectql').getDriverForObject('crm_contract').update('crm_contract', c.id, { name: null });
    expect((await row('crm_contract', c.id)).name ?? null).toBeNull();
    await verify.hooks.run('crm_contract', 'update', { id: c.id, description: 'Edited before it was named.' }, { as: admin });
    expect((await row('crm_contract', c.id)).description).toBe('Edited before it was named.');
  });

  it('search finds a contract by its name and by its number', async () => {
    const c = await verify.hooks.run('crm_contract', 'insert', contractDoc(await parties(), { name: 'Zephyr Phase Two' }), { as: admin });
    const stored = await row('crm_contract', c.id);
    for (const term of ['Zephyr Phase', String(stored.contract_number)]) {
      const res = await verify.apiAs(admin, 'GET', `/data/crm_contract?$search=${encodeURIComponent(term)}`);
      expect(res.status, term).toBe(200);
      const body = (await res.json()) as Rec;
      const ids = ((body.records ?? body.data ?? []) as Rec[]).map((r) => r.id);
      expect(ids, term).toContain(c.id);
    }
  });

  it('the invoice import still takes the contract number, and takes the name too', async () => {
    const p = await parties();
    const c = await verify.hooks.run('crm_contract', 'insert', contractDoc(p, { name: `Import Named ${k}` }), { as: admin });
    const { contract_number: number, name } = await row('crm_contract', c.id);
    const res = await verify.apiAs(admin, 'POST', '/data/crm_invoice/import', {
      mappingName: 'crm_invoice_import',
      format: 'csv',
      csv: [
        'ERP Reference,Invoice Number,Account,Order,Contract,Billing Milestone,Issue Date,Due Date,Amount,Status',
        `ERP-CN-1-${k},INV-CN-1-${k},,,${number},,2027-01-15,,100,Issued`,
        `ERP-CN-2-${k},INV-CN-2-${k},,,${name},,2027-01-15,,200,Issued`,
      ].join('\n') + '\n',
    });
    expect(res.status, await res.clone().text()).toBeLessThan(300);
    for (const ref of [`ERP-CN-1-${k}`, `ERP-CN-2-${k}`]) {
      const [invoice] = await verify.rows('crm_invoice', { erp_ref: ref });
      expect(invoice, ref).toBeTruthy();
      expect(invoice!.crm_contract, ref).toBe(c.id);
    }
  });

  describe('an accepted quote, with the automatic draft switched on, names its contract', () => {
    beforeAll(async () => {
      await switchFlow(verify, 'quote_accepted_contract_draft', true);
    });

    /** A quote the rep presents, then accepts after `before` ran on it; returns the drafted contract. */
    const draftOf = async (before: (quoteId: string) => Promise<void> = async () => {}): Promise<{ contract: Rec; quote: Rec; opportunityName: string }> => {
      const n = ++k;
      const create = async (object: string, doc: Rec) =>
        String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
      const account = await create('crm_account', { name: `Quote Named Co ${n}` });
      const contact = await create('crm_contact', {
        first_name: 'Quinn', last_name: `Named ${n}`, email: `quinn${n}@contract-name.test`, crm_account: account,
      });
      const opportunityName = `Named deal ${n}`;
      const opportunity = await create('crm_opportunity', {
        name: opportunityName, crm_account: account, stage: 'proposal', amount: 1_000, close_date: '2030-06-30',
      });
      const id = await create('crm_quote', {
        name: `Annual Service ${n}`, crm_account: account, crm_contact: contact, crm_opportunity: opportunity,
        quote_date: today(), expiration_date: '2030-12-31', signed_copy: await committedFile(verify, rep.id),
      });
      for (const status of ['in_review', 'presented']) {
        await verify.hooks.run('crm_quote', 'update', { id, status }, { as: rep.token });
      }
      await before(id);
      const quote = await row('crm_quote', id);
      await verify.hooks.run('crm_quote', 'update', { id, status: 'accepted' }, { as: rep.token });
      const contract = await vi.waitFor(async () => {
        const [c] = await verify.rows('crm_contract', { crm_opportunity: opportunity });
        expect(c, 'the switched-on flow drafted no contract').toBeTruthy();
        return c!;
      }, { timeout: 15_000, interval: 50 });
      return { contract, quote, opportunityName };
    };

    it('with the quote\'s name', async () => {
      const { contract, quote } = await draftOf();
      expect(contract.name).toBe(quote.name);
    });

    it('with the opportunity\'s name when the quote has none', async () => {
      // No door saves a nameless quote; a stored one is written past the engine.
      const { contract, quote, opportunityName } = await draftOf(async (id) => {
        await verify.kernel.getService<Rec>('objectql').getDriverForObject('crm_quote').update('crm_quote', id, { name: '' });
      });
      expect(quote.name ?? '').toBe('');
      expect(contract.name).toBe(opportunityName);
    });
  });
});
