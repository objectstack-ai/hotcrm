# HotCRM order-to-cash module — what sales must see after the contract

> **Status**: design only. Nothing in `src/` moves on the strength of this document; every
> phase below lands through its own PR, `pnpm verify` and changeset. Decisions 1–5 (name, what
> "optional" means, the revenue dependency, the scope, a lean first version) were recorded on
> 2026-10-23; 6–8 are open.
> **Measured against**: `origin/main` at `4166f21`, `@objectstack/*` **18.0.0** (the pin); the
> platform facts cited from source were read at `@objectstack/spec` 18.0.0.
> **Companions**: [`../requirements/0007-order-to-cash-module.md`](../requirements/0007-order-to-cash-module.md)
> — the intake and the revised scope ruling; [`module-split-plan.md`](./module-split-plan.md) — the
> four measured edge rules (R1–R4) and the package decisions this design applies without
> re-deciding; [`psa-module-plan.md`](./psa-module-plan.md) — the sibling module whose deferred
> billing milestones this design supplies.

## Premise — a window, never a book; lean first

The maintainer's direction, summarized in REQ-0007: sales should see invoice, shipment and
collection status after the contract; for a software vendor the contract is the order; the CRM
carries only what sales must see; and the first version is lean, covering the core business need.

Three standing facts bound the design before anything is drawn:

| Fact | Consequence |
| --- | --- |
| The 2026-08-02 ruling, **as revised by REQ-0007**: the core packages model no orders, invoices or payments; a standard module shows their status | `sales`, `service`, `revenue` and `marketing` gain no object and no authored field. Everything below lives in one new package. |
| HotCRM is a pure metadata application (AGENTS.md, *Scope*) | Attachments are `enable.files`, people `sys_user`, imports the platform's import mappings. The module declares no infrastructure. |
| Permission sets stay whole in the `type: app` package (ADR-0130 addendum, 2026-09-02) | The module ships no permission set. Its grants are rows in the app package's sets; new roles are new sets there. |

Three rules size everything below:

1. **A window, never a book.** Every figure is kept where it is kept — the ERP, or finance's own
   records — and comes into the CRM by finance's entry or import; an ERP writes through the same
   import key. The CRM is never the record a figure is corrected in. So the module carries no
   book-keeping controls: no allocation, no credit notes, no locking, no gap-free numbering, no
   reconciliation. The one thing sales keeps in the module is its own collection plan.
2. **Lean first.** The first version carries the core need every customer shares — "invoiced? paid?
   overdue?" on a contract — and nothing else. Everything else is listed under *Later*, with where it
   would land, and is not designed now.
3. **The standard product is a base, not every customer's product.** A customer's own repository
   builds on this module (disposition **C**); a shape reaches the standard product when enough
   customers share it.

## The first version — the whole scope

| Where | What sales sees |
| --- | --- |
| Contract | the collection plan (each step's amount and date), and against it invoiced, received and open |
| Account | the open receivable |
| Rep | the invoices past their due date; this month's planned collections |

The rest of the module's eventual shape, and where each piece would land:

| Later — when customers need it | Lands in |
| --- | --- |
| Overdue amounts on the contract and account; a follow-up task when an invoice falls overdue | the standard module (the daily sweep below, promoted from fallback) |
| A collections dataset and dashboard | the standard module |
| A "generate plan" action for subscriptions, from `billing_frequency` and the term | the standard module |
| An integration identity separate from finance, for an ERP that writes by interface | the standard module |
| Order and shipment status for goods sellers | the standard module, once a second goods seller needs it; v1's invoice master (`crm_contract`) is revisited then, since a goods seller's invoice may cover several orders or none |
| Credit limit and credit used; the life of a bill (endorsement, discounting); month-end invoicing; national e-invoice detail | a customer's repository (C) until shared |

Out for good: invoice requests and approvals, issuing or correcting invoices, allocating receipts,
reconciliation, customer statements and dunning, shipment notices, returns, inventory, revenue
recognition, commission. Each belongs to the ERP, the accounting package, the tax authority's or an
e-invoicing provider's system, or finance.

## How figures come in

| Way in | Who writes |
| --- | --- |
| Entry | finance, on the record page |
| Import | finance, through the module's import mappings, keyed on `erp_ref` — from a spreadsheet, an accounting package's export or an ERP's |

An ERP with an interface writes through the platform's REST batch upsert on the same `erp_ref`, as a
user holding finance's permission set; a separate integration identity is a *Later* item. Every
invoice and payment row carries `source` (`import` · `manual` — an ERP's upsert counts as an import)
and `synced_at`, so a reader knows
where a figure came from and how old it is.

**Currency.** Amounts are in the company's currency, like every other amount in HotCRM today — no
object carries a currency code. An ERP converts before it writes. Multi-currency is a product-wide
question, not this module's.

## Where the module sits

| | Value | Why |
| --- | --- | --- |
| Package id | `app.objectstack.hotcrm.o2c` (decision 1, recorded 2026-10-23) | The id convention `module-split-plan.md` reserved for every module; an industry acronym like `cpq` and `psa`. |
| `type` | `module` | ADR-0019 D2's internal-contribution tier: shipped inside the App, never installed alone. |
| `namespace` | `crm` | ADR-0130 D1 co-ownership; objects are `crm_invoice`, not `o2c_invoice` (AGENTS.md, Tech Stack rule 2). |
| `dependencies` | `{ 'app.objectstack.hotcrm': … }` today; `app.objectstack.hotcrm.revenue` once revenue is packaged (decision 3, recorded 2026-10-23) | `crm_contract` is revenue's object, and `src/revenue/` is composed into the app package until the split cuts it out. The later edge is module → module — the same one `psa-module-plan.md` already takes — and departs from the base split's star graph; see *Why a module of its own* below. |
| `navigationContributions` | one entry into a group the app publishes, `group_order_to_cash` | R2 — the only way a module reaches the menu. |
| Labels | *Order to Cash* in `en`; 「订单与回款」 in the zh-CN pack, in the same PR as the group | One name for the menu group and the package's docs section. |
| Version | the artifact's | ADR-0130 D6. |
| Source layout | `src/o2c/` with its own `index.ts` and per-type barrels | A directory is a package (`module-split-plan.md`, 2026-09-14 item 6). |
| Token gate | its own three ceilings, anchored in the PR that lands `src/o2c/objects/` | #1928: every package carries its own; a package's first ceiling is an anchoring, not a raise. |

**What "optional" can mean on the pin — measured against the platform, not assumed.** ADR-0019 D2
makes `type: app` the only consumer-installable unit, and a module ships *inside* it; ADR-0019 lists
inter-App dependencies as deferred; `HOTCRM_COMPOSITION` (`objectstack.composition.ts`) selects one
shape per build for every tenant alike. So the module cannot be installed per customer today. It is
**present in every install and used optionally** — accepted as decision 2 on 2026-10-23, under three
conditions that make an unused module invisible:

1. **Nothing shows without a grant.** The module's navigation, pages and records, and the fields it
   adds to `crm_contract` and `crm_account`, are readable only through the module's rows in the app
   package's permission sets (field permissions on the extension fields). A tenant that assigns none
   of them sees a contract page exactly as today — no row of zeros.
2. **Nothing runs without a module row.** Every hook attaches to a module object, never to the
   contract or the account (R4), so in a tenant that never writes a module row nothing in the module
   ever fires.
3. **The upstream ask is filed.** Per-tenant enablement of a module inside an App (*Upstream asks*).
   When it lands the module switches to it with no data migration — the objects are already there.

The core packages are untouched either way.

**Why a module of its own, not more of revenue** (decision 3, 2026-10-23). The new edge reads only
`crm_contract` and `crm_account`, the two most stable objects revenue owns, and it matches PSA's:
revenue becomes the one upstream of the post-signature modules, and PSA reaches this module's plan
through the project's contract with no edge between the two (decision 8). The decision was also
argued on size — `src/revenue/` reads ~21.5k authored tokens against a ruled ceiling of ~28.5k
(`scripts/check-source-token-ratchet.mjs`, at `4166f21`). Decisions 4 and 5 make the module much
smaller than that argument assumed; the edge and PSA reasons stand on their own, and the decision is
recorded, not re-opened here.

## The data model — first version

| Object | What it is | Written by | Key references | `sharingModel` (Phase 1 confirms) |
| --- | --- | --- | --- | --- |
| `crm_billing_milestone` | One step of a contract's collection plan: an advance, go-live, acceptance, retention, or one subscription period | sales (the contract's editors) | masterDetail `crm_contract`; `crm_account` (stamped) | `controlled_by_parent` |
| `crm_invoice` | The record of an issued invoice | finance | masterDetail `crm_contract`; lookup `crm_billing_milestone` (optional); `crm_account` (stamped) | `controlled_by_parent` |
| `crm_payment` | The record of money received against a contract — against one invoice, or against a plan step before it is invoiced | finance | masterDetail `crm_contract`; lookup `crm_invoice` (optional); lookup `crm_billing_milestone` (optional); `crm_account` (stamped) | `controlled_by_parent` |

A receipt that pays several invoices is recorded as one payment row per invoice — the split the ERP
or finance has already made. That is why there is no allocation object. An advance paid before its
invoice points at the plan step; when the invoice is issued, finance fills in `crm_invoice` on the
same row.

- **`crm_billing_milestone`** — `name`, `planned_amount`, `planned_date`, `accepted_date` (optional:
  for a step paid on acceptance, the date its customer signed off — recorded by a person, never a
  machine, AGENTS.md rule 8); read-only `invoiced_amount`, `received_amount`, `open_amount` (planned
  minus received). When a contract is amended, its rep revises the plan.
- **`crm_invoice`** — `invoice_number`, `issue_date`, `amount` (as issued, tax included),
  `due_date` (defaulted from the contract's `payment_terms` on entry), `status` (`issued` ·
  `cancelled` — an invoice cancelled or fully credited at the source is set `cancelled` and leaves
  every figure), the invoice file (optional); read-only `paid_amount`, `open_amount`; `source`,
  `erp_ref` (unique), `synced_at`.
- **`crm_payment`** — `payment_date`, `amount`, `method` (`bank_transfer` · `bill` · `other`),
  `bill_maturity_date` (required when `method = bill`); `source`, `erp_ref` (unique), `synced_at`.
  A bill — an acceptance bill, a bill of exchange, a promissory note — counts as received on the day
  it is received, and its maturity date tells sales when it turns into cash; what happens to the
  bill afterwards is finance's (decision 7). Sales does not record payments: a figure sales sees is
  always one finance wrote, so a commission plan built on collections never reads a number the rep
  typed.

**The figures are summaries**, one hop each over the module's own rows
(`summaryOperations: { object, field, function, relationshipField, filter }`), filtered to
`status = issued` invoices; none is a summary of another summary. A plan step's received amount
reads payments that point at it directly or through their invoice; a hook on `crm_payment` (a module
object, R4) stamps the step from the invoice so the summary stays one hop.

**Overdue in the first version is a view, not a figure.** The rep's *Overdue invoices* view lists
invoices with `due_date` before today and `open_amount` above zero; *Planned this month* lists plan
steps due this month. Phase 1 measures whether a list-view filter takes a relative date — HotCRM's
flows already filter on `today()` (`contract-expiration.flow.ts`), its views have not. If a view
cannot, the fallback is the *Later* item brought forward: a daily `schedule` flow (`runAs: 'system'`,
organization predicate pinned — AGENTS.md rule 10) that stamps `is_overdue` on the pattern of the
existing `quote_expiration` flow.

## Contract and account fields — the one new cross-package construct

| Target | Fields added through `objectExtensions` |
| --- | --- |
| `crm_contract` | `planned_amount`, `invoiced_amount`, `received_amount`, `receivable_balance` (invoiced minus received) |
| `crm_account` | `receivable_balance` — invoiced minus received, from summaries over the account-stamped invoices and payments, one hop each, never a summary of the contract's summaries |

**What the platform carries, read at `@objectstack/spec` 18.0.0 — not yet measured in this repo:**

- `ObjectExtensionSchema` (`packages/spec/src/data/object.zod.ts`) merges exactly `fields`, `label`,
  `pluralLabel`, `description`, `validations` and `indexes` into the target. Its own guidance refuses
  the rest by name: **`hooks`, `listViews` and `fieldGroups` cannot be contributed**, and an action on
  the target is a top-level action with `objectName` in the extending stack.
- ADR-0130 D5 makes an intra-artifact extension of another package's object a sanctioned shape:
  the extending package registers **after** the one it extends, by declared `dependencies`, and the
  platform pins that behaviourally.
- The summary index (`ObjectQL.buildSummaryIndex`, `packages/objectql/src/engine.ts`) walks
  `SchemaRegistry.getAllObjects()`, whose bodies `resolveObject` has already folded every extender
  into — so by reading, a summary field added through an extension is indexed like a declared one.
- HotCRM has never authored an `objectExtensions` entry, and the four measured rules (R1–R4) do not
  cover the class. **Phase 0 measures it** on a running instance.

**Fallback if Phase 0 refuses the class**: the contract's figures are read from the plan, invoice and
payment related lists on the contract page, each list carrying its own amounts, and the account's
from its invoice list — no core change either way. Per AGENTS.md *Scope* rule 2 a refusal is filed
upstream and the fallback is a recorded choice, not a workaround.

**One consequence of `fieldGroups` not travelling**: the added fields cannot join a group on the
contract's derived layout from the module side. Decision 6.

## Cross-package edges, judged by the measured rules

| Rule | Edges this module creates | Verdict |
| --- | --- | --- |
| **R1** lookup / masterDetail into another package's object | plan steps, invoices and payments → `crm_contract` and `crm_account` | ✅ ACCEPTED |
| **R2** `navigationContributions` into the app | one, into `group_order_to_cash` | ✅ ACCEPTED |
| **R3** a module's own app navigating to a foreign object | none — the module declares no app | n/a |
| **R4** a hook attached to another package's object | **none by design** — the one hook is on `crm_payment`; contract and account are read at run time | n/a |
| *unmeasured* — `objectExtensions` into another package's object | `crm_contract`, `crm_account` | **Phase 0 measures** (above) |
| *unmeasured* — a page component listing a module object on an app-owned page | plan steps, invoices and payments on the contract page; invoices on the account page | Phase 0 measures, as `psa-module-plan.md` does for projects |

## Permissions and sharing

- **Position** (app package, `src/sales/sharing/positions.ts`): `ar_accountant`. If PSA's
  `finance_controller` lands first, it gains read on the module's objects.
- **Permission sets** (app package, `src/sales/profiles/`), rows to add:
  - **`sales_rep`, `sales_manager`** — create and edit plan steps on contracts they can edit; read
    invoices and payments; read the contract and account fields.
  - **new `ar_accountant`** — create and edit invoices and payments, by entry or import; read plan
    steps and the contract and account fields.
  - **`crm_user`** — read on the contract and account fields only; it stays the anchor-safe default
    (#2231).
  - **`system_admin`** / **`tenant_admin`** — full grants, as on every other object.
- **Sharing**: all three objects are `controlled_by_parent` on the contract, so whoever reads a
  contract reads its plan, invoices and payments. Phase 1 settles the exact reach against the
  existing parent-derived-reach tests rather than this paragraph.
- Phase 1 also measures that a field permission with `editable: false` holds on **create**, not only
  on update; the rep's read-only grant on invoices and payments rests on it.

## i18n and docs

- **Locales**: every object, field, option, view and navigation label in all four packs under
  `src/sales/translations/`, in the same PR as the metadata (AGENTS.md, *Constraint Checklist*).
- **Product docs**: a `content/docs/order-to-cash/` section — `index`, `collection-plan`,
  `invoices-and-payments` (including entry and import) — English first, `.zh-Hans.mdx` and
  `.zh-Hant.mdx` beside each, under *Documentation discipline*. `content/docs/revenue/billing-handoff.mdx`
  gains a pointer to the module.

## Phasing

Each phase is one PR family: `pnpm verify` green, a changeset, product docs in three languages for
anything a user sees, and a browser pass on `pnpm dev` for anything a user clicks. A phase does not
open until the previous one is on `main`.

| Phase | Ships | Acceptance |
| --- | --- | --- |
| **0 — join the artifact, measure** | `src/o2c/` with its `index.ts` and manifest; the `group_order_to_cash` node in the app (labels *Order to Cash* / 「订单与回款」); four throw-away measurements recorded in the PR body and reverted | `packages[]` gains one entry ordered after its dependencies; the boot log carries no `nav_contribution_group_missing`; every existing object registers bit-identically; **(a)** a summary added to `crm_contract` through `objectExtensions` recomputes on a module child write; **(b)** an app-package permission set's field permission applies to that extension field; **(c)** a contract-page related list of a module object renders; **(d)** with no module permission set assigned, the contract and account pages show none of the extension fields |
| **1 — the first version** | the three objects; the contract and account fields; the two rep views; the import mappings; the permission rows; the 2026-08-02 ruling text in the hand-off headers updated; docs | REQ-0007 *Acceptance* |

*Later* items each open their own record or reopen REQ-0007 when a customer needs them.

## Decisions

### Recorded 2026-10-23

The maintainer adopted the three proposals below unchanged, as put to them; then, after reading the
first draft, set the scope — decisions 4 and 5.

1. **Name** — package `app.objectstack.hotcrm.o2c`, source `src/o2c/`, navigation group
   `group_order_to_cash`, labelled *Order to Cash* / 「订单与回款」. *Billing* reads as an invoicing
   or ledger product, which this module is not; *orders* does not fit the first version, where the
   contract is the order; *order to cash* holds what comes later too and is the industry's name for
   this span. Object names are unchanged — `crm_billing_milestone` names the thing (a billable step
   of a contract), not the package.
2. **"Optional" means present in every install and used by permission**, under the three conditions
   in *Where the module sits*: nothing shows without a grant, nothing runs without a module row, and
   per-tenant enablement is asked upstream.
3. **A module of its own that depends on revenue** — on the app package until revenue is packaged,
   on `app.objectstack.hotcrm.revenue` after; not folded into revenue. Reasons in *Why a module of
   its own*.
4. **Only what sales must see** — the module is a window, never a book. The first draft kept the
   books for a tenant with no ERP (separation of duties, locking, credit notes, allocation,
   reconciliation, a mode switch); all of it is out.
5. **A lean first version** — the core need only: the collection plan and invoice and payment status
   on a contract. Everything else is under *Later*; a customer's own shape is built in its own
   repository on top of the standard module.

### Still open

| # | Question | Needed by |
| --- | --- | --- |
| 6 | **The contract fields' place on the contract page** — accept the default placement a field outside any group gets, or let revenue declare one empty `receivables` group on `crm_contract` (a one-line change to a core object, contrary to "the core gains no field" in spirit if not in letter) | Phase 1 |
| 7 | **A bill as a standard payment method** (proposed above), with its life cycle and national e-invoice detail left to a customer's repository — confirm | Phase 1 |
| 8 | **PSA's billing milestones** are this module's plan steps, reached through the project's contract, with no edge between PSA and this module (proposed) | PSA v2 |

## Upstream asks

- **Per-tenant enablement of a module inside an App** (or the inter-App dependencies ADR-0019
  defers) — the only route to "install it only for the customers who want it". Decision 2 accepted
  the present-everywhere shape meanwhile; when this lands the module moves to it with no data
  migration.
- **Whatever Phase 0 refuses** among the four measurements is filed as its own platform card, and the
  phase waits for the fix in the pin (AGENTS.md *Scope* rule 2) or takes the recorded fallback.
- **`fieldGroups` through `objectExtensions`** — if decision 6 wants the contract fields grouped
  without touching the owning object.

## References

- [`../requirements/0007-order-to-cash-module.md`](../requirements/0007-order-to-cash-module.md) — the
  intake and the revised 2026-08-02 ruling
- [`../requirements/0002-it-services-project-delivery-and-cost.md`](../requirements/0002-it-services-project-delivery-and-cost.md)
  — the invoicing and collection figures of steps 37–38 this module answers
- [`psa-module-plan.md`](./psa-module-plan.md) — the deferred `fixed_fee` billing milestones, and the
  module → revenue edge this design shares
- [`module-split-plan.md`](./module-split-plan.md) — R1–R4, the assignment rule, the 2026-09-02 and
  2026-09-14 decisions, the upstream asks
- ADR-0019 D2 — modules are internal contributions; inter-App dependencies deferred
- ADR-0130 D5 — intra-artifact object extension and its ordering contract; the 2026-09-02 addendum on
  permission sets
- `@objectstack/spec` `ObjectExtensionSchema` (`packages/spec/src/data/object.zod.ts`) and
  `ObjectQL.buildSummaryIndex` (`packages/objectql/src/engine.ts`) — the two platform facts the
  contract-fields section reads
- `src/sales/flows/billing-handoff-closed-won.flow.ts`, `src/revenue/flows/billing-handoff-contract-activated.flow.ts`,
  `src/sales/flows/_billing-endpoint.ts` — where the 2026-08-02 ruling is written today
