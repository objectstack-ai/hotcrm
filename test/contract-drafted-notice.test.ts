// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { QUOTE_ACCEPTANCE_KEY, ContractDraftedNoticeFlow } from '../src/sales/flows/contract-drafted-notice.flow';
import { QuoteAcceptedContractDraftFlow } from '../src/revenue/flows/quote-accepted-contract-draft.flow';
import { SalesOrderDraftContractWriteFlow } from '../src/sales/flows/sales-order-draft-contract.flow';
import { hotcrmStack, signUpPerson, switchFlow, committedFile, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Accepting a quote says that it drafted a contract, with a link (#2371 row 6).
 *
 * Measured on 18.2.0 before this change: `quote_accepted_contract_draft` is an
 * `async` hook, so the acceptance showed only the quote's own save toast and
 * the drafted contract was found only by looking. `contract_drafted_notice`
 * now fires on that contract's insert and sends the person who accepted the
 * quote an inbox notice linking it, which the console also shows as a live
 * toast. Delete the flow, or let its trigger miss the key the draft stamps,
 * and this goes red.
 *
 * Since hotcrm#2558 the automatic draft is a packaged flow shipped switched
 * OFF (`quote_accepted_contract_draft`); this suite switches it on through the
 * administrator's door, which is the behaviour it pins. The order's Draft
 * Contract stamps the same key (`test/sales-order-draft-contract.test.ts`).
 */

const today = (): string => new Date().toISOString().slice(0, 10);

let verify: VerifyStack;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@contract-drafted-notice.test', {
    name: 'Drafted Notice Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  await switchFlow(verify, 'quote_accepted_contract_draft', true);
}, 120_000);

describe('the trigger reads the key the draft stamps, not its sentence (#2535)', () => {
  it.each([QuoteAcceptedContractDraftFlow, SalesOrderDraftContractWriteFlow])('$name stamps the key the trigger matches on every draft', (flow) => {
    const drafts = (flow.nodes as Rec[]).filter((n) => n.type === 'create_record' && n.config?.objectName === 'crm_contract');
    expect(drafts.length, `${flow.name} drafts no contract`).toBeGreaterThan(0);
    for (const node of drafts) expect(node.config.fields.automation_key, node.id).toBe(QUOTE_ACCEPTANCE_KEY);
  });
});

describe('the rep who accepts a quote is told its contract was drafted (#2371 row 6)', () => {
  it('one inbox notice, linking the drafted contract by its number', async () => {
    // The flow under test, by the name the runtime-coverage guard reads.
    expect(ContractDraftedNoticeFlow.name).toBe('contract_drafted_notice');
    const create = async (object: string, doc: Rec) =>
      String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
    const account = await create('crm_account', { name: 'Drafted Notice Co' });
    const contact = await create('crm_contact', {
      first_name: 'Dana', last_name: 'Drafted', email: 'dana@drafted-notice.test', crm_account: account,
    });
    const opportunity = await create('crm_opportunity', {
      name: 'Drafted Notice deal', crm_account: account, stage: 'proposal', amount: 1_000, close_date: '2030-06-30',
    });
    const id = await create('crm_quote', {
      name: 'Drafted Notice quote', crm_account: account, crm_contact: contact, crm_opportunity: opportunity,
      quote_date: today(), expiration_date: '2030-12-31',
    });
    for (const status of ['in_review', 'presented', 'accepted']) {
      // Accepted requires the signed copy (#2317): the rep files it on that save.
      const signed = status === 'accepted' ? { signed_copy: await committedFile(verify, rep.id) } : {};
      await verify.hooks.run('crm_quote', 'update', { id, status, ...signed }, { as: rep.token });
    }

    const notices = await vi.waitFor(async () => {
      const rows = await verify.rows('sys_notification_delivery', { recipient_id: rep.id, topic: 'contract_drafted' });
      expect(rows, 'no contract_drafted notice reached the rep').toHaveLength(1);
      return rows;
    }, { timeout: 15_000, interval: 100 });
    const [contract] = await verify.rows('crm_contract', { crm_opportunity: opportunity });
    expect(contract, 'no contract was drafted').toBeTruthy();
    expect(notices[0]!.channel).toBe('inbox');
    expect(notices[0]!.payload?.actionUrl).toBe(`/crm_contract/${contract!.id}`);
    expect(notices[0]!.payload?.templateData?.contract).toBe(`${contract!.contract_number} · ${contract!.name}`);
    expect(String(contract!.contract_number).length).toBeGreaterThan(0);
  });

  it('a contract written by hand sends no notice', async () => {
    const before = (await verify.rows('sys_notification_delivery', { topic: 'contract_drafted' })).length;
    const [account] = await verify.seed('crm_account', [{ name: 'Hand Contract Co', owner_id: rep.id }]);
    const [contact] = await verify.seed('crm_contact', [{ first_name: 'Hal', last_name: 'Hand', email: 'hal@drafted-notice.test', crm_account: account!.id, owner_id: rep.id }]);
    const admin = await verify.signIn();
    await verify.hooks.run('crm_contract', 'insert', {
      crm_account: account!.id, crm_contact: contact!.id, status: 'draft', start_date: '2030-01-01', end_date: '2031-01-01',
      name: 'Fixture Contract', contract_term_months: 12, contract_type: 'service', contract_value: 5_000, description: 'Signed on paper.',
    }, { as: admin });
    await new Promise((r) => setTimeout(r, 500));
    expect((await verify.rows('sys_notification_delivery', { topic: 'contract_drafted' })).length).toBe(before);
  });
});
