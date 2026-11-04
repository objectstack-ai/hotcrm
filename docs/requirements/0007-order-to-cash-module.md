# REQ-0007: What sales must see after the contract — collection plan, invoice and payment status as a standard module

- **Status**: Triaged
- **Source**: Maintainer (internal) — product direction, not a customer intake
- **Raised**: 2026-10-23
- **Disposition**: **B standard-enhancement — a new standard module**, `app.objectstack.hotcrm.o2c`
  (*Order to Cash* / 「订单与回款」; decision 1 of the design, recorded 2026-10-23). The module is
  **a window, never a book**, and its first version is **lean**: it shows sales a contract's
  collection plan and what has been invoiced and received against it. It **revises the 2026-08-02
  revenue-scope ruling** rather than reversing it: the core packages still model no orders,
  invoices or payments; the module shows their status.
- **Traceability**: design — [`../architecture/order-to-cash-module-plan.md`](../architecture/order-to-cash-module-plan.md);
  cards — hotcrm#2315 (phases 0–1, filed 2026-10-27); changesets / PRs — to be filled in per phase.

## Requirement

The maintainer's product direction, set in one product session on 2026-10-23 — summarized rather
than quoted, at the maintainer's request:

1. Sales cares about the status of invoicing, shipment and collection once a contract is signed.
2. Where there is no interface to an ERP, the figures come in by import or by entry — and some
   customers have no ERP at all.
3. The post-signature chain is quote → contract → order → shipment → invoice → collection, with a
   spot sale going straight to an order; for a software vendor the signed contract is the order.
4. The CRM must not grow large. The assistant's proposal — the CRM owns the front office, fulfilment
   and receivables are kept beside it, and a company without an ERP gets a light module rather than
   an ERP inside the CRM — was adopted, documentation first.
5. After reading the first draft: the CRM carries only the data sales must see, and keeps no books.
6. The first version is lean and covers the core business need. This is the standard product; a
   customer's own development is a separate repository built on it.

## Standard product analysis

**What exists.** HotCRM ends at the signed contract. `crm_contract` (`src/revenue/objects/contract.object.ts`)
carries `contract_value`, `billing_frequency` (`monthly` · `quarterly` · `annually` · `one_time`),
`payment_terms` and `contract_type`, and an accepted quote drafts one (`quote_accepted_contract_draft`,
`src/revenue/objects/quote.hook.ts`). When a deal is won or a contract is activated, the two billing
hand-off flows post the record to an external billing system through the durable outbox
(`src/sales/flows/billing-handoff-closed-won.flow.ts`,
`src/revenue/flows/billing-handoff-contract-activated.flow.ts`). Nothing comes back.

**The standing ruling.** Recorded in the headers of those two flows and in
`src/sales/flows/_billing-endpoint.ts`: *HotCRM owns lead → contract and does not model Orders,
Invoices or Payments (maintainer decision, 2026-08-02): billing is an external system's job.*
REQ-0002 declined its steps 37–38 (invoicing and collection figures on a project) and the orders of
step 40 on that ruling, with the trigger "revisit only if that ruling is revisited"; REQ-0006 cites
it beside its revenue-recognition item, which is **C** on its own grounds and stays so (this module
does not do revenue recognition either). This record is that revisit.

**The gap, in the maintainer's terms.**

1. **Sales cannot see what happened after signature.** Whether the contract was invoiced, whether the
   money came back, what is overdue. In the markets HotCRM is sold into, sales is often measured and
   paid on collected cash and is expected to chase overdue receivables, so this is a daily question,
   not an analyst's.
2. **For a software or services vendor the contract *is* the order.** What follows signature is a
   collection plan — advance, go-live, acceptance, retention, or one step per subscription period —
   each step invoiced and paid. HotCRM's own maker is such a vendor and is a first user.
3. **For a goods seller the chain is longer** — framework contract → many orders → partial shipments →
   invoices → payments — but sales needs to *see* shipment status, not run the warehouse.
4. **Some customers have no ERP at all.** Their invoices and payments live in spreadsheets, a small
   accounting package, the tax authority's e-invoice portal and online banking.
5. **The constraints**: the CRM must not grow into an ERP; it carries only the data sales must see;
   and its first version is lean, covering the core business need (requirement items 4–6).

## Disposition & rationale

**B — a new standard module, not a change to the core.**

- **Why standard, not customer overlay (C):** points 1, 2 and 4 are not one company's shape. Every
  B2B seller has a contract that is invoiced and paid, and sales everywhere asks "invoiced? paid?
  overdue?". The figures are kept in an ERP or by finance; the window onto them is the same.
- **Why a module, not the core:** the maintainer's size constraint, and the boundary every mature
  product draws — the CRM owns the front office (lead → contract); fulfilment and receivables are
  kept elsewhere, and the CRM shows them.
- **Why lean:** HotCRM is the standard product a customer's own repository is built on
  (requirement item 6). The standard version carries the core every customer shares; a
  customer's particular shape — credit control, bills and their life cycle, month-end invoicing,
  orders and shipments from its ERP — is **C**, built in that customer's repository on top of the
  module, until enough customers share it to promote it here.

**The first version's scope — the whole of it.**

1. **Per contract**: the collection plan (what is due, when), and against it what has been invoiced
   and received, and what is still open.
2. **Per account**: the open receivable.
3. **Per rep**: the invoices past their due date, and this month's planned collections.

**What the module never does** — keep the books; allocate receipts across invoices; request, approve,
issue or correct invoices; reconcile with the bank or the customer; general ledger, vouchers, tax
filing; inventory, costing, production, purchasing and payables; revenue recognition; commission
calculation; notify the customer. Each belongs to the ERP, the accounting package, the tax
authority's or an e-invoicing provider's system, or finance.

**The revised ruling.** The 2026-08-02 ruling stands for the core packages — `sales`, `service`,
`revenue`, `marketing` model no orders, invoices or payments, and the core gains no field for them. A
standard module shows sales the collection plan and invoice and payment status. The ruling's text in
the two hand-off flow headers and `_billing-endpoint.ts` is updated by the module's first
implementation PR; this record ships documentation only (requirement item 4).

**The principle the module is built on: a window, never a book.** Every figure is kept where it is
kept — the ERP, or finance's records — and comes into the CRM by finance's import or entry (an ERP
writes through the same import key). The CRM is never the record a figure is corrected in; a
correction is made at the source and arrives the same way. The one thing sales keeps in the module
is its own collection plan.

## Product response

- **B, first version** — the metadata, phasing and decisions are the design document's
  ([`order-to-cash-module-plan.md`](../architecture/order-to-cash-module-plan.md)); in shape:
  - `crm_billing_milestone`, the contract's collection plan, kept by sales;
  - `crm_invoice` and `crm_payment`, records written by finance (or by an ERP through the same
    import key), read-only to sales; a payment may be a bill, with its maturity date;
  - four figures added to `crm_contract` and one to `crm_account` from the module through
    `objectExtensions`;
  - list views for the rep's overdue invoices and this month's planned collections.
- **Later, when customers need it** — overdue figures and reminder tasks, a collections dashboard,
  a subscription plan generator, account credit, and order and shipment status for goods sellers.
  The design document lists them and where each would land; none is designed now.
- **Relation to PSA** — the "billing milestones for `fixed_fee` projects" that
  [`psa-module-plan.md`](../architecture/psa-module-plan.md) defers to v2 are this module's
  `crm_billing_milestone`, reached through the project's contract; PSA does not grow a second
  milestone object.
- **C — a customer's own shape** (credit control, the life of a bill, month-end invoicing, national
  e-invoice detail, orders and shipments from its ERP) is built in that customer's repository on top
  of the standard module.

## Decisions recorded (2026-10-23)

The maintainer adopted the design's first three proposals unchanged, then, after reading the first
draft, set the scope twice (requirement items 5 and 6). The decisions and their reasons live in the design document
([*Decisions*](../architecture/order-to-cash-module-plan.md#decisions)); in short:

1. the package is `app.objectstack.hotcrm.o2c` (*Order to Cash* / 「订单与回款」);
2. "optional" means present in every install and used by permission — nothing shows without a
   grant, nothing runs without a module row, per-tenant enablement is asked upstream;
3. a module of its own, depending on the app package until revenue is packaged and on revenue
   after — not folded into revenue;
4. the module carries only what sales must see; it keeps no books;
5. the first version is lean — the core need only; the rest waits for customers who need it, and a
   customer's own shape is built in its own repository on the standard product.

The open decisions are the design document's.

## Acceptance

- First version: on `pnpm dev`, a software contract carries an advance / go-live / acceptance /
  retention collection plan kept by its rep; finance enters an issued invoice for one step and a
  payment against it, and imports a second invoice from a spreadsheet; the contract shows planned /
  invoiced / received / open and the account its open receivable; an invoice past its due date
  appears in its rep's overdue view; a rep can read invoices and payments but cannot create or edit
  them; the same invoice imported twice with the same `erp_ref` is one row. Recorded with a browser
  pass; `pnpm verify` green; one changeset per PR.
- This record is closed as **Shipped** when the first version is on `main`; later versions are new
  records or reopen this one.
