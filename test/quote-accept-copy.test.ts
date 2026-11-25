// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { templateEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import { AcceptQuoteAction } from '../src/revenue/actions/quote.actions';
import { QuoteAcceptedOrderFlow } from '../src/revenue/flows/quote-accepted-order.flow';
import { QuoteAcceptedContractDraftFlow } from '../src/revenue/flows/quote-accepted-contract-draft.flow';
import { localePacks } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, today, committedFile, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * What Accept tells the rep is what accepting does (#2752).
 *
 * Measured on the hosted 6.6.0: the confirmation said "a contract is drafted",
 * while since #2558 an accepted quote creates an order and the automatic
 * contract draft ships switched off — reps went looking for a contract that
 * did not exist. The wording now follows the shipped switches: the order is
 * announced, and the contract is offered from the order, or drafted as well
 * only where an administrator has switched that on.
 *
 * What is pinned:
 *
 *  - the SWITCHES the wording describes: the order flow ships on, the contract
 *    flow off. Either default moving makes the wording false, so it turns this
 *    red before it reaches a rep;
 *  - the SOURCE: the action's English is the English pack's, and every one of
 *    the four packs carries both sentences, its toast naming the quote;
 *  - the CLAIM the toast makes: the order exists by the time the action door
 *    answers, so "its order has been created" is true when it is shown.
 */

const packEntry = (pack: Rec): Rec => pack?.objects?.crm_quote?._actions?.accept_quote ?? {};
const textOf = (copy: unknown): string => String((copy as Rec)?.source ?? copy ?? '');
const render = (source: string, record: Rec): string => {
  const r = templateEngine.evaluate({ dialect: 'template', source }, { record } as Rec);
  if (!r.ok) throw new Error(`does not render: ${r.error.message}`);
  return String(r.value);
};

describe('the switches Accept describes ship as the wording says', () => {
  it('the accepted-quote order flow ships on', () => {
    expect(QuoteAcceptedOrderFlow.status).toBe('active');
    expect((QuoteAcceptedOrderFlow as Rec).defaultActive).not.toBe(false);
  });

  it('the automatic contract draft ships off', () => {
    expect((QuoteAcceptedContractDraftFlow as Rec).defaultActive).toBe(false);
  });
});

describe('Accept says an order is created, in all four languages', () => {
  const confirm = textOf(AcceptQuoteAction.confirmText);
  const success = textOf(AcceptQuoteAction.successMessage);

  it('the English source announces the order and makes the contract conditional', () => {
    expect(confirm).toMatch(/an order is created/);
    expect(confirm).toMatch(/draft it from the order/);
    expect(confirm).toMatch(/Where an administrator has switched on automatic contract drafting/);
    expect(success).toMatch(/Its order has been created/);
  });

  it('the English pack is the source, word for word', () => {
    const en = localePacks.find(([locale]) => locale === 'en')?.[1];
    expect(textOf(packEntry(en!).confirmText)).toBe(confirm);
    expect(textOf(packEntry(en!).successMessage)).toBe(success);
  });

  it('the four packs are the app\'s four languages', () => {
    expect(localePacks.map(([locale]) => locale).sort()).toEqual(['en', 'es-ES', 'ja-JP', 'zh-CN']);
  });

  it.each(localePacks)('%s carries the confirmation and a toast that names the quote', (_locale, pack) => {
    const entry = packEntry(pack);
    expect(textOf(entry.confirmText).length).toBeGreaterThan(0);
    expect(render(textOf(entry.successMessage), { name: 'Spring Renewal' })).toContain('Spring Renewal');
  });
});

let verify: VerifyStack;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@quote-accept-copy.test', {
    name: 'Copy Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

describe('the toast\'s claim holds when it is shown', () => {
  it('Accept answers after the order exists, and with the switches as shipped drafts no contract', async () => {
    const create = async (object: string, doc: Rec) =>
      String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
    const account = await create('crm_account', { name: 'Copy Co' });
    const contact = await create('crm_contact', {
      first_name: 'Cora', last_name: 'Copy', email: 'cora@quote-accept-copy.test', crm_account: account,
    });
    const opportunity = await create('crm_opportunity', {
      name: 'Copy deal', crm_account: account, stage: 'proposal', amount: 5_000, close_date: '2030-06-30',
    });
    const id = await create('crm_quote', {
      name: 'Copy quote', crm_account: account, crm_contact: contact, crm_opportunity: opportunity,
      quote_date: today(), expiration_date: '2030-12-31', signed_copy: await committedFile(verify, rep.id),
    });
    for (const status of ['in_review', 'presented']) {
      await verify.hooks.run('crm_quote', 'update', { id, status }, { as: rep.token });
    }

    await verify.actions.run('crm_quote', 'accept_quote', { as: rep.token, recordId: id });

    // Read at once, with no wait: the toast is shown when the door answers.
    expect(await verify.rows('crm_sales_order', { crm_quote: id })).toHaveLength(1);
    expect(await verify.rows('crm_contract', { crm_account: account })).toHaveLength(0);
  });
});
