// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';

/**
 * Billing hand-off contract — the ONE place the outbound target and the shape
 * of what is sent to it live.
 *
 * HotCRM's revenue scope ends at the signed contract (maintainer decision,
 * 2026-08-02): no Order / Invoice / Payment objects are modelled here. What the
 * CRM owes the billing system is a **reliable hand-off** — two outbound events,
 * delivered on the platform's durable HTTP outbox.
 *
 * ## Where the endpoint lives, and why that is a code change
 *
 * These constants are read at **build time** by the two `http` nodes in
 * `billing-handoff.flow.ts`, and `objectstack build` bakes their values into the
 * compiled artifact's flow metadata. There is no Setup screen for them.
 *
 * That is a real cost of the mechanism, stated rather than buried: the
 * admin-editable `webhooks` surface cannot express either of these events, so
 * the trade is exact events with a shaped payload at the price of repointing
 * being a rebuild. The measurements behind that are in
 * `billing-handoff.flow.ts`; `content/docs/revenue/billing-handoff.mdx`
 * documents the cost plainly instead of teaching a Setup screen that does not
 * apply.
 *
 * ## Overriding without editing this file
 *
 * Both values are read from the environment first, so a deployment can set them
 * in the build environment rather than patching source:
 *
 *   HOTCRM_BILLING_ENDPOINT=https://billing.acme.internal/hotcrm/events \
 *   HOTCRM_BILLING_SIGNING_SECRET=… \
 *   pnpm build
 *
 * The secret is deliberately NOT defaulted to a literal: a committed HMAC key
 * in a public reference app is worse than an unsigned delivery, and an unsigned
 * delivery is at least visible (no `X-Objectstack-Signature` header on the
 * request) rather than silently trusted.
 */

/**
 * Where both hand-off events are POSTed.
 *
 * The default is the RFC 2606 example host, i.e. deliberately not a real
 * receiver: an untouched install enqueues the delivery, retries it on the
 * platform's backoff schedule, and lands it in `sys_http_delivery` as `dead`.
 * That is the honest default — the hand-off is wired and visibly waiting for an
 * endpoint, rather than quietly doing nothing.
 */
export const BILLING_HANDOFF_ENDPOINT =
  process.env.HOTCRM_BILLING_ENDPOINT?.trim() || 'https://billing.example.com/hotcrm/events';

/**
 * HMAC-SHA256 secret for the `X-Objectstack-Signature` header.
 *
 * `undefined` when unset — the messaging sender only signs when a secret is
 * present, and an empty string would read as "signed" to an author while
 * producing no header at all.
 */
export const BILLING_HANDOFF_SIGNING_SECRET: string | undefined =
  process.env.HOTCRM_BILLING_SIGNING_SECRET?.trim() || undefined;

/** Per-request timeout handed to the outbox sender (ms). */
export const BILLING_HANDOFF_TIMEOUT_MS = 30_000;

/**
 * Event names carried in the payload's `event` field.
 *
 * The receiver routes on this, so the strings are part of the contract with the
 * billing system — changing one is a breaking change for the consumer, not a
 * rename.
 */
export const BILLING_HANDOFF_EVENT = {
  opportunityClosedWon: 'crm.opportunity.closed_won',
  contractActivated: 'crm.contract.activated',
} as const;

/** Payload contract version — bumped when the body shape changes shape. */
export const BILLING_HANDOFF_PAYLOAD_VERSION = 1;

/** Line items read per hand-off. Deals in this app top out well below it. */
export const BILLING_HANDOFF_LINE_ITEM_LIMIT = 200;

/*
 * ─── The payload halves both hand-off events share ─────────────────────────
 *
 * These sat in `billing-handoff.flow.ts` while both flows lived in one file.
 * The ADR-0130 layout puts a flow with its trigger object, and the two events
 * trigger on objects in different packages — `crm_opportunity` is sales',
 * `crm_contract` is revenue's — so the flows are now
 * `src/sales/flows/billing-handoff-closed-won.flow.ts` and
 * `src/revenue/flows/billing-handoff-contract-activated.flow.ts`. The shared
 * half moved HERE rather than being copied into each: it is the same contract
 * with the same receiver, and two copies of a contract is how a receiver ends
 * up with two shapes. Revenue reads it along the revenue -> sales edge, the
 * one direction ADR-0130 allows.
 */

/** Account fields the billing system needs to open a customer. */
export const ACCOUNT_FIELDS = [
  'id',
  'name',
  'account_number',
  'billing_address',
  'billing_country',
  'phone',
  'website',
];

/** Line-item fields that price a hand-off. `total_price` is the formula total. */
export const LINE_ITEM_FIELDS = [
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
export const accountBlock = {
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
 * the run fails loudly in Studio's Flow Runs page. For a required field that is the
 * right failure — a silent skip would drop a hand-off with no trace.
 */
export const loadAccountNode = (): Automation.FlowNode => ({
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
