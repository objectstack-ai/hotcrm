---
'hotcrm': minor
---

Hand the billing system a real event when a deal is won and when a contract is
activated, and write down where HotCRM's revenue scope ends.

Quote-to-cash used to dead-end silently. `crm_contract` carried
`billing_frequency` and `payment_terms` that nothing consumed, and there was no
integration point at which an external billing or ERP system learned that a deal
had closed. Two new record-change flows close that gap:

- **`billing_handoff_closed_won`** — on the transition **into** `closed_won`,
  POST `crm.opportunity.closed_won` with the deal, its account and its line
  items.
- **`billing_handoff_contract_activated`** — on the transition **into**
  `activated`, POST `crm.contract.activated` with the contract (including the
  two previously consumer-less billing fields), its account, and the originating
  deal's line items.

Both go out through the platform's durable outbound-HTTP outbox — the builtin
`http` node with `durable: true`, which enqueues on `sys_http_delivery` and
inherits retry with backoff, dead-lettering, HMAC-SHA256 signing and the
per-delivery `X-Objectstack-Delivery` id receivers dedupe on. Delivery is
at-least-once; the *event* fires exactly once per crossing.

The transition wording is the whole design, not a detail. A won deal keeps being
saved afterwards — a PO number, an owner change, a tidied description — so a
hand-off conditioned on "is currently won" tells billing to bill the same deal
again on every edit. Both start conditions test `record.x == v && previous.x != v`
with the `previous` term guarded fail-closed, the idiom
`opportunity_won_alert` already uses on this object, and
`test/flow-billing-handoff.test.ts` pins the difference by removing that term
and watching a second delivery appear.

No Order, Invoice or Payment object was added, and none is planned: HotCRM owns
lead → contract, and billing, collections and revenue recognition stay outside
it. `content/docs/revenue/billing-handoff.mdx` (with its `zh-Hans` / `zh-Hant`
siblings) states that boundary, the payload contract, the delivery guarantees,
and — plainly — that the endpoint and signing secret live in flow metadata read
from `src/flows/_billing-endpoint.ts`, so repointing them is a build-time change
(`HOTCRM_BILLING_ENDPOINT` / `HOTCRM_BILLING_SIGNING_SECRET`) and not an edit in
Setup.

The card originally asked for declared stack `webhooks`. That surface cannot
carry either event: `WebhookSchema` is `.strict` and rejects `condition`,
`filter`, `body`, `payloadFields` and `retryPolicy`; its `triggers` vocabulary is
`create / update / delete / bulk_*` with no transition form; the auto-enqueuer
matches on object plus trigger alone and ships a fixed change envelope with no
account and no line items; and its dispatch is gated on the `realtime`
capability, which this app does not require — so a `sys_webhook` row would be
visible in Setup and never fire. A webhook named for closed-won that fires on
every opportunity edit is a declaration that lies about itself, in the app other
people copy.

Fixes #600.
