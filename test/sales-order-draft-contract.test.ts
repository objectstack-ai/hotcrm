// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { ExpressionEngine } from '@objectstack/formula';
import { DraftContractAction } from '../src/sales/actions/sales_order.actions';
import { QuoteAcceptedContractDraftFlow } from '../src/revenue/flows/quote-accepted-contract-draft.flow';
import { SalesOrderDraftContractFlow, SalesOrderDraftContractWriteFlow } from '../src/sales/flows/sales-order-draft-contract.flow';
import { CONTRACT_DRAFT_NODE_IDS, DRAFT_CONTRACT_DEFAULTS } from '../src/sales/flows/_contract-draft';
import {
  hotcrmStack, signUpPerson, switchFlow, notificationsTo, today, committedFile, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Draft Contract on an order (REQ-0010 rule 2, hotcrm#2558): the contract an
 * accepted quote used to draft by itself, drafted from the order on demand
 * (`draft_contract` → `sales_order_draft_contract` → its system callee
 * `sales_order_draft_contract_write`).
 *
 * Driven as a sales rep — who holds `crm_contract.allowCreate: false` — on the
 * order an accepted quote created, through the flow door the action uses. The
 * contract is compared field for field with the one the automatic draft makes
 * when an administrator switches `quote_accepted_contract_draft` on.
 *
 * A cancelled order gets no contract (hotcrm#2756): the button is not offered
 * on it, and the flow refuses it with nothing written. Only Cancelled is
 * closed: Draft, Confirmed and Completed orders are offered the button.
 */

let verify: VerifyStack;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@sales-order-draft-contract.test', {
    name: 'Draft Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

let n = 0;
/** An accepted quote with one line, and the order it created. */
const acceptedQuote = async (): Promise<{ quote: Rec; order: Rec; opportunity: string }> => {
  const k = ++n;
  const create = async (object: string, doc: Rec) =>
    String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
  const account = await create('crm_account', { name: `Draft Order Co ${k}` });
  const contact = await create('crm_contact', {
    first_name: 'Dot', last_name: `Order ${k}`, email: `dot${k}@draft-order.test`, crm_account: account,
  });
  const opportunity = await create('crm_opportunity', {
    name: `Draft order deal ${k}`, crm_account: account, stage: 'proposal', amount: 3_000, close_date: '2030-06-30',
  });
  const id = await create('crm_quote', {
    name: `Draft order quote ${k}`, crm_account: account, crm_contact: contact, crm_opportunity: opportunity,
    quote_date: today(), expiration_date: '2030-12-31', payment_terms: 'due_on_receipt', tax: 100,
    signed_copy: await committedFile(verify, rep.id),
  });
  const [product] = await verify.seed('crm_product', [{ name: `Draft order widget ${k}`, list_price: 1_500, is_active: true }]);
  await create('crm_quote_line_item', { crm_quote: id, crm_product: product.id, quantity: 2, unit_price: 1_450 });
  for (const status of ['in_review', 'presented', 'accepted']) {
    await verify.hooks.run('crm_quote', 'update', { id, status }, { as: rep.token });
  }
  const order = await vi.waitFor(async () => {
    const [row] = await verify.rows('crm_sales_order', { crm_quote: id });
    expect(row, 'the accepted quote created no order').toBeTruthy();
    return row!;
  }, { timeout: 15_000, interval: 50 });
  const [quote] = await verify.rows('crm_quote', { id });
  return { quote: quote!, order, opportunity };
};

/**
 * Whether the button is offered on `record` to a person who may edit orders —
 * the action's `visible`, through the platform's own evaluator, as the
 * console evaluates it (`test/app-navigation-audience.test.ts`).
 */
const offered = (record: Rec): boolean => {
  const result = ExpressionEngine.evaluate<boolean>(DraftContractAction.visible as never, {
    record,
    user: { id: rep.id, positions: ['crm_sales_rep'] },
    permissions: { crm_sales_order: { allowRead: true, allowEdit: true } } as never,
  } as never);
  expect(result.ok, `draft_contract.visible did not evaluate: ${JSON.stringify(result)}`).toBe(true);
  return (result as Rec).value === true;
};

/** Run Draft Contract on `orderId` as the rep, through the flow door the action uses. */
const draftContract = (orderId: string) =>
  verify.flows.run(DraftContractAction.target as string, { recordId: orderId, objectName: 'crm_sales_order' }, { as: rep.token }) as Promise<Rec>;

/** Move `orderId` one step of the order machine as the rep, through the action door the console posts to. */
const move = (action: 'confirm_sales_order' | 'cancel_sales_order', orderId: string) =>
  verify.actions.run('crm_sales_order', action, { as: rep.token, recordId: orderId });

/** The sentence a refusal node answers with, as the flow declares it. */
const refusalOf = (node: string): string => {
  const end = (SalesOrderDraftContractFlow.nodes as Rec[]).find((x) => x.id === node);
  if (!end) throw new Error(`sales_order_draft_contract has no ${node} node`);
  return String(end.config.message);
};

/** `iso` plus `months` calendar months, on the UTC calendar. */
const monthsOn = (iso: string, months: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

/** The fields a draft carries, for comparing two drafts. Dates and the provenance sentence are the source's own. */
const DRAFT_FIELDS = [
  'status', 'contract_type', 'contract_term_months', 'start_date', 'end_date', 'contract_value',
  'crm_account', 'crm_contact', 'crm_opportunity', 'owner_id', 'payment_terms', 'automation_key', 'created_by',
] as const;
const draftShape = (c: Rec) => Object.fromEntries(DRAFT_FIELDS.map((f) => [f, c[f] ?? null]));

describe('Draft Contract drafts the order\'s contract and names it on the order', () => {
  let fixture: Awaited<ReturnType<typeof acceptedQuote>>;
  let run: Rec;
  let contract: Rec;
  beforeAll(async () => {
    fixture = await acceptedQuote();
    run = await draftContract(fixture.order.id);
    [contract] = await verify.rows('crm_contract', { crm_opportunity: fixture.opportunity });
  }, 60_000);

  it('drafts one contract, as a rep who may not create one', () => {
    // The two flows under test, by the names the runtime-coverage guard reads.
    expect(DraftContractAction.target).toBe('sales_order_draft_contract');
    expect(SalesOrderDraftContractWriteFlow.name).toBe('sales_order_draft_contract_write');
    expect(contract, 'Draft Contract drafted nothing').toBeTruthy();
    expect(run.status, `the run: ${JSON.stringify(run.error ?? run.status)}`).toBe('paused');
    const link = ((run.screen?.fields ?? []) as Rec[]).find((f) => f.name === 'contractLink');
    expect(link?.defaultValue, 'the result screen does not link the contract').toBe(contract.id);
  });

  it('names it on the order', async () => {
    const [order] = await verify.rows('crm_sales_order', { id: fixture.order.id });
    expect(order!.crm_contract).toBe(contract.id);
  });

  it('is the automatic draft\'s contract, from the order', () => {
    expect(draftShape(contract)).toEqual({
      status: 'draft', contract_type: 'subscription', contract_term_months: DRAFT_CONTRACT_DEFAULTS.contract_term_months,
      start_date: today(), end_date: monthsOn(today(), DRAFT_CONTRACT_DEFAULTS.contract_term_months),
      contract_value: fixture.order.total_price,
      crm_account: fixture.order.crm_account, crm_contact: fixture.order.crm_contact,
      crm_opportunity: fixture.opportunity, owner_id: rep.id, payment_terms: 'due_on_receipt',
      automation_key: 'quote_acceptance', created_by: rep.id,
    });
    expect(contract.contract_value).toBe(fixture.quote.total_price);
    expect(contract.description).toBe(`Drafted from order ${fixture.order.order_number} - ${fixture.order.name}`);
  });

  it('is titled with the order\'s name, the accepted quote\'s (hotcrm#2746)', () => {
    expect(fixture.order.name).toBe(fixture.quote.name);
    expect(contract.name).toBe(fixture.order.name);
  });

  it('tells the rep once, as every drafted contract does', async () => {
    await vi.waitFor(async () => {
      const notices = (await notificationsTo(verify, rep.id, 'contract_drafted'))
        .filter((x) => x.payload?.actionUrl === `/crm_contract/${contract.id}`);
      expect(notices, 'the drafted-contract notice fires exactly once').toHaveLength(1);
    }, { timeout: 15_000, interval: 100 });
  });

  it('is no longer offered, and a second run is refused with nothing drafted', async () => {
    const [order] = await verify.rows('crm_sales_order', { id: fixture.order.id });
    expect(offered(order!)).toBe(false);
    const again = await draftContract(fixture.order.id);
    expect(again.status).toBe('refused');
    expect(await verify.rows('crm_contract', { crm_opportunity: fixture.opportunity })).toHaveLength(1);
  });
});

describe('the same contract the automatic draft drafts', () => {
  it('equals, field for field, the contract an accepted quote drafts with the flow switched on', async () => {
    const byAction = await acceptedQuote();
    await draftContract(byAction.order.id);
    const [fromOrder] = await verify.rows('crm_contract', { crm_opportunity: byAction.opportunity });

    await switchFlow(verify, 'quote_accepted_contract_draft', true);
    let byFlow: Awaited<ReturnType<typeof acceptedQuote>>;
    try {
      byFlow = await acceptedQuote();
    } finally {
      await switchFlow(verify, 'quote_accepted_contract_draft', false);
    }
    const fromQuote = await vi.waitFor(async () => {
      const [row] = await verify.rows('crm_contract', { crm_opportunity: byFlow!.opportunity });
      expect(row, 'the switched-on flow drafted no contract').toBeTruthy();
      return row!;
    }, { timeout: 15_000, interval: 50 });

    const sameExceptLinks = (c: Rec) => {
      const { crm_account: _a, crm_contact: _c, crm_opportunity: _o, ...rest } = draftShape(c);
      return rest;
    };
    expect(sameExceptLinks(fromOrder!)).toEqual(sameExceptLinks(fromQuote));
  });

  it('both flows draft through the same four nodes, writing the same keys', () => {
    const drafts = (flow: Rec) => Object.fromEntries((flow.nodes as Rec[])
      .filter((node) => node.type === 'create_record' && node.config.objectName === 'crm_contract')
      .map((node) => [node.id, Object.keys(node.config.fields).sort()]));
    expect(Object.keys(drafts(QuoteAcceptedContractDraftFlow))).toEqual(CONTRACT_DRAFT_NODE_IDS);
    // The order's draft adds two keys of its own (hotcrm#2804): it is an order
    // contract, naming the order it came from. The quote's draft has no order.
    const fromQuote = drafts(QuoteAcceptedContractDraftFlow);
    expect(drafts(SalesOrderDraftContractWriteFlow)).toEqual(Object.fromEntries(Object.entries(fromQuote)
      .map(([id, keys]) => [id, [...keys, 'contract_form', 'crm_sales_order'].sort()])));
  });
});

describe('the offer follows the order\'s status', () => {
  it.each([
    ['draft', true],
    ['confirmed', true],
    ['completed', true],
    ['cancelled', false],
  ] as const)('a %s order that names no contract: offered is %s', (status, expected) => {
    expect(offered({ status })).toBe(expected);
  });

  it('is withheld before the record has loaded', () => {
    expect(offered({})).toBe(false);
  });

  it('a confirmed order still drafts its contract', async () => {
    const { order, opportunity } = await acceptedQuote();
    await move('confirm_sales_order', order.id);
    const [confirmed] = await verify.rows('crm_sales_order', { id: order.id });
    expect(confirmed!.status).toBe('confirmed');
    expect(offered(confirmed!)).toBe(true);
    const run = await draftContract(order.id);
    expect(run.status, `the run: ${JSON.stringify(run.error ?? run.status)}`).toBe('paused');
    const [contract] = await verify.rows('crm_contract', { crm_opportunity: opportunity });
    expect(contract, 'Draft Contract drafted nothing on a confirmed order').toBeTruthy();
    expect((await verify.rows('crm_sales_order', { id: order.id }))[0]!.crm_contract).toBe(contract!.id);
  }, 60_000);
});

describe('refused, with nothing drafted', () => {
  it('a cancelled order: no button, and the door refuses with the order left as it was', async () => {
    // The order has a contact and names no contract: but for its status it
    // would draft, so the refusal can only be the cancelled one.
    const { order, opportunity } = await acceptedQuote();
    await move('cancel_sales_order', order.id);
    const [cancelled] = await verify.rows('crm_sales_order', { id: order.id });
    expect(cancelled!.status).toBe('cancelled');
    expect(cancelled!.crm_contact, 'the fixture order has no contact').toBeTruthy();
    expect(offered(cancelled!)).toBe(false);

    const run = await draftContract(order.id);
    expect(run.status).toBe('refused');
    expect(run.refusalMessage).toBe(refusalOf('refuse_cancelled'));
    expect(String(run.refusalMessage)).toContain('No contract was drafted');
    expect(await verify.rows('crm_contract', { crm_opportunity: opportunity })).toHaveLength(0);
    const [after] = await verify.rows('crm_sales_order', { id: order.id });
    expect(after!.crm_contract ?? null).toBeNull();
    expect(after!.status).toBe('cancelled');
  }, 60_000);

  it('an order with no contact: a contract names its primary contact', async () => {
    const { order, opportunity } = await acceptedQuote();
    await verify.hooks.run('crm_sales_order', 'update', { id: order.id, crm_contact: null }, { as: rep.token });
    const run = await draftContract(order.id);
    expect(run.status).toBe('refused');
    expect(await verify.rows('crm_contract', { crm_opportunity: opportunity })).toHaveLength(0);
  });

  it('an order under a framework contract just names that contract: no button, and the door refuses', async () => {
    const { order, opportunity } = await acceptedQuote();
    const [framework] = await verify.seed('crm_contract', [{
      crm_account: order.crm_account, crm_contact: order.crm_contact, contract_type: 'msa', status: 'draft', contract_value: 250_000,
      name: 'Fixture Contract', contract_term_months: 24, start_date: today(), end_date: monthsOn(today(), 24), owner_id: rep.id,
    }]);
    await verify.hooks.run('crm_sales_order', 'update', { id: order.id, crm_contract: framework!.id }, { as: rep.token });
    const [stored] = await verify.rows('crm_sales_order', { id: order.id });
    expect(stored!.crm_contract).toBe(framework!.id);
    expect(offered(stored!)).toBe(false);
    expect((await draftContract(order.id)).status).toBe('refused');
    expect(await verify.rows('crm_contract', { crm_opportunity: opportunity })).toHaveLength(0);
  });

  it('is offered on an order that names no contract', async () => {
    const { order } = await acceptedQuote();
    expect(offered(order)).toBe(true);
  });
});
