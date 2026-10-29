// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import { AUTO_DRAFTED_PREFIX } from '../src/sales/flows/contract-drafted-notice.flow';
import { REPO_ROOT } from './helpers/repo-root';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Accepting a quote says that it drafted a contract, with a link (#2371 row 6).
 *
 * Measured on 18.2.0 before this change: `quote_accepted_contract_draft` is an
 * `async` hook, so the acceptance showed only the quote's own save toast and
 * the drafted contract was found only by looking. `contract_drafted_notice`
 * now fires on that contract's insert and sends the person who accepted the
 * quote an inbox notice linking it, which the console also shows as a live
 * toast. Delete the flow, or let its trigger miss the hook's provenance
 * sentence, and this goes red.
 */

const today = (): string => new Date().toISOString().slice(0, 10);

let verify: VerifyStack;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@contract-drafted-notice.test', {
    name: 'Drafted Notice Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

describe('the trigger reads the sentence the hook writes', () => {
  it('both provenance sentences of quote_accepted_contract_draft start with the prefix', () => {
    const hook = readFileSync(join(REPO_ROOT, 'src/revenue/objects/quote.hook.ts'), 'utf8');
    expect(hook).toContain(`\`${AUTO_DRAFTED_PREFIX} accepted quote \${quoteLabel}\``);
    expect(hook).toContain(`'${AUTO_DRAFTED_PREFIX} an accepted quote'`);
  });
});

describe('the rep who accepts a quote is told its contract was drafted (#2371 row 6)', () => {
  it('one inbox notice, linking the drafted contract by its number', async () => {
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
      await verify.hooks.run('crm_quote', 'update', { id, status }, { as: rep.token });
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
    expect(notices[0]!.payload?.templateData?.contract_number).toBe(contract!.contract_number);
    expect(String(contract!.contract_number).length).toBeGreaterThan(0);
  });

  it('a contract written by hand sends no notice', async () => {
    const before = (await verify.rows('sys_notification_delivery', { topic: 'contract_drafted' })).length;
    const [account] = await verify.seed('crm_account', [{ name: 'Hand Contract Co', owner_id: rep.id }]);
    const [contact] = await verify.seed('crm_contact', [{ first_name: 'Hal', last_name: 'Hand', email: 'hal@drafted-notice.test', crm_account: account!.id, owner_id: rep.id }]);
    const admin = await verify.signIn();
    await verify.hooks.run('crm_contract', 'insert', {
      crm_account: account!.id, crm_contact: contact!.id, status: 'draft', start_date: '2030-01-01', end_date: '2031-01-01',
      contract_term_months: 12, contract_type: 'service', contract_value: 5_000, description: 'Signed on paper.',
    }, { as: admin });
    await new Promise((r) => setTimeout(r, 500));
    expect((await verify.rows('sys_notification_delivery', { topic: 'contract_drafted' })).length).toBe(before);
  });
});
