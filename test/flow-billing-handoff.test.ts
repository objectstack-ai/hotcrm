// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, predicateUpdate, type Person } from './helpers/verify-stack';
import { BillingHandoffClosedWonFlow } from '../src/sales/flows/billing-handoff-closed-won.flow';
import { BillingHandoffContractActivatedFlow } from '../src/revenue/flows/billing-handoff-contract-activated.flow';
import {
  BILLING_HANDOFF_ENDPOINT,
  BILLING_HANDOFF_EVENT,
  BILLING_HANDOFF_PAYLOAD_VERSION,
} from '../src/sales/flows/_billing-endpoint';

type Rec = Record<string, any>;

/**
 * ═══ Billing hand-off: one delivery per transition, never per edit (#600) ══
 *
 * HotCRM's revenue scope ends at the signed contract. The hand-off to whatever
 * bills the customer is two outbound events, and the card's acceptance is
 * exactly two claims about them:
 *
 *   1. closing a deal won / activating a contract **enqueues a delivery, with
 *      retry semantics**;
 *   2. it enqueues **one**, not one per subsequent save.
 *
 * These run on the shipped app booted by `@objectstack/verify`: a rep's real
 * save fires the bound `record_change` flow, the platform's builtin `http`
 * executor takes its durable branch, and the messaging service writes the
 * delivery into its outbox, `sys_http_delivery` — the row its dispatcher
 * drains with retry / backoff / dead-letter. What is asserted is that row:
 * that the save REACHES the outbox, once, with the right payload. Retry,
 * backoff, dead-letter and HMAC live inside the platform package
 * (`nextRetryDelayMs`, `HttpDispatcher`, `sendOnce`'s
 * `X-Objectstack-Signature`) and are its tests to run, not this app's.
 *
 * One seam is not the platform's, and it is named here: the RECEIVER. The
 * dispatcher really does POST each row to the configured endpoint, so `fetch`
 * is stubbed to answer `503` — the receiver is down, which is the case a
 * durable delivery exists for — and no request leaves the test process.
 *
 * ## Reverse verification, predicted before it was run
 *
 * The load-bearing term is `previous.stage != "closed_won"`. Predicted: remove
 * it and the "later edit" case flips from zero deliveries to one — a DUPLICATE
 * hand-off, i.e. the billing system is told to bill the same deal twice. That
 * direction is asserted in-test (`the transition term is what makes it once`)
 * rather than described, because it is the whole reason this flow is a flow and
 * not a declared `sys_webhook` subscription, which can only match object +
 * action and would fire on every edit.
 */

let verify: VerifyStack;
let rep: Person;
let manager: Person;
let products: Rec[];
let k = 0;
beforeAll(async () => {
  vi.stubGlobal('fetch', async () => new Response('receiver down', { status: 503 }));
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@flow-billing-handoff.test', {
    name: 'Billing Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  // A contract is drafted and activated by a sales manager: `sales_rep` may read
  // `crm_contract` but not create or edit it.
  manager = await signUpPerson(verify, 'manager@flow-billing-handoff.test', {
    name: 'Billing Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  products = await verify.seed('crm_product', [
    { name: 'Platform subscription', product_code: 'BH-SUB', list_price: 20000, is_active: true },
    { name: 'Onboarding', product_code: 'BH-ONB', list_price: 88000, is_active: true },
  ]);
}, 120_000);

const as = (who: Person) => ({ as: who.token });

/**
 * The rep's deal, its account and its two line items, as they stand just
 * before the close.
 *
 * The account and the deal are written as the system, owned by the rep: the
 * account carries `annual_revenue`, which `sales_rep` may read but not edit,
 * and the deal is a $250K one whose large-deal approval has already landed
 * (`approval_status: 'approved'`) — a save on a large deal still awaiting one
 * would open an approval and lock it. The line items are the rep's own
 * writes, so their numbering and price fill are the app's.
 */
async function deal(stage = 'negotiation'): Promise<{ account: Rec; opp: Rec; items: Rec[] }> {
  const n = ++k;
  const [account] = await verify.seed('crm_account', [{
    name: `Northwind Traders ${n}`,
    account_number: `ACC-BH-${n}`,
    billing_address: { street: '1 Market St', city: 'Seattle', country: 'US' },
    billing_country: 'US',
    phone: '+1-206-555-0100',
    website: 'https://northwind.example.com',
    // Not in the payload contract — its absence from the delivered body is what
    // proves the account block is authored rather than a whole-row dump.
    annual_revenue: 9_000_000,
    owner_id: rep.id,
  }]);
  const [opp] = await verify.seed('crm_opportunity', [{
    name: `Northwind — Platform Rollout ${n}`, amount: 250000, close_date: '2030-08-31', stage,
    type: 'new_business', approval_status: 'approved', crm_account: account!.id, owner_id: rep.id,
  }]);
  const items = [
    await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: opp!.id, crm_product: products[0]!.id, description: 'Platform subscription',
      quantity: 10, unit_price: 18000, discount: 10,
    }, as(rep)),
    await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: opp!.id, crm_product: products[1]!.id, description: 'Onboarding',
      quantity: 1, unit_price: 88000, discount: 0,
    }, as(rep)),
  ];
  return { account: account!, opp: opp!, items };
}

/** The rep closes the deal won — the transition the hand-off is bound to. */
const closeWon = (oppId: string) =>
  verify.hooks.run('crm_opportunity', 'update', { id: oppId, stage: 'closed_won', win_reason: 'better_price' }, as(rep));

/** Every delivery in the outbox whose payload is about `subject` (a deal or a contract id). */
async function deliveriesFor(subject: string): Promise<Rec[]> {
  const rows = await verify.rows('sys_http_delivery', { url: BILLING_HANDOFF_ENDPOINT });
  return rows
    .map((d) => ({ ...d, payload: JSON.parse(String(d.payload_json)) }))
    .filter((d) => d.payload.opportunity?.id === subject || d.payload.contract?.id === subject);
}

describe('billing hand-off — closed-won (#600)', () => {
  it('enqueues exactly one DURABLE delivery on the transition into closed_won', async () => {
    const { opp } = await deal();
    await closeWon(opp.id);

    const deliveries = await deliveriesFor(opp.id);
    expect(deliveries).toHaveLength(1);
    const d = deliveries[0]!;
    // `source: 'flow'` is the executor's own durable-branch marker — it is set
    // only inside `messaging.enqueueHttp`, so seeing it here IS the proof that
    // the run took the outbox path rather than the inline-fetch fallback.
    expect(d.source).toBe('flow');
    expect(d.url).toBe(BILLING_HANDOFF_ENDPOINT);
    expect(d.method).toBe('POST');
    // `flow:<nodeId>` — the delivery's `X-Objectstack-Event` header downstream.
    expect(d.label).toBe('flow:send_closed_won_handoff');
  });

  it('the payload carries the deal, its account and its line items', async () => {
    const { account, opp, items } = await deal();
    // A second deal of the same account with a line item of its own.
    // Selected-set proof: if the filter ever widened to every line item, the
    // payload would silently over-bill this customer.
    const [other] = await verify.seed('crm_opportunity', [{
      name: `Someone else’s deal ${k}`, amount: 1, close_date: '2030-08-31', stage: 'negotiation',
      type: 'new_business', crm_account: account.id, owner_id: rep.id,
    }]);
    await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: other!.id, crm_product: products[0]!.id, description: 'Someone else’s deal',
      quantity: 1, unit_price: 1, discount: 0,
    }, as(rep));
    await closeWon(opp.id);

    const [d] = await deliveriesFor(opp.id);
    const body = d!.payload;
    expect(body.event).toBe(BILLING_HANDOFF_EVENT.opportunityClosedWon);
    expect(body.version).toBe(BILLING_HANDOFF_PAYLOAD_VERSION);
    expect(typeof body.occurred_at).toBe('string');

    const [closed] = await verify.rows('crm_opportunity', { id: opp.id });
    expect(body.opportunity).toEqual({
      id: opp.id,
      name: opp.name,
      // A whole-string single token resolves to the VALUE, so the amount stays
      // a number instead of arriving stringified.
      amount: 250000,
      // The close date the deal carries once it is won (the app stamps it on
      // the transition).
      close_date: closed!.close_date,
      stage: 'closed_won',
      type: 'new_business',
      account_id: account.id,
      owner_id: rep.id,
    });

    // Authored block, not a row dump: `annual_revenue` is on the account and
    // must NOT appear.
    expect(body.account).toEqual({
      id: account.id,
      name: account.name,
      account_number: account.account_number,
      billing_address: { street: '1 Market St', city: 'Seattle', country: 'US' },
      billing_country: 'US',
      phone: '+1-206-555-0100',
      website: 'https://northwind.example.com',
    });
    expect(body.account).not.toHaveProperty('annual_revenue');

    // An ARRAY, not a stringified one — `get_record`'s `limit > 1` is what makes
    // the node `find` instead of `findOne`.
    // The SET is the claim — the read declares no order, and the engine
    // returns rows in its own.
    expect(Array.isArray(body.line_items)).toBe(true);
    expect(body.line_items.map((r: Rec) => r.id).sort()).toEqual(items.map((r) => r.id).sort());
    expect(body.line_items.find((r: Rec) => r.id === items[0]!.id))
      .toMatchObject({ quantity: 10, unit_price: 18000, total_price: 162000 });
  });

  it('does NOT fire on a later edit of an already-won deal', async () => {
    const { opp } = await deal();
    await closeWon(opp.id);
    // The rep tweaks the description months after the close. Same current
    // stage on both sides — no transition.
    await verify.hooks.run('crm_opportunity', 'update', { id: opp.id, description: 'PO received' }, as(rep));
    expect(await deliveriesFor(opp.id), 'only the close itself').toHaveLength(1);
  });

  it('does NOT fire when the stage moves between two non-won values', async () => {
    const { opp } = await deal('proposal');
    await verify.hooks.run('crm_opportunity', 'update', { id: opp.id, stage: 'negotiation' }, as(rep));
    expect(await deliveriesFor(opp.id)).toHaveLength(0);
  });

  it('does NOT fire on a bulk update of an already-won deal', async () => {
    // A predicate update — one payload for every matched row, the shape of a
    // mass edit or the platform's own seed-ownership claim. One hand-off per
    // row of a bulk update is the failure the transition term prevents: the
    // engine binds each matched row's pre-image as `previous`, so a bulk edit
    // of a deal that is already won is not a transition and must not re-bill.
    const { opp } = await deal();
    await closeWon(opp.id);
    await predicateUpdate(verify, 'crm_opportunity', { description: 'Bulk note' }, { name: opp.name }, rep.token);
    expect(await deliveriesFor(opp.id), 'only the close itself').toHaveLength(1);
  });

  it('the transition term is what makes it once — remove it and the same edit re-bills', async () => {
    // REVERSE VERIFICATION, direction predicted first: with `previous.stage`
    // dropped, the condition degenerates to "is currently won", and the
    // description tweak above — which enqueued nothing — enqueues a SECOND
    // hand-off for a deal already handed off. That is the duplicate-order shape,
    // and it is also precisely what a declared `sys_webhook` on
    // `crm_opportunity` + `update` would do, since that surface can express
    // object and action and nothing else.
    //
    // The variant is registered beside the shipped flow through the platform's
    // own flow-authoring door (`POST /automation`, as the admin) and removed
    // again (`DELETE /automation/:name`), so the rep's save fires both.
    const { opp } = await deal();
    await closeWon(opp.id);
    expect(await deliveriesFor(opp.id)).toHaveLength(1);

    const admin = await verify.signIn();
    const valueEquality = structuredClone(BillingHandoffClosedWonFlow) as any;
    valueEquality.name = 'billing_handoff_closed_won_value_equality';
    valueEquality.nodes[0].config.condition = {
      dialect: 'cel',
      source: 'has(record.stage) && record.stage == "closed_won"',
    };
    const registered = await verify.apiAs(admin, 'POST', '/automation', valueEquality);
    expect(registered.status, await registered.clone().text()).toBe(200);
    try {
      await verify.hooks.run('crm_opportunity', 'update', { id: opp.id, description: 'PO received' }, as(rep));
    } finally {
      const removed = await verify.apiAs(admin, 'DELETE', `/automation/${valueEquality.name}`);
      expect(removed.status).toBe(200);
    }
    expect(await deliveriesFor(opp.id), 'the edit re-billed a deal already handed off').toHaveLength(2);
  });
});

/** The rep's deal, won, with a contract drafted on it by the manager and sent for approval. */
async function contractInApproval(opts: { withDeal?: boolean } = {}): Promise<Rec> {
  const { account, opp } = await deal();
  if (opts.withDeal !== false) await closeWon(opp.id);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Cara', last_name: `Signer ${k}`, email: `cara${k}@flow-billing-handoff.test`,
    crm_account: account.id, owner_id: rep.id,
  }]);
  const contract = await verify.hooks.run('crm_contract', 'insert', {
    crm_account: account.id,
    crm_contact: contact!.id,
    ...(opts.withDeal === false ? {} : { crm_opportunity: opp.id }),
    status: 'draft',
    contract_type: 'subscription',
    start_date: '2026-09-01',
    end_date: '2027-08-31',
    contract_term_months: 12,
    contract_value: 250000,
    billing_frequency: 'monthly',
    payment_terms: 'net_30',
    auto_renewal: true,
  }, as(manager));
  await verify.hooks.run('crm_contract', 'update', { id: contract.id, status: 'in_approval' }, as(manager));
  return { ...contract, account, opp };
}

const activate = (contractId: string) =>
  verify.hooks.run('crm_contract', 'update', { id: contractId, status: 'activated', signed_date: '2026-08-31' }, as(manager));

describe('billing hand-off — contract activation (#600)', () => {
  it('enqueues one delivery on the transition into `activated`', async () => {
    const contract = await contractInApproval();
    await activate(contract.id);

    const deliveries = await deliveriesFor(contract.id);
    expect(deliveries).toHaveLength(1);
    const d = deliveries[0]!;
    expect(d.source).toBe('flow');
    expect(d.url).toBe(BILLING_HANDOFF_ENDPOINT);
    expect(d.label).toBe('flow:send_contract_activated_handoff');

    const body = d.payload;
    expect(body.event).toBe(BILLING_HANDOFF_EVENT.contractActivated);
    // The two fields #600 names as having no consumer today. This is the
    // consumer: they are what the billing system needs to raise the schedule
    // HotCRM deliberately does not model.
    expect(body.contract).toMatchObject({
      id: contract.id,
      contract_number: contract.contract_number,
      status: 'activated',
      contract_value: 250000,
      billing_frequency: 'monthly',
      payment_terms: 'net_30',
      account_id: contract.account.id,
      opportunity_id: contract.opp.id,
    });
    expect(body.account).toMatchObject({ id: contract.account.id, name: contract.account.name });
    const items = await verify.rows('crm_opportunity_line_item', { crm_opportunity: contract.opp.id });
    expect(body.line_items.map((r: Rec) => r.id).sort()).toEqual(items.map((r) => r.id).sort());
    expect(body.line_items).toHaveLength(2);
  });

  it('`activated`, not `active` — the value the card named does not exist', async () => {
    // `crm_contract.status` options are draft / in_approval / activated /
    // expired / terminated. A flow written against `active` would be inert
    // forever — and the real engine does not even let a contract carry it: the
    // save is refused before any flow could see it.
    const contract = await contractInApproval();
    await expect(
      verify.hooks.run('crm_contract', 'update', { id: contract.id, status: 'active' }, as(manager)),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(await deliveriesFor(contract.id)).toHaveLength(0);
  });

  it('still hands off a contract with no originating deal, with an empty item list', async () => {
    // `crm_opportunity` is OPTIONAL on a contract, and a filter token that
    // resolves to nothing makes `get_record` REFUSE the step (an absent
    // condition widens a query, it does not narrow it) — which would take the
    // whole run, and the hand-off, down with it. The guarded edge skips the
    // read; the declared `defaultValue: []` is what keeps `line_items` present
    // in the body, so a receiver can tell "no items" from "key missing".
    const direct = await contractInApproval({ withDeal: false });
    await activate(direct.id);

    const deliveries = await deliveriesFor(direct.id);
    expect(deliveries).toHaveLength(1);
    const body = deliveries[0]!.payload;
    expect(body.line_items).toEqual([]);
    expect(body.contract.id).toBe(direct.id);
  });

  it('does NOT fire on a later edit of an already-activated contract', async () => {
    const contract = await contractInApproval();
    await activate(contract.id);
    await verify.hooks.run('crm_contract', 'update', { id: contract.id, special_terms: 'Amended Schedule A' }, as(manager));
    expect(await deliveriesFor(contract.id), 'only the activation itself').toHaveLength(1);
  });
});

describe('billing hand-off — the declaration itself (#600)', () => {
  const http = (flow: any, id: string) => flow.nodes.find((n: any) => n.id === id);

  it('both events target ONE endpoint constant, so repointing is one edit', () => {
    const a = http(BillingHandoffClosedWonFlow, 'send_closed_won_handoff');
    const b = http(BillingHandoffContractActivatedFlow, 'send_contract_activated_handoff');
    expect(a.config.url).toBe(BILLING_HANDOFF_ENDPOINT);
    expect(b.config.url).toBe(BILLING_HANDOFF_ENDPOINT);
  });

  it('both deliveries are durable — this is the whole reliability claim', () => {
    // `durable: true` is what routes the call through `sys_http_delivery`
    // (retry with backoff, dead-letter, admin redeliver). Drop it and the node
    // still "works": it fires an inline fetch and drops the event on the floor
    // when the receiver is down. Nothing else in the repo would go red.
    for (const [flow, id] of [
      [BillingHandoffClosedWonFlow, 'send_closed_won_handoff'],
      [BillingHandoffContractActivatedFlow, 'send_contract_activated_handoff'],
    ] as const) {
      const node = http(flow, id);
      expect(node.config.durable, `${flow.name} must enqueue, not call inline`).toBe(true);
      expect(node.config.method).toBe('POST');
      expect(typeof node.config.timeoutMs).toBe('number');
    }
  });

  it('both line-item reads project the billing fields and bind an array', () => {
    // Asserted as metadata: the projection is the app's declaration of what a
    // receiver is sent. `limit > 1` is load-bearing: at 1 or absent, `get_record` calls `findOne`
    // and `line_items` becomes a single object.
    for (const flow of [BillingHandoffClosedWonFlow, BillingHandoffContractActivatedFlow]) {
      const node = http(flow, 'load_line_items');
      expect(node.config.limit).toBeGreaterThan(1);
      expect(node.config.outputVariable).toBe('billingLineItems');
      expect(node.config.fields).toEqual(
        expect.arrayContaining(['quantity', 'unit_price', 'discount', 'total_price']),
      );
    }
  });

  it('both flows declare `billingLineItems` with an empty default', () => {
    for (const flow of [BillingHandoffClosedWonFlow, BillingHandoffContractActivatedFlow]) {
      const v = (flow.variables ?? []).find((x: any) => x.name === 'billingLineItems') as any;
      expect(v, `${flow.name} must bind billingLineItems`).toBeDefined();
      expect(v.defaultValue).toEqual([]);
    }
  });
});
