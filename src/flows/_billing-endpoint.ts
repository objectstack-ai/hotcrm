// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Billing hand-off endpoint — the ONE place the outbound target lives.
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
 * That is a real cost of the mechanism, stated rather than buried. The
 * declarative `webhooks` surface (`sys_webhook` rows) IS admin-editable, but it
 * cannot express either of these events: `WebhookSchema` is `.strict` and
 * rejects `condition` / `filter` / `body` / `payloadFields` / `retryPolicy`, its
 * `triggers` vocabulary is `create / update / delete / bulk_*` with no
 * transition form, and the auto-enqueuer matches on object + trigger alone and
 * ships a fixed `DataEvent` envelope with no account and no line items. A
 * webhook named `billing_handoff_closed_won` on that surface would fire on
 * *every* opportunity edit. See hotcrm#600 for the measurements.
 *
 * So the trade is: exact events with a shaped payload, at the price of
 * repointing being a rebuild. `content/docs/revenue/billing-handoff.mdx`
 * documents that plainly instead of teaching a Setup screen that does not apply.
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
