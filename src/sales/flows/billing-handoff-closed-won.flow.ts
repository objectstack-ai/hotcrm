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
  LINE_ITEM_FIELDS,
  accountBlock,
  loadAccountNode,
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
 *     (this file; `crm_opportunity` is the sales package's object)
 *   - `billing_handoff_contract_activated`  — a contract ENTERS `activated`
 *     (`src/revenue/flows/billing-handoff-contract-activated.flow.ts`)
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
 * ## ⛔ Do not re-express these as declared `webhooks`
 *
 * Measured on 17.0.0-rc.6, that surface cannot express either event:
 * `WebhookSchema` is `.strict` and rejects `condition` / `filter` / `body` /
 * `payloadFields` / `retryPolicy`; its `triggers` vocabulary is
 * `create / update / delete / bulk_*` with no transition form; and the
 * auto-enqueuer matches on object + trigger alone and delivers a fixed
 * `DataEvent` envelope carrying neither the account nor the line items. A
 * `sys_webhook` row named for closed-won would fire on *every* opportunity edit
 * — a declaration that lies about itself, in the app other people copy.
 * Dispatch there is additionally gated on the `realtime` capability, which this
 * app does not require, so such a row would be visible in Setup and never fire
 * at all.
 *
 * The cost of this route is stated in `_billing-endpoint.ts` and in
 * `content/docs/revenue/billing-handoff.mdx`: the endpoint and secret live in
 * flow metadata, so repointing them is a rebuild, not a Setup edit.
 *
 * ## Exactly once per transition, not once per edit
 *
 * ⛔ Both start conditions must test the TRANSITION
 * (`record.x == v && previous.x != v`), never the current value. This is the
 * idiom `opportunity_won_alert` uses on this very object: without the
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
  // (ADR-0049), and opportunities reach `closed_won` through
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
