// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

import {
  BILLING_HANDOFF_ENDPOINT,
  BILLING_HANDOFF_EVENT,
  BILLING_HANDOFF_LINE_ITEM_LIMIT,
  BILLING_HANDOFF_PAYLOAD_VERSION,
  BILLING_HANDOFF_SIGNING_SECRET,
  BILLING_HANDOFF_TIMEOUT_MS,
} from './_billing-endpoint';

/**
 * ═══ Billing hand-off — where HotCRM's revenue scope ends ══════════════════
 *
 * HotCRM owns lead → contract. It does **not** model Orders, Invoices or
 * Payments (maintainer decision, 2026-08-02): billing is an external system's
 * job. What the CRM owes that system is a reliable hand-off, and these two
 * flows are it:
 *
 *   - `billing_handoff_closed_won`          — an opportunity ENTERS `closed_won`
 *   - `billing_handoff_contract_activated`  — a contract ENTERS `activated`
 *
 * Each POSTs one JSON document — the record, its account, and its line items —
 * to {@link BILLING_HANDOFF_ENDPOINT}, through the platform's **durable HTTP
 * outbox**: the `http` node with `durable: true` calls
 * `messaging.enqueueHttp({ source: 'flow', … })`, which persists a
 * `sys_http_delivery` row that the HTTP dispatcher drains with retry, backoff
 * and dead-lettering, signing the body with HMAC-SHA256 when a secret is set.
 * Nothing here is custom plumbing; it is the platform's own outbound-callout
 * verb, on the same outbox the declarative `webhooks` surface uses.
 *
 * ## Why flows and not stack `webhooks` (hotcrm#600)
 *
 * The card originally asked for declared `webhooks`. Measured on 17.0.0-rc.6,
 * that surface cannot express either event: `WebhookSchema` is `.strict` and
 * rejects `condition` / `filter` / `body` / `payloadFields` / `retryPolicy`; its
 * `triggers` vocabulary is `create / update / delete / bulk_*` with no
 * transition form; and the auto-enqueuer matches on object + trigger alone and
 * delivers a fixed `DataEvent` envelope carrying neither the account nor the
 * line items. A `sys_webhook` row named for closed-won would fire on *every*
 * opportunity edit — a declaration that lies about itself, in the app other
 * people copy. Dispatch there is additionally gated on the `realtime`
 * capability, which this app does not require, so such a row would be visible
 * in Setup and never fire at all.
 *
 * The cost of this route is stated in `_billing-endpoint.ts` and in
 * `content/docs/revenue/billing-handoff.mdx`: the endpoint and secret live in
 * flow metadata, so repointing them is a rebuild, not a Setup edit.
 *
 * ## Exactly once per transition, not once per edit
 *
 * Both start conditions test the TRANSITION (`record.x == v && previous.x != v`),
 * not the current value. This is the idiom `opportunity_won_alert` already uses
 * on this very object, and its header explains why at length: without the
 * `previous.*` term, every later edit of a won deal — a demo-bootstrap owner
 * claim, an approval stamp, a description tweak — re-fires the flow. For a
 * congratulations notification that is noise; for a billing hand-off it is a
 * duplicate order. `previous.*` is guarded FAIL-CLOSED (`has(previous.x) &&`)
 * for the same reason it is there: when the engine cannot see the prior value
 * it cannot see a transition either, and must not claim one. The shape that
 * covers is a bulk `updateMany`, where ObjectQL reads no prior row and
 * `previous` arrives null — one hand-off per row of a bulk update is exactly
 * what nobody wants.
 *
 * Delivery itself is **at-least-once**: the outbox retries a failed attempt,
 * and every attempt of one enqueued row carries the same `X-Objectstack-Delivery`
 * id. Receivers dedupe on that header.
 *
 * ## Totality
 *
 * Every `record.*` / `previous.*` read below carries a `has(...)` guard — the
 * house rule `test/flow-condition-totality.test.ts` enforces, because a flow
 * condition that aborts fails the whole run rather than yielding `false`.
 */

/** Account fields the billing system needs to open a customer. */
const ACCOUNT_FIELDS = [
  'id',
  'name',
  'account_number',
  'billing_address',
  'billing_country',
  'phone',
  'website',
];

/** Line-item fields that price a hand-off. `total_price` is the formula total. */
const LINE_ITEM_FIELDS = [
  'id',
  'line_number',
  'crm_product',
  'description',
  'quantity',
  'list_price',
  'unit_price',
  'discount',
  'total_price',
];

/**
 * The account block, shared by both payloads.
 *
 * Authored field-by-field rather than passing the row whole: this object IS the
 * contract with the billing system, so it must not silently grow a column the
 * day someone adds a field to `crm_account`.
 */
const accountBlock = {
  id: '{billingAccount.id}',
  name: '{billingAccount.name}',
  account_number: '{billingAccount.account_number}',
  billing_address: '{billingAccount.billing_address}',
  billing_country: '{billingAccount.billing_country}',
  phone: '{billingAccount.phone}',
  website: '{billingAccount.website}',
};

/**
 * Read the account named by the triggering record.
 *
 * `crm_account` is `required` + `storage.notNull` on both `crm_opportunity` and
 * `crm_contract`, so the token always resolves on a real row. Left UNGUARDED on
 * purpose: if it ever did resolve to nothing, `get_record` refuses the step and
 * the run fails loudly in the process monitor. For a required field that is the
 * right failure — a silent skip would drop a hand-off with no trace.
 */
const loadAccountNode = (): Automation.FlowNode => ({
  id: 'load_account',
  type: 'get_record',
  label: 'Load Account',
  config: {
    objectName: 'crm_account',
    filter: { id: '{record.crm_account}' },
    fields: ACCOUNT_FIELDS,
    // No `limit`: `get_record` calls `findOne` below 2 and binds the single row
    // itself, which is what `{billingAccount.<field>}` needs.
    outputVariable: 'billingAccount',
  },
});

/**
 * ── Event 1: opportunity enters `closed_won` ───────────────────────────────
 */
export const BillingHandoffClosedWonFlow: Flow = {
  name: 'billing_handoff_closed_won',
  label: 'Billing Hand-off: Closed Won',
  description:
    'On the transition into closed_won: POST the deal, its account and its line items to the billing endpoint via the durable HTTP outbox.',
  type: 'record_change',
  status: 'active',
  // A record-change flow fired by a SYSTEM write carries no trigger user
  // (ADR-0049, #1888, #3760), and opportunities reach `closed_won` through
  // machinery as well as a rep's own save — `lead_conversion` writes them, and
  // the `contract_renewal` sweep is itself `runAs: 'system'`. This flow has two
  // data nodes, so under the default `runAs: 'user'` those reads would be
  // REFUSED on exactly those runs and the hand-off would vanish silently. The
  // hand-off must also see the WHOLE deal, not the slice the closing rep may
  // read: an RLS-scoped line-item query that returns three of five rows would
  // under-bill the customer without failing anything.
  runAs: 'system',
  variables: [
    // Bound with a default so the payload key always exists. Not strictly
    // needed here (this flow always runs the read) — declared for symmetry with
    // the contract flow, where the read is conditional, so the two payloads
    // cannot drift into different shapes for an empty item list.
    { name: 'billingLineItems', type: 'collection', isInput: false, isOutput: false, defaultValue: [] },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (opportunity updated)',
      config: {
        objectName: 'crm_opportunity',
        triggerType: 'record-after-update',
        // TRANSITION, not current value — see the file header. `previous.stage`
        // is guarded fail-closed: no visible prior stage means no visible
        // transition, so no hand-off.
        condition: P`has(record.stage) && record.stage == "closed_won"
          && has(previous.stage) && previous.stage != "closed_won"`,
      },
    },
    loadAccountNode(),
    {
      id: 'load_line_items',
      type: 'get_record',
      label: 'Load Line Items',
      config: {
        objectName: 'crm_opportunity_line_item',
        filter: { crm_opportunity: '{record.id}' },
        fields: LINE_ITEM_FIELDS,
        // > 1 is what makes `get_record` issue a `find` and bind an ARRAY;
        // omit it and the node calls `findOne` and binds a single row.
        limit: BILLING_HANDOFF_LINE_ITEM_LIMIT,
        outputVariable: 'billingLineItems',
      },
    },
    {
      // The node id becomes the delivery's `X-Objectstack-Event` header
      // (`flow:<nodeId>`), so it is named for the event and not for the verb.
      id: 'send_closed_won_handoff',
      type: 'http',
      label: 'Enqueue Billing Hand-off',
      config: {
        url: BILLING_HANDOFF_ENDPOINT,
        method: 'POST',
        // The whole point of this route: enqueue on `sys_http_delivery` rather
        // than call inline, so a receiver that is down gets the delivery when
        // it comes back instead of losing it.
        durable: true,
        timeoutMs: BILLING_HANDOFF_TIMEOUT_MS,
        signingSecret: BILLING_HANDOFF_SIGNING_SECRET,
        body: {
          event: BILLING_HANDOFF_EVENT.opportunityClosedWon,
          version: BILLING_HANDOFF_PAYLOAD_VERSION,
          occurred_at: '{NOW()}',
          opportunity: {
            id: '{record.id}',
            name: '{record.name}',
            amount: '{record.amount}',
            close_date: '{record.close_date}',
            stage: '{record.stage}',
            type: '{record.type}',
            account_id: '{record.crm_account}',
            owner_id: '{record.owner_id}',
          },
          account: accountBlock,
          // A whole-string single token resolves to the VALUE, not to its
          // stringification, so the array survives as an array.
          line_items: '{billingLineItems}',
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'load_account', type: 'default' },
    { id: 'e2', source: 'load_account', target: 'load_line_items', type: 'default' },
    { id: 'e3', source: 'load_line_items', target: 'send_closed_won_handoff', type: 'default' },
    { id: 'e4', source: 'send_closed_won_handoff', target: 'end', type: 'default' },
  ],
};

/**
 * ── Event 2: contract enters `activated` ───────────────────────────────────
 *
 * NB the value is `activated`. `crm_contract.status` has no `active` member —
 * the options are `draft / in_approval / activated / expired / terminated`,
 * governed by the `contract_status_progression` state machine (#600 corrected
 * the card's text on this).
 */
export const BillingHandoffContractActivatedFlow: Flow = {
  name: 'billing_handoff_contract_activated',
  label: 'Billing Hand-off: Contract Activated',
  description:
    'On the transition into activated: POST the contract, its account and the originating deal’s line items to the billing endpoint via the durable HTTP outbox.',
  type: 'record_change',
  status: 'active',
  // Contracts are activated by machinery as well as by hand — `contract.hook.ts`
  // stamps the account promotion and signed date on that same transition, and
  // the renewal sweep runs `runAs: 'system'`. A system write carries no trigger
  // user, so under the default `runAs: 'user'` this flow's two reads would be
  // refused on exactly those runs and the hand-off would disappear without a
  // failed step. Elevation also guarantees the payload is the whole contract,
  // not an RLS-narrowed view of it.
  runAs: 'system',
  variables: [
    // Bound with a default because the line-item read below is CONDITIONAL: a
    // contract need not have an originating opportunity. Without the default,
    // the skipped path leaves `billingLineItems` unbound and the payload key
    // vanishes — so a receiver could not tell "no items" from "not sent".
    { name: 'billingLineItems', type: 'collection', isInput: false, isOutput: false, defaultValue: [] },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (contract updated)',
      config: {
        objectName: 'crm_contract',
        triggerType: 'record-after-update',
        condition: P`has(record.status) && record.status == "activated"
          && has(previous.status) && previous.status != "activated"`,
      },
    },
    loadAccountNode(),
    {
      id: 'load_line_items',
      type: 'get_record',
      label: 'Load Originating Deal’s Line Items',
      config: {
        objectName: 'crm_opportunity_line_item',
        // Contracts carry no line items of their own; what was sold sits on the
        // opportunity the contract came from. Reached only via the guarded edge
        // below, because `crm_opportunity` is OPTIONAL on a contract and a
        // filter token that resolves to nothing makes `get_record` refuse the
        // step (an absent condition widens a query rather than narrowing it).
        filter: { crm_opportunity: '{record.crm_opportunity}' },
        fields: LINE_ITEM_FIELDS,
        limit: BILLING_HANDOFF_LINE_ITEM_LIMIT,
        outputVariable: 'billingLineItems',
      },
    },
    {
      id: 'send_contract_activated_handoff',
      type: 'http',
      label: 'Enqueue Billing Hand-off',
      config: {
        url: BILLING_HANDOFF_ENDPOINT,
        method: 'POST',
        durable: true,
        timeoutMs: BILLING_HANDOFF_TIMEOUT_MS,
        signingSecret: BILLING_HANDOFF_SIGNING_SECRET,
        body: {
          event: BILLING_HANDOFF_EVENT.contractActivated,
          version: BILLING_HANDOFF_PAYLOAD_VERSION,
          occurred_at: '{NOW()}',
          contract: {
            id: '{record.id}',
            contract_number: '{record.contract_number}',
            status: '{record.status}',
            contract_type: '{record.contract_type}',
            start_date: '{record.start_date}',
            end_date: '{record.end_date}',
            contract_term_months: '{record.contract_term_months}',
            contract_value: '{record.contract_value}',
            // The two fields the card names as consumer-less today: this is the
            // consumer. They are what the billing system needs to raise the
            // schedule HotCRM deliberately does not model.
            billing_frequency: '{record.billing_frequency}',
            payment_terms: '{record.payment_terms}',
            auto_renewal: '{record.auto_renewal}',
            signed_date: '{record.signed_date}',
            account_id: '{record.crm_account}',
            opportunity_id: '{record.crm_opportunity}',
            owner_id: '{record.owner_id}',
          },
          account: accountBlock,
          line_items: '{billingLineItems}',
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'load_account', type: 'default' },
    // The two edges below are COMPLEMENTARY CONDITIONALS on a plain data node,
    // deliberately not a `decision` gateway. A decision with no declared
    // `config.conditions` reports the engine's `default` branch label, and
    // traversal then narrows the edge set to out-edges claiming that label —
    // an `isDefault: true` sibling would swallow the whole branch and the
    // conditional edge would never be evaluated. Complementary conditions off a
    // non-branching node are evaluated one by one, which is the behaviour this
    // needs.
    {
      id: 'e2',
      source: 'load_account',
      target: 'load_line_items',
      type: 'conditional',
      label: 'Has originating deal',
      condition: P`has(record.crm_opportunity) && record.crm_opportunity != null`,
    },
    {
      id: 'e3',
      source: 'load_account',
      target: 'send_contract_activated_handoff',
      type: 'conditional',
      label: 'No originating deal',
      condition: P`!has(record.crm_opportunity) || record.crm_opportunity == null`,
    },
    { id: 'e4', source: 'load_line_items', target: 'send_contract_activated_handoff', type: 'default' },
    { id: 'e5', source: 'send_contract_activated_handoff', target: 'end', type: 'default' },
  ],
};
