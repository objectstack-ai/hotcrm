// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { makeFlowHarness } from './helpers/flow-harness';
import {
  BillingHandoffClosedWonFlow,
  BillingHandoffContractActivatedFlow,
} from '../src/flows/billing-handoff.flow';
import {
  BILLING_HANDOFF_ENDPOINT,
  BILLING_HANDOFF_EVENT,
  BILLING_HANDOFF_PAYLOAD_VERSION,
} from '../src/flows/_billing-endpoint';

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
 * These run the REAL `AutomationEngine` with the REAL builtin `http` executor,
 * so what is asserted is the platform's own behaviour, not a re-implementation
 * of it. Two seams are stubs, and they are named here rather than left for a
 * reader to discover:
 *
 *   - **the outbox itself.** The harness's messaging stub answers
 *     `isHttpDeliveryReady() === true` and captures `enqueueHttp(...)`. That is
 *     the executor's own durable branch — the same call
 *     `@objectstack/service-messaging` serves by writing a `sys_http_delivery`
 *     row. What is proven here is that the flow REACHES that call, once, with
 *     the right payload. Retry / backoff / dead-letter / HMAC live inside the
 *     platform package (`nextRetryDelayMs`, `HttpDispatcher`, `sendOnce`'s
 *     `X-Objectstack-Signature`) and are its tests to run, not this app's.
 *     Without the stub the node would degrade to a live `fetch` against the
 *     configured endpoint from the test runner — see the harness header.
 *   - **the driver.** The in-memory engine ignores `fields` projections, so the
 *     payload's line items arrive whole here and projected in production. The
 *     projection is asserted as metadata below instead.
 *
 * ## Reverse verification, predicted before it was run
 *
 * The load-bearing term is `previous.stage != "closed_won"`. Predicted: remove
 * it and the "second save" case flips from zero deliveries to one — a DUPLICATE
 * hand-off, i.e. the billing system is told to bill the same deal twice. That
 * direction is asserted in-test (`the transition term is what makes it once`)
 * rather than described, because it is the whole reason this flow is a flow and
 * not a declared `sys_webhook` subscription, which can only match object +
 * action and would fire on every edit.
 */

const ACCOUNT = {
  id: 'acc_1',
  name: 'Northwind Traders',
  account_number: 'ACC-0001',
  billing_address: { street: '1 Market St', city: 'Seattle', country: 'US' },
  billing_country: 'US',
  phone: '+1-206-555-0100',
  website: 'https://northwind.example.com',
  // Not in the payload contract — its absence from the delivered body is what
  // proves the account block is authored rather than a whole-row dump.
  annual_revenue: 9_000_000,
};

const WON_OPP = {
  id: 'opp_1',
  name: 'Northwind — Platform Rollout',
  amount: 250000,
  close_date: '2026-08-31',
  stage: 'closed_won',
  type: 'new_business',
  crm_account: 'acc_1',
  owner_id: 'user_7',
};

const LINE_ITEMS = [
  {
    id: 'oli_1', crm_opportunity: 'opp_1', crm_product: 'prod_1', line_number: 1,
    description: 'Platform subscription', quantity: 10, list_price: 20000,
    unit_price: 18000, discount: 10, total_price: 162000,
  },
  {
    id: 'oli_2', crm_opportunity: 'opp_1', crm_product: 'prod_2', line_number: 2,
    description: 'Onboarding', quantity: 1, list_price: 88000,
    unit_price: 88000, discount: 0, total_price: 88000,
  },
  // Belongs to a different deal. Selected-set proof: if the filter ever widened
  // to every line item, the payload would silently over-bill this customer.
  {
    id: 'oli_9', crm_opportunity: 'opp_other', crm_product: 'prod_1', line_number: 1,
    description: 'Someone else’s deal', quantity: 1, list_price: 1, unit_price: 1,
    discount: 0, total_price: 1,
  },
];

const ACTIVATED_CONTRACT = {
  id: 'ctr_1',
  contract_number: 'CTR-0001',
  status: 'activated',
  contract_type: 'subscription',
  start_date: '2026-09-01',
  end_date: '2027-08-31',
  contract_term_months: 12,
  contract_value: 250000,
  billing_frequency: 'monthly',
  payment_terms: 'net_30',
  auto_renewal: true,
  signed_date: '2026-08-31',
  crm_account: 'acc_1',
  crm_opportunity: 'opp_1',
  owner_id: 'user_7',
};

const seed = () => ({
  crm_account: [{ ...ACCOUNT }],
  crm_opportunity: [{ ...WON_OPP }],
  crm_opportunity_line_item: LINE_ITEMS.map((r) => ({ ...r })),
  crm_contract: [{ ...ACTIVATED_CONTRACT }],
});

const wonHarness = () =>
  makeFlowHarness({ billing_handoff_closed_won: BillingHandoffClosedWonFlow }, seed());

const contractHarness = () =>
  makeFlowHarness(
    { billing_handoff_contract_activated: BillingHandoffContractActivatedFlow },
    seed(),
  );

describe('billing hand-off — closed-won (#600)', () => {
  it('enqueues exactly one DURABLE delivery on the transition into closed_won', async () => {
    const h = wonHarness();
    await h.trigger('billing_handoff_closed_won', WON_OPP, { ...WON_OPP, stage: 'negotiation' });

    expect(h.deliveries).toHaveLength(1);
    const d = h.deliveries[0];
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
    const h = wonHarness();
    await h.trigger('billing_handoff_closed_won', WON_OPP, { ...WON_OPP, stage: 'negotiation' });

    const body = h.deliveries[0].payload as any;
    expect(body.event).toBe(BILLING_HANDOFF_EVENT.opportunityClosedWon);
    expect(body.version).toBe(BILLING_HANDOFF_PAYLOAD_VERSION);
    expect(typeof body.occurred_at).toBe('string');

    expect(body.opportunity).toEqual({
      id: 'opp_1',
      name: 'Northwind — Platform Rollout',
      // A whole-string single token resolves to the VALUE, so the amount stays
      // a number instead of arriving stringified.
      amount: 250000,
      close_date: '2026-08-31',
      stage: 'closed_won',
      type: 'new_business',
      account_id: 'acc_1',
      owner_id: 'user_7',
    });

    // Authored block, not a row dump: `annual_revenue` is on the seeded account
    // and must NOT appear.
    expect(body.account).toEqual({
      id: 'acc_1',
      name: 'Northwind Traders',
      account_number: 'ACC-0001',
      billing_address: { street: '1 Market St', city: 'Seattle', country: 'US' },
      billing_country: 'US',
      phone: '+1-206-555-0100',
      website: 'https://northwind.example.com',
    });
    expect(body.account).not.toHaveProperty('annual_revenue');

    // An ARRAY, not a stringified one — `get_record`'s `limit > 1` is what makes
    // the node `find` instead of `findOne`.
    expect(Array.isArray(body.line_items)).toBe(true);
    expect(body.line_items.map((r: any) => r.id)).toEqual(['oli_1', 'oli_2']);
    expect(body.line_items[0]).toMatchObject({ quantity: 10, unit_price: 18000, total_price: 162000 });
  });

  it('does NOT fire on a later edit of an already-won deal', async () => {
    const h = wonHarness();
    // The rep tweaks the description months after the close. Same current
    // stage on both sides — no transition.
    await h.trigger(
      'billing_handoff_closed_won',
      { ...WON_OPP, description: 'PO received' },
      { ...WON_OPP },
    );
    expect(h.deliveries).toHaveLength(0);
  });

  it('does NOT fire when the stage moves between two non-won values', async () => {
    const h = wonHarness();
    await h.trigger(
      'billing_handoff_closed_won',
      { ...WON_OPP, stage: 'negotiation' },
      { ...WON_OPP, stage: 'proposal' },
    );
    expect(h.deliveries).toHaveLength(0);
  });

  it('does NOT fire on a bulk update, where `previous` arrives null', async () => {
    // ObjectQL reads no prior row on `updateMany`, so `previous` is null and the
    // fail-closed guard must refuse to claim a transition it cannot see. One
    // hand-off per row of a bulk update is the failure this term prevents.
    const h = wonHarness();
    await h.trigger('billing_handoff_closed_won', WON_OPP, undefined);
    expect(h.deliveries).toHaveLength(0);
  });

  it('the transition term is what makes it once — remove it and the same edit re-bills', async () => {
    // REVERSE VERIFICATION, direction predicted first: with `previous.stage`
    // dropped, the condition degenerates to "is currently won", and the
    // description tweak above — which enqueued nothing — enqueues a SECOND
    // hand-off for a deal already handed off. That is the duplicate-order shape,
    // and it is also precisely what a declared `sys_webhook` on
    // `crm_opportunity` + `update` would do, since that surface can express
    // object and action and nothing else.
    const valueEquality = structuredClone(BillingHandoffClosedWonFlow) as any;
    valueEquality.nodes[0].config.condition = {
      dialect: 'cel',
      source: 'has(record.stage) && record.stage == "closed_won"',
    };

    const h = makeFlowHarness({ billing_handoff_closed_won: valueEquality }, seed());
    await h.trigger(
      'billing_handoff_closed_won',
      { ...WON_OPP, description: 'PO received' },
      { ...WON_OPP },
    );
    expect(h.deliveries).toHaveLength(1);
  });
});

describe('billing hand-off — contract activation (#600)', () => {
  it('enqueues one delivery on the transition into `activated`', async () => {
    const h = contractHarness();
    await h.trigger('billing_handoff_contract_activated', ACTIVATED_CONTRACT, {
      ...ACTIVATED_CONTRACT,
      status: 'in_approval',
    });

    expect(h.deliveries).toHaveLength(1);
    const d = h.deliveries[0];
    expect(d.source).toBe('flow');
    expect(d.url).toBe(BILLING_HANDOFF_ENDPOINT);
    expect(d.label).toBe('flow:send_contract_activated_handoff');

    const body = d.payload as any;
    expect(body.event).toBe(BILLING_HANDOFF_EVENT.contractActivated);
    // The two fields #600 names as having no consumer today. This is the
    // consumer: they are what the billing system needs to raise the schedule
    // HotCRM deliberately does not model.
    expect(body.contract).toMatchObject({
      id: 'ctr_1',
      contract_number: 'CTR-0001',
      status: 'activated',
      contract_value: 250000,
      billing_frequency: 'monthly',
      payment_terms: 'net_30',
      account_id: 'acc_1',
      opportunity_id: 'opp_1',
    });
    expect(body.account).toMatchObject({ id: 'acc_1', name: 'Northwind Traders' });
    expect(body.line_items.map((r: any) => r.id)).toEqual(['oli_1', 'oli_2']);
  });

  it('`activated`, not `active` — the value the card named does not exist', async () => {
    // `crm_contract.status` options are draft / in_approval / activated /
    // expired / terminated. A flow written against `active` would be inert
    // forever, and nothing else in the repo would notice.
    const h = contractHarness();
    await h.trigger(
      'billing_handoff_contract_activated',
      { ...ACTIVATED_CONTRACT, status: 'active' },
      { ...ACTIVATED_CONTRACT, status: 'in_approval' },
    );
    expect(h.deliveries).toHaveLength(0);
  });

  it('still hands off a contract with no originating deal, with an empty item list', async () => {
    // `crm_opportunity` is OPTIONAL on a contract, and a filter token that
    // resolves to nothing makes `get_record` REFUSE the step (an absent
    // condition widens a query, it does not narrow it) — which would take the
    // whole run, and the hand-off, down with it. The guarded edge skips the
    // read; the declared `defaultValue: []` is what keeps `line_items` present
    // in the body, so a receiver can tell "no items" from "key missing".
    const direct = { ...ACTIVATED_CONTRACT, id: 'ctr_2', crm_opportunity: undefined };
    const h = contractHarness();
    await h.trigger('billing_handoff_contract_activated', direct, {
      ...direct,
      status: 'in_approval',
    });

    expect(h.deliveries).toHaveLength(1);
    const body = h.deliveries[0].payload as any;
    expect(body.line_items).toEqual([]);
    expect(body.contract.id).toBe('ctr_2');
  });

  it('does NOT fire on a later edit of an already-activated contract', async () => {
    const h = contractHarness();
    await h.trigger(
      'billing_handoff_contract_activated',
      { ...ACTIVATED_CONTRACT, special_terms: 'Amended Schedule A' },
      { ...ACTIVATED_CONTRACT },
    );
    expect(h.deliveries).toHaveLength(0);
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
    // Asserted as metadata because the in-memory driver ignores projections.
    // `limit > 1` is load-bearing: at 1 or absent, `get_record` calls `findOne`
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
