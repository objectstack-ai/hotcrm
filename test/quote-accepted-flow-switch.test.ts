// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, signUpPerson, switchFlow, flowRuns, notificationsTo, today, committedFile, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Measurement (1) of hotcrm#2558: can a PACKAGED flow make the elevated
 * contract write the hook made?
 *
 * `quote_accepted_contract_draft` was an `async` `runAs: 'system'` hook because
 * the accepting rep may not hold contract create (#2014). It is now a packaged
 * flow, `runAs: 'system'`, shipped switched OFF. Here a sales rep, who holds
 * `crm_contract.allowCreate: false`, accepts a quote on their own deal with
 * the flow switched ON through the administrator's door, and the contract is
 * drafted, attributed to the rep, and the rep is told once. The same rep's own
 * create of a contract is still refused, so nothing about their grants moved.
 */

let verify: VerifyStack;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@quote-accepted-flow-switch.test', {
    name: 'Switch Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

let n = 0;
/** A presented quote on the rep's own account, contact and deal, with one line. */
const presentedQuote = async (): Promise<{ id: string; opportunity: string }> => {
  const k = ++n;
  const create = async (object: string, doc: Rec) =>
    String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
  const account = await create('crm_account', { name: `Switch Co ${k}` });
  const contact = await create('crm_contact', {
    first_name: 'Sam', last_name: `Switch ${k}`, email: `sam${k}@flow-switch.test`, crm_account: account,
  });
  const opportunity = await create('crm_opportunity', {
    name: `Switch deal ${k}`, crm_account: account, stage: 'proposal', amount: 2_000, close_date: '2030-06-30',
  });
  const id = await create('crm_quote', {
    name: `Switch quote ${k}`, crm_account: account, crm_contact: contact, crm_opportunity: opportunity,
    quote_date: today(), expiration_date: '2030-12-31', signed_copy: await committedFile(verify, rep.id),
  });
  const [product] = await verify.seed('crm_product', [{ name: `Switch widget ${k}`, list_price: 2_000, is_active: true }]);
  await create('crm_quote_line_item', { crm_quote: id, crm_product: product.id, quantity: 1, unit_price: 2_000 });
  for (const status of ['in_review', 'presented']) {
    await verify.hooks.run('crm_quote', 'update', { id, status }, { as: rep.token });
  }
  return { id, opportunity };
};

const accept = (id: string) => verify.hooks.run('crm_quote', 'update', { id, status: 'accepted' }, { as: rep.token });

describe('the contract flow ships off: an accepted quote drafts no contract', () => {
  it('no contract and no contract-flow run, on the shipped default', async () => {
    const q = await presentedQuote();
    await accept(q.id);
    // The order flow runs in the accepting write; wait for its order, then
    // read the contract side, which has had the same chance to run.
    await vi.waitFor(async () => {
      expect(await verify.rows('crm_sales_order', { crm_quote: q.id })).toHaveLength(1);
    }, { timeout: 15_000, interval: 50 });
    expect(await verify.rows('crm_contract', { crm_opportunity: q.opportunity })).toHaveLength(0);
    expect(await flowRuns(verify, 'quote_accepted_contract_draft', q.id)).toHaveLength(0);
  });
});

describe('switched on, a rep who may not create a contract still gets one drafted (#2014)', () => {
  beforeAll(async () => {
    await switchFlow(verify, 'quote_accepted_contract_draft', true);
  });

  it('the rep holds no contract create: their own insert is refused', async () => {
    await expect(verify.hooks.run('crm_contract', 'insert', {
      crm_account: (await verify.rows('crm_account', { name: 'Switch Co 1' }))[0]!.id,
      contract_type: 'subscription', contract_term_months: 12, start_date: today(), status: 'draft',
    }, { as: rep.token })).rejects.toBeTruthy();
  });

  it('the elevated flow drafts the contract, attributed to the rep, and tells them once', async () => {
    const q = await presentedQuote();
    await accept(q.id);
    const contract = await vi.waitFor(async () => {
      const [row] = await verify.rows('crm_contract', { crm_opportunity: q.opportunity });
      expect(row, 'the switched-on flow drafted no contract').toBeTruthy();
      return row!;
    }, { timeout: 15_000, interval: 50 });
    expect(contract).toMatchObject({
      status: 'draft', contract_type: 'subscription', contract_term_months: 12, contract_value: 2_000,
      automation_key: 'quote_acceptance', created_by: rep.id, owner_id: rep.id,
    });
    const [run] = await flowRuns(verify, 'quote_accepted_contract_draft', q.id);
    expect(run?.status, `the draft's run: ${String(run?.error ?? '')}`).toBe('completed');
    await vi.waitFor(async () => {
      const notices = (await notificationsTo(verify, rep.id, 'contract_drafted'))
        .filter((x) => x.payload?.actionUrl === `/crm_contract/${contract.id}`);
      expect(notices, 'the drafted-contract notice fires exactly once').toHaveLength(1);
    }, { timeout: 15_000, interval: 100 });
  });
});
