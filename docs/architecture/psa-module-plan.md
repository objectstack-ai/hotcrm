# HotCRM PSA module — a standard-product design, and the first ADR-0130 module cut

> **Status**: design only, **restarted 2026-11-15** (see *Recorded 2026-11-15* below). Nothing
> in `src/` moves on the strength of this document; every phase below lands through its own PR,
> `pnpm verify` and changeset.
> **Measured against**: first written against `origin/main` at `c716a2c` on `@objectstack/*`
> 17.4.0; the 2026-11-15 revision reads `main` at `2492ac6` on **18.4.0** (the pin). Readings
> below that name 17.x are history; phase 0 re-measures what it relies on.
> **Companions**: [`module-split-plan.md`](./module-split-plan.md) — the inventory, the
> four measured edge rules (R1–R4) and the maintainer decisions of 2026-09-02 and
> 2026-09-14 that this design applies without re-deciding; [`../requirements/0002-it-services-project-delivery-and-cost.md`](../requirements/0002-it-services-project-delivery-and-cost.md)
> — the customer intake that triggered it.
> **Upstream**: ADR-0130 (*the release artifact is the co-ownership boundary — one artifact,
> N packages*), [objectstack#14122](https://github.com/objectstack-ai/objectstack/issues/14122) (epic).

## Recorded 2026-11-15 — PSA restarts, six rulings

The maintainer ruled all six questions of the restart evaluation on 2026-11-15
(03:48–03:49Z, option A each; evaluation report
<https://claude.ai/artifact/X8BPYw9KW45x4k6iBSZ6Zu>). Platform side: nothing. They supersede
the sections below where those disagree, and the three *Decisions needed* of the first draft.

1. **Shape.** PSA is a suite module, `src/psa/`, `type: 'module'`, depending on
   `app.objectstack.hotcrm` only, with **its own app, 项目交付 (*Project Delivery*)** — the same
   shape as Order to Cash's own app (hotcrm#2465). This replaces the `group_projects` node in the
   Sales app.
2. **Restart.** hotcrm#2316 leaves `pm:on-hold` and is queued after hotcrm#2465 (6.3).
3. **v1 = the standard tier:** `crm_project`, `crm_project_member`, `crm_rate_card`,
   `crm_timesheet` + `crm_time_entry`, `crm_expense`; **three approval points in v1**
   (project initiation, timesheet, expense), with budget approval becoming the fourth in
   phase 2; actual cost and margin roll-ups; the overrun alert (a machine signal warns, a
   person's field locks). Budget versions (`crm_project_budget` / `_line`) move to phase 2,
   with tasks and Gantt. *Design consequence (not a ruling):* v1 has no budget baseline, so
   the alert's denominator is an `approved_budget` currency field on `crm_project`, locked
   when the initiation approval passes; phase 2's baseline approval writes it back (see
   *The data model*).
4. **Time-and-materials invoicing stays in Order to Cash.** PSA emits the approved billable
   amount; invoicing is O2C's. How the two modules connect is decided in phase 3 — in v1 PSA
   does not depend on O2C.
5. **The rate card holds both cost price and bill price**, with no dependency on the revenue
   module's price books.
6. **One `crm_project` with `kind`** = `presales` / `delivery` / `internal`.

## Premise — a standard module, not a transcription of one customer's spreadsheet

Maintainer ruling, 2026-09-14, verbatim and untranslated:

> 「hotcrm 是标准模版，如果开发 psa 也是应该按标准产品的方向设计，不应该受限于这个 excel」

So this document designs **Professional Services Automation as the standard product would
ship it**: the seam between *winning* work (which HotCRM already owns, lead → contract) and
*delivering it profitably* — projects, the people staffed on them, the rates they cost, the
budget they were sold against, the time and expenses they actually consume, and the margin
that results. That is the shape every product in this category converges on (the
Certinia / Kantata / OpenAir class), and it is the shape an IT-services, consulting, agency
or systems-integration customer recognises without translation.

REQ-0002 is used the way a standard product uses a customer: as a **validation scenario**.
Each of its 26 project-side steps is mapped onto the standard model at the end of this
document, and each mapping carries a disposition — standard, customer overlay, or declined.
Where the spreadsheet and the standard shape disagree (a five-level named approval chain, a
`Bizcase 审核岗`, role titles specific to one organisation), the standard shape wins and the
difference becomes an overlay that customer installs on top.

Three standing rulings bound the scope before anything is designed:

| Ruling | Consequence for PSA |
| --- | --- |
| HotCRM owns lead → contract and models **no orders, invoices or payments** (2026-08-02, recorded in `src/sales/flows/billing-handoff-closed-won.flow.ts`) | PSA tracks **cost and billable effort**, never invoicing or collection. What billing needs — approved billable hours and expenses per project — leaves through the same durable-outbox hand-off pattern the contract flow already uses. |
| HotCRM is a **pure metadata application**; platform capability is built in objectstack (AGENTS.md, Scope) | Approvals are `approval` flow nodes, the org dimension is `sys_business_unit`, attachments are `enable.files`, people are `sys_user`. PSA declares no infrastructure. |
| Permission sets stay **whole in the `type: app` package** (ADR-0130 addendum, 2026-09-02, objectstack#14487) | PSA ships no permission set of its own. Its object grants are rows added to the app package's sets; new roles are new sets there. |

## Where PSA sits — after the base CRM splits

Maintainer ruling, 2026-09-14, verbatim and untranslated, given on reading the first draft
of this document (the token-budget finding below):

> 「所以应该先分拆基础的crm, 比如 sales 和 support， token 门禁： 放到 sales」

Two consequences, both recorded in [`module-split-plan.md`](./module-split-plan.md) under
*Decisions recorded (2026-09-14)* and applied here:

1. **The base CRM splits first.** The first ADR-0130 cuts are sales (which *is* the app
   package) and service (“support”), not PSA — the shape is `module-split-plan.md`,
   *Decisions recorded (2026-09-14)*. PSA is a **later** package added to an artifact that is
   already composed — it inherits the layout, the composition, the navigation-contribution
   channel and the gate shape the base split establishes, and proves none of them.
2. **The token gate measures the sales module.** The headline claim the gate protects is
   ADR-0130 §1.3(b)'s own wording — *a CRM sales module fits whole in an AI context window* —
   so the ratchet measures `src/sales/`. PSA is outside it, and this document's decision 1
   (partition or raise) is closed.

The first draft argued PSA should be the first cut because it is new — no file moves, no
navigation conversion, no hook relocation. That argument is kept for the record and is
**superseded**: a new module proves the pipeline cheaply, but the product needs the base
modules to exist before a fourth one is worth having, and the gate question only resolves
cleanly once `sales` is a package the gate can point at.

What the pin carries is still the fact the sequence rests on. The split plan listed three
upstream blockers on 2026-09-02; two are now **in the pin** and the third does not gate a
module booted from an artifact:

| Blocker as listed on 2026-09-02 | Where it landed | In 17.4.0? |
| --- | --- | --- |
| Compile path — `os build` emitting `packages[]` ([objectstack#14439](https://github.com/objectstack-ai/objectstack/issues/14439)) | `@objectstack/cli` 17.3.0 (`7085f90`), `@objectstack/spec` 17.3.0 (`2e3e8c7`, `manifest: 'preserve'`) | ✅ |
| Per-package registration at load — every object has one owner across every door ([objectstack#14599](https://github.com/objectstack-ai/objectstack/issues/14599)) | `@objectstack/core` 17.3.0 (`655b106`); `@objectstack/runtime` 17.4.0 (`f1a1028`, collections read from `packages[]`) | ✅ |
| Studio's writable verdict ([objectstack#14430](https://github.com/objectstack-ai/objectstack/issues/14430)) | Studio surface | Not needed: a module booted from an artifact is served `writable: false` like the app package is today (ADR-0070 D2). |

The base split's first PR is the measurement that turns this table from a changelog reading
into a fact about this repository. Merged upstream is not the same as proven in the pin
(AGENTS.md, *Platform Upgrades*).

## Package shape

One new package, composed into the artifact HotCRM already ships:

| | Value | Why |
| --- | --- | --- |
| Package id | `app.objectstack.hotcrm.psa` | The id convention `module-split-plan.md` reserved for every module. |
| `type` | `module` | ADR-0019 D2's internal-contribution tier: shipped inside the App, never installed alone. |
| `namespace` | `crm` | ADR-0130 D1 co-ownership, so objects are `crm_project` and not `psa_project` — the same prefix rule as every other object here (AGENTS.md, Tech Stack rule 2). |
| `dependencies` | `{ 'app.objectstack.hotcrm': '^<artifact version>' }` | The topological edge that registers the app package first (ADR-0130 D5). The array order in `composeStacks` decides nothing. |
| `apps` | one module-owned app, 项目交付 (*Project Delivery*) | Ruled 2026-11-15 (see *Navigation*), the shape of Service, Marketing and Order to Cash. |
| Version | the artifact's | ADR-0130 D6: one artifact, one version, no per-module hot-fix. |

**Dependencies, amended 2026-10-26.** `module-split-plan.md` *Decisions recorded (2026-10-26)*
items 10, 11 and 13 apply: PSA depends on `app.objectstack.hotcrm` only — `crm_contract` is the
app package's from PR 0.5 on, so a dependency on `app.objectstack.hotcrm.revenue` is never
declared. The amendment's "born as its own installable artifact" line is **superseded**
(2026-11-05, re-ruled on #2315 and applied here; confirmed 2026-11-15): a standalone app cannot
reference a HotCRM object (`object-reference-unknown`, objectstack#25805 closed not_planned), so
PSA is one more `type: 'module'` package of the HotCRM artifact, at the artifact's version.

**Source layout — a directory is a package (2026-09-14, `module-split-plan.md` item 6).**
PSA is `src/psa/`: one `index.ts` calling `defineStack` with the manifest above, and the
metadata-type subdirectories it uses — `objects/` (each `*.hook.ts` beside its
`*.object.ts`), `views/`, `pages/`, `flows/`, `actions/`, `datasets/`, `dashboards/`,
`data/` — each with its explicit barrel. Root `objectstack.config.ts` adds the stack to the
`composeStacks(…, { manifest: 'preserve' })` call the base split already established. PSA
imports source only from its own directory and from `src/sales/` (the import rule, item 7):
`_hook-api.ts`, the picklist helpers and `_thresholds.ts` are reached there, never copied.
Every guard test that walks the package directories covers PSA metadata from the first file
— i18n coverage, object docs coverage, view references, validation-predicate totality — with
no new guard written (AGENTS.md, Scope rule 3).

**What stays in the sales package** (sales *is* the app package, item 4): the Sales app, the
permission sets plus any new role, `positions.ts`, the package docs and the shared sources.
PSA depends on `app.objectstack.hotcrm` for `crm_account`, `crm_opportunity`, `crm_contract`
(the app package's since #2310) and the shared sources.

**Navigation (ruled 2026-11-15).** PSA owns its app, 项目交付 (*Project Delivery*), in
`src/psa/apps/`, built like `ServiceApp`, `MarketingApp` (#2430) and Order to Cash's app
(#2465): projects, members, rate cards, timesheets, expenses and their approvals, with
the PSA manual under Help. A module's own `app.navigation` may not name an object outside its
package (`defineStack` refuses it; ADR-0130 §1.5, "navigation crosses only through
contributions"), so Accounts and Opportunities reach the app the way they reach the Service
app: the PSA app declares an empty anchor group, and the app package fills it with
`navigationContributions` (`src/service/apps/service.app.ts` `group_customers`, filled from
`src/sales/index.ts`). Who sees the app is the permission sets' `tabPermissions` (visibility
only; the URL still opens). On 18.4.0 a module-owned app works, app URLs go by package id, and
disabling the module drops its app (#2417 readings); phase 0 re-measures the last on PSA. The first draft's `group_projects`
node in the Sales app is **not built**.

## The data model — v1

Eight objects designed. **Ruled 2026-11-15: v1 ships six of them**; the two budget objects
(`crm_project_budget`, `crm_project_budget_line`) move to phase 2. The rule for what made the cut: **a thing is an object in v1 if the standard
product cannot compute margin without it.** Work breakdown (tasks, milestones), resource
requests and capacity planning, and billing milestones are real PSA concerns and are
deliberately v2 — margin is computable without them, and each is a scope of its own.

| Object | Role in the model | Parent / key references | `sharingModel` |
| --- | --- | --- | --- |
| `crm_project` | The delivery engagement. Carries the budget baseline, the actual-cost rollups and the margin. | lookup `crm_account` (required), `crm_opportunity`, `crm_contract`, `source_project` (self), `project_manager` → `sys_user`, `business_unit` and `cost_center` → `sys_business_unit` | `private` + membership sharing rule |
| `crm_project_member` | Who is staffed, in what role, at what rate, for how long. | masterDetail `crm_project`; `sys_user`; lookup `crm_rate_card` | controlled by parent |
| `crm_rate_card` | A role level's cost rate and bill rate, per unit and currency, effective-dated. | lookup `sys_business_unit` (optional scope) | `public_read` |
| `crm_project_budget` | One **version** of a project's budget. The approved version is the baseline; a later approved version supersedes it. | masterDetail `crm_project` | controlled by parent |
| `crm_project_budget_line` | A budget line: category × period × quantity × unit cost. | masterDetail `crm_project_budget`; lookup `crm_rate_card` | controlled by parent |
| `crm_timesheet` | One person's hours on one project for one period, submitted and approved as a unit. | lookup `crm_project`, `sys_user`; `approver` → `sys_user` (stamped) | `private` |
| `crm_time_entry` | A day's hours inside a timesheet. Carries the cost it represents. | masterDetail `crm_timesheet` | controlled by parent |
| `crm_expense` | A project-attributable expense with its receipt. | lookup `crm_project`, `sys_user`; `approver` → `sys_user` (stamped) | `private` |

### `crm_project`

- **Identity**: `project_number` (autonumber), `name`, `kind` (`presales` · `delivery` ·
  `internal`), `billing_type` (`fixed_fee` · `time_and_materials` · `retainer` ·
  `non_billable`), `description`, `security_classification` (`public` · `internal` ·
  `confidential` · `restricted`).
- **Provenance**: `crm_account`, `crm_opportunity`, `crm_contract`, `source_project` — a
  delivery project points at the presales project it was won from. One object with a `kind`
  rather than two objects (a *presales estimate* and a *delivery project*): time is booked
  against both in every PSA, roles are staffed on both, and a budget version belongs to
  both, so two objects would duplicate the three child objects. The alternative is recorded
  as decision 5.
- **Plan**: `planned_start`, `planned_end`, `planned_revenue`, `actual_start`, `actual_end`,
  `percent_complete`.
- **Lifecycle**: `status` under a `state_machine` validation — `draft → in_approval →
  approved → active → on_hold ⇄ active → completed → closed`, with `rejected` reachable from
  `in_approval` and `cancelled` from any open state. `approval_status` and `approved_date`
  are stamped by the approval flow exactly as `crm_opportunity` stamps them today.
- **v1 budget figure (2026-11-15).** Budget versions are phase 2, so v1's `crm_project`
  carries `approved_budget`, a currency field set before submission and locked once the
  initiation approval passes; `budget_consumed_percent` in v1 is `actual_cost /
  approved_budget`. Phase 2's baseline approval writes the baseline total back into
  `approved_budget` by flow, so the field never changes type; `baseline_cost` below is the
  phase-2 design.
- **Money** — every figure a formula or a summary, never typed in: `baseline_cost` (summary
  over `crm_project_budget.total_cost` with `filter: { is_baseline: true }`),
  `actual_labor_cost` (summary over `crm_timesheet.total_cost` with
  `filter: { status: 'approved' }`), `actual_expense_cost` (summary over `crm_expense.amount`
  with the same filter), `actual_cost`, `cost_variance`, `budget_consumed_percent`,
  `gross_margin` (`planned_revenue − actual_cost`), `gross_margin_percent`. A summary reaches
  **one** relationship (`summaryOperations: { object, field, function, relationshipField,
  filter }` on the pin — `filter` ANDs with the parent match, so "approved only" needs no
  stamped helper field), which is why the chain is entry → timesheet → project in two
  summaries rather than one. Whether a summary may read a field that is itself a summary is
  measured in Phase 3, the way `crm_account.child_account_revenue` was measured
  (`test/decorative-field-sweep.test.ts`); the fallback is a rollup hook on the timesheet.
- **Control**: `budget_status` (`within` · `warning` · `exceeded`) — a **machine signal**
  derived from `budget_consumed_percent`; `time_entry_locked` (boolean) — a **person's
  decision**. The two are separate on purpose; see *Cost control*.
- Attachments via `enable: { files: true }` (statements of work, kick-off confirmations).
- Layout derived from `fieldGroups` (`identity`, `provenance`, `plan`, `financials`,
  `control`); no authored `record:details` sections (AGENTS.md, escape-hatch ladder).

### `crm_project_member`

`sys_user` (required), `role` (select: `project_manager` · `project_director` ·
`account_manager` · `architect` · `consultant` · `quality_assurance` · `finance_partner` ·
`subcontractor`), `rate_card` (lookup), `allocation_percent`, `start_date`, `end_date`,
`is_billable`. A validation refuses `end_date < start_date`. A hook stamps
`crm_project.project_manager` from the member row carrying `role = project_manager`, so the
project's approver field is never typed twice.

### `crm_rate_card`

`name`, `role_level` (select — the standard ladder `junior` · `intermediate` · `senior` ·
`lead` · `principal`, customer-extensible through the picklist), `cost_rate`, `bill_rate`,
`unit` (`hour` · `day`), `currency`, `effective_from`, `effective_to`, `business_unit`.
A validation keeps `bill_rate ≥ cost_rate` unless `is_internal`.

### `crm_project_budget` and `crm_project_budget_line`

The budget is **versioned**, which is what makes "import the approved Bizcase as the
baseline" and "apply for a top-up when the budget runs short" the same mechanism: a new
version, a reason, an approval, and on approval the flag moves.

- Header: `version` (number, unique per project), `status` (`draft` · `in_approval` ·
  `approved` · `superseded` · `rejected`), `is_baseline` (exactly one approved version per
  project carries it; the approval flow moves it), `reason` (required when `version > 1`),
  `total_cost` (summary), `planned_revenue`, `gross_margin` and `gross_margin_percent`
  (formulas), `approval_status`.
- Line: `category` (`labor` · `subcontract_service` · `third_party_goods` · `expense`),
  `period` (date, first of month), `rate_card` (lookup, labor only), `quantity`
  (headcount or units), `hours`, `unit_cost`, `amount` (formula: `hours × unit_cost` for
  labor, `quantity × unit_cost` otherwise), `description`. `requiredWhen` gates make
  `rate_card` and `hours` required for `labor` and `quantity` for the other three — a
  transition gate, not an invariant (AGENTS.md, Metadata semantics rule 7).

### `crm_timesheet` and `crm_time_entry`

- Timesheet: `sys_user`, `crm_project`, `period_start`, `period_end`, `status` (`draft` ·
  `submitted` · `approved` · `rejected`), `total_hours` (summary), `total_cost` (summary),
  `approver` (stamped from `crm_project.project_manager` on insert), `approval_status`. A
  validation refuses a period longer than 31 days, and a unique index holds one timesheet
  per (user, project, period_start). Weekly or monthly is therefore the customer's choice of
  `period_end`, not a product setting.
- Entry: `date` (inside the parent period — validation), `hours` (0 < h ≤ 24),
  `is_billable`, `notes`, `cost_rate` and `cost_amount`. The rate is **copied from the
  member's rate card when the entry is written** and stored, never recomputed: a rate-card
  change next quarter must not rewrite last quarter's cost. The hook that copies it reads
  the member row through `ctx.api` — a run-time read, not an authoring-time reference.

### `crm_expense`

`sys_user`, `crm_project`, `expense_date`, `category` (`travel` · `lodging` · `meals` ·
`equipment` · `other`), `amount`, `currency`, `is_billable`, `notes`, `status` (`draft` ·
`submitted` · `approved` · `rejected` · `reimbursed`), `approver` (stamped like the
timesheet's), `approval_status`; the receipt is an attachment (`enable.files`).

### Picklists

Every PSA option list lives once, in a `_psa-picklists.ts` beside `_picklists.ts`, and is
spread into the field the way `OPPORTUNITY_STAGE_OPTIONS` is today — one copy, one place a
customer overlay extends.

## Cross-package edges, judged by the four measured rules

Every edge PSA creates falls under a rule `module-split-plan.md` has already measured on a
running instance; none is new.

| Rule | PSA edges | Verdict |
| --- | --- | --- |
| **R1** lookup / masterDetail into another package's object | `crm_project` → `crm_account`, `crm_opportunity`, `crm_contract`; six objects → `sys_user`; two → `sys_business_unit` | ✅ ACCEPTED — the same class as the 15 `sys_user` lookups the app has always carried |
| **R2** `navigationContributions` | the app package contributes Accounts and Opportunities into an anchor group of the 项目交付 app | ✅ ACCEPTED — the shape the Service and Marketing apps already use |
| **R3** a module's own app navigating to a foreign object | none — refused by `defineStack` (ADR-0130 §1.5); R2 carries it | n/a |
| **R4** a hook attached to another package's object | **none by design.** Every PSA hook attaches to a PSA object; CRM rows are only ever *read* at run time through `ctx.api` | n/a |

**No `objectExtensions` in v1.** The standard product does not push PSA fields into
`crm_account` or `crm_opportunity`; the relationship is held on the PSA side, and the CRM
record reaches its projects through a list view filtered by account. A customer that wants
"the opportunity stage may not advance until the project is approved" writes that as an
overlay extension carrying a validation on `crm_opportunity` — the mechanism exists
(`ObjectExtensionSchema` merges `fields`, `validations` and `indexes`), and it is theirs.

**The one unmeasured class PSA will eventually touch** is a *related list of projects on the
account and opportunity record pages* — the split plan's "page component binds an object in
another module" (5 instances there, unmeasured). The pages are app-owned, the object would be
module-owned. It is scheduled in Phase 4 behind a measurement in Phase 0, not assumed.

## Approvals

Four approval points, all authored as `approval` nodes in `record_change` flows on the
pattern `src/sales/flows/opportunity-approval.flow.ts` already sets — `lockRecord: true`,
`approvalStatusField`, `onEmptyApprovers: 'admin_rescue'`, a `not_required` guard so the
flow's own stamps never re-trigger it, and a stage guard so a settled record never re-enters.

| Record | Trigger | Standard chain | Approver kinds used |
| --- | --- | --- | --- |
| `crm_project` | `status` enters `in_approval` | (1) the project's business-unit manager; (2) `finance_controller` when `planned_revenue` ≥ a threshold in `_thresholds.ts` | `expression` after a `get_record` on `sys_business_unit` (its `manager_user_id`); `position` |
| `crm_project_budget` | `status` enters `in_approval` | (1) project manager (`field: approver` stamped from the project); (2) `finance_controller` when `total_cost` exceeds the baseline by the threshold | `field`; `position` |
| `crm_timesheet` | `status` enters `submitted` | project manager | `field: approver` |
| `crm_expense` | `status` enters `submitted` | (1) project manager; (2) `finance_controller` over a threshold | `field`; `position` |

Two tiers is the standard shape and mirrors the existing deal approval. REQ-0002's
five-step named chain (`成本中心负责人 → 事业部负责人 → Bizcase 审核岗 → 事业本部负责人 →
事业群运营负责人`) is that customer's org chart, not a product feature: it ships as an overlay
flow that replaces the standard one, using the same node types.

The approver vocabulary the pin offers — `user`, `org_membership_level`, `position`, `team`,
`department`, `field`, `manager`, `expression` (`role` and `queue` deprecated) — covers all
four rows without a custom resolver; `ApprovalNodeApproverSchema` in `@objectstack/spec`
is the authority, and Phase 1 re-reads it on the pin before the first flow is written.

## Cost control — a machine signal warns, a person's decision blocks

REQ-0002 asks that "when cost exceeds budget, time entry is restricted and a risk alert
fires". The product answer is split in two, because AGENTS.md rule 8 says interception
stands on a person's judgement:

1. **The signal is automatic.** `budget_status` is derived from `budget_consumed_percent`
   (`warning` at 80 %, `exceeded` at 100 %; both thresholds in `_thresholds.ts`). A
   `record_change` flow on `crm_project` notifies the project manager and the finance
   position when the status crosses each line, once per crossing, through the platform's
   `notify` node — inbox and email, like `opportunity_won_alert`.
2. **The block is a decision.** A timesheet or expense hook refuses a *submit* on a project
   whose `time_entry_locked` is `true` — a value a project manager or finance controller
   wrote down. The flow **proposes** the lock in its notification; it never sets it. There
   is no override flag beside it (rule 8: *do not build an override escape hatch*): unlocking
   is the same person clearing the same field.

Draft entries are never refused — a consultant who worked the hours records them; what the
lock stops is the *submission* that would turn them into cost.

## Permissions, positions, sharing

- **Positions** (app package, `src/sales/sharing/positions.ts`): `project_manager`,
  `project_director`, `pmo`, `finance_controller`. Approvals route to positions or stamped
  fields, never to named users.
- **Permission sets** (app package, `src/sales/profiles/`): three new sets — `project_manager`
  (full on the eight objects, read on `crm_account` / `crm_opportunity` / `crm_contract`),
  `project_member` (create/read own timesheets and expenses; read projects they are staffed
  on; read rate cards' `role_level` and `unit` but **not** `cost_rate` — field-level), and
  `finance_controller` (read everything, edit budgets and rate cards, approve). The existing
  `sales_rep` and `sales_manager` sets gain **read** on `crm_project` so a rep sees the
  delivery state of the deal they closed; `system_admin` gains full grants. All rows are
  added in the app package, per the ADR-0130 addendum.
- **Sharing**: `crm_project` is `private`; a sharing rule grants read to the members in
  `crm_project_member` and read-write to the row's `project_manager` — the same construct as
  `AccountTeamSharingRule`. Timesheets and expenses stay owner-private; the approver reaches
  them through the approval request, not through sharing. Rate cards are readable by every
  PSA role; their cost columns are hidden from `project_member` at the field level.
- Every `runAs: 'system'` flow pins its organization predicate (AGENTS.md rule 10); the only
  candidate is the budget-status sweep, and it is written as a `record_change` flow on the
  project row precisely so it needs no system scan at all.

## i18n, docs, analytics

- **Locales**: every object, field, option, view and navigation label lands in all four
  packs under `src/sales/translations/` in the same PR as the metadata (AGENTS.md, Constraint
  Checklist). The packs stay in the app package.
- **Product docs**: a new `content/docs/projects/` section — `index`, `projects`,
  `staffing-and-rates`, `budgets`, `time-and-expenses`, `cost-control` — English first,
  `.zh-Hans.mdx` and `.zh-Hant.mdx` beside each, under *Documentation discipline* (business
  concepts, never a field transcript; list-view names from the zh-CN pack; the standing
  zh-Hant sentence).
- **Analytics**: two datasets in the module — `project_financials` (baseline, actual,
  variance, margin by project / account / business unit / month) and `time_utilization`
  (approved hours by user / project / period, billable share) — and one dashboard,
  *Projects overview*, binding **only those two**. Cross-package dataset binding is the
  split plan's upstream ask 4 and is unmeasured; a project tile on the executive dashboard
  waits for that measurement.

## Mapping REQ-0002 onto the standard model

The spreadsheet's 26 project-side steps, grouped as the customer grouped them. **B** =
standard product (this design), **C** = customer overlay on top of it, **D** = declined or
deferred, with the reason.

| Spreadsheet steps | What was asked | Standard construct | Disposition |
| --- | --- | --- | --- |
| 15–16 售前立项 | A presales project must cite an approved CRM opportunity; basic info | `crm_project` with `kind = presales`, `crm_opportunity` required for `presales`; a hook refuses an opportunity whose `approval_status` ≠ `approved` (a run-time read — CEL cannot dot-walk a lookup) | B |
| 17 项目角色 | Account manager, PM, director, QA, pricing owner | `crm_project_member.role`; the customer's titles are picklist values | B, titles C |
| 18 成本与报价测算 | Labor / third-party service / hardware-software / expense estimate → quote and margin | `crm_project_budget` v1 + lines in four categories; margin is a formula | B |
| 19 信息安全类别 | Security category + notes | `security_classification` + `description` | B |
| 20 五级串行审批 | Cost-centre owner → BU head → Bizcase reviewer → division head → group ops | Standard two-tier approval; the named chain is an overlay flow | B core, chain C |
| 21–22 交付立项 | Must cite an approved presales project; basic info | `kind = delivery`, `source_project` required for `delivery`, hook refuses an unapproved source | B |
| 23 成本中心与核算主体 | Implementation and accounting cost centres, department | `business_unit` + `cost_center` → `sys_business_unit` (`kind: cost_center`) — platform objects, nothing authored | A (platform) |
| 24 角色与组织 | PM, director, pricing owner, subcontract TS writer, QA levels | `crm_project_member.role` | B, titles C |
| 25 信息安全 + 附件 | Security class, kick-off confirmation upload | `security_classification`, `enable.files` | B |
| 26 交付立项审批 | Approval then project starts | project approval flow; `approved → active` on approval | B |
| 27 预算基线导入 | Approved Bizcase total becomes the baseline | budget version 1, `is_baseline` on approval | B |
| 28–31 四类成本计划 | Labor by level × rate × hours × headcount per month; services; goods; expenses | `crm_project_budget_line` categories and `period` | B |
| 32 成本调整审批 | Top-up with reason and variance analysis | budget version *n* + `reason` + approval | B |
| 33 月度工时填报 | Monthly TS per project; leave/overtime auto-sync | `crm_timesheet` with a 31-day period; **HR sync is D** — an external HR system's data, out of scope until a connector instance exists (ADR-0097) | B; sync D |
| 34 工时审批 | PM approves, then counts as actual cost | timesheet approval; `actual_labor_cost` sums approved entries only | B |
| 35 差旅成本填报 | Per project, with receipts | `crm_expense` + attachment | B |
| 36 成本超支预警与管控 | Over budget → restrict time entry, raise alert | `budget_status` signal + `time_entry_locked` decision (see *Cost control*) | B, in the rule-8 shape |
| 37 项目综合查询 | Basics, budget, cost, progress, revenue, invoicing, collection | list views + `project_financials`; **invoicing and collection are D** by the 2026-08-02 ruling | B; invoicing D |
| 38 项目财务查询 | Contract value, total cost, margin, invoiced, collected | `crm_contract.contract_value` through the lookup; cost and margin on the project; invoiced/collected D | B; invoicing D |
| 39 成本跟踪 | Budget execution rate, baseline vs actual | `budget_consumed_percent`, `cost_variance`, dataset | B |
| 40 合同与订单查询 | Sales contracts, purchase contracts, orders | `crm_contract` exists (A); purchase contracts and orders are D under the same ruling | A; orders D |

The 14 CRM-side steps (1–14) are triaged in REQ-0002 itself and are **not** this design's
scope; they are enhancements to objects the sales module already owns and follow their own
records.

## The token budget — resolved by scoping the gate to `sales`

The finding that triggered the 2026-09-14 ruling, kept as measured.
`scripts/check-source-token-ratchet.mjs` at `c716a2c` reads the **whole tree**:

| Layer | Reading | Ceiling | Kind | Headroom |
| --- | ---: | ---: | --- | ---: |
| business semantics | 86,074 | 100,000 | ruled (2026-09-05, #1601) | 13,926 |
| interaction layer | 38,585 | 40,000 | anchored | 1,415 |

A conservative estimate for PSA v1 — eight objects with hooks, four approval flows, one
alert flow, a handful of actions — is **15–20k business-semantics tokens**, and its views,
two record pages and one dashboard **5–7k interaction tokens**. Against a whole-tree gate
neither fits, and the interaction layer does not fit by an order of magnitude.

The ruling dissolves the conflict instead of arbitrating it: **the gate measures the sales
module**, because that is the claim it exists to protect (ADR-0130 §1.3(b): *a CRM sales
module fits whole in an AI context window*). Consequences:

- The gate measures the `src/sales/` directory — the sales package, which is the app — in
  the same two layers, and prints a reading for every package directory. The layout PR makes
  that change and re-anchors both ceilings from the sales reading with the script's own
  `anchor()` rule, or carries a ruled number if the maintainer names one; the current
  whole-tree ceilings are retired with a worked row, not silently. The split plan's inventory
  puts the starting figure near 90k (`module-split-plan.md` item 8).
- PSA, like every package other than sales, is **outside the gate**. Its size is still a
  product fact worth knowing — a per-module budget is what ADR-0130 §4 promises — so the gate
  prints `src/psa/`'s reading on every run and each PSA phase records it in the PR body as
  the starting measurement for a budget the maintainer may rule on later. Nothing in this
  design competes with the sales claim for headroom.

  **⚠️ Superseded, 2026-09-16 (#1928), and in PSA's favour.** 「1928 门禁 改为 多 sales
  模块的门禁」: the budget §4 promises is now committed, so no package is outside the
  gate. `src/psa/` will carry its own `business semantics`, `interaction layer` and
  `authored total` ceiling like every other package, anchored from its own first reading
  with the script's own `anchor()` rule — a package's FIRST ceiling is an anchoring, not a
  raise, so it needs no ruling. The conclusion this bullet was drawing is unchanged and now
  structural rather than promised: PSA's ceilings are its own, so **nothing in this design
  competes with the sales claim for headroom**, and the 15–20k / 5–7k estimate above is
  weighed against PSA's own budget rather than against sales'. The gate refuses to run on a
  package with no committed ceiling, so phase 1 commits PSA's three rows in the PR that
  lands `src/psa/objects/`.
- Translations and seed data stay outside the gate by the 2026-08-17 ruling.

## Phasing

Each phase is one PR family: `pnpm verify` green, a changeset, product docs in three
languages for anything a user sees, and a browser pass on `pnpm dev` for anything a user
clicks, closed by an analysis report (maintainer, 2026-11-14). A phase does not open until the
previous one is on `main`. Re-phased 2026-11-15:

| Phase | Ships | Acceptance |
| --- | --- | --- |
| **0 — join the suite, measure** | `src/psa/` with its `index.ts` (manifest, `dependencies`) composed into the artifact; the 项目交付 app skeleton | `packages[]` gains exactly one entry after `app.objectstack.hotcrm`; existing objects register bit-identically (ADR-0130 D7); a disabled PSA module drops its app, menu, fields and pages; four measurements recorded in the PR body: a summary over a summary, a multi-currency summary, Gantt auto-shifting successor tasks, cross-package dataset binding. ⛔ A refusal gets an objectstack card, never a workaround |
| **1 — the standard v1** | the six v1 objects (2026-11-15 ruling 3); project, timesheet and expense approvals; actual cost and margin roll-ups; the overrun alert and lock; views, record pages, positions and permission-set rows, `tabPermissions`; seed; four locales; `content/docs/projects/` in three languages | A project moves `draft → in_approval → approved → active` through the console approval inbox; approved hours land in actual cost at the rate in force when entered; crossing the threshold notifies once and a submit on a locked project is refused with a message naming the lock; browser pass and report per role |
| **2 — budget, tasks and Gantt** | `crm_project_budget`, `crm_project_budget_line`, baseline and revision approval (the fourth approval point); tasks and the Gantt view | Version 2 approved supersedes version 1 as baseline; margin against baseline recomputes; Gantt behaviour as phase 0 measured |
| **3 — hand-offs and touchpoints** | the O2C hand-off for time-and-materials (approved billable amount → Order to Cash invoicing, connection decided then); project templates; case (工单) time; related lists on account and opportunity pages if phase 0 accepted the class | Defined by that phase's card |
| **4 — resources and capacity** | resource requests and capacity planning | Waits on the platform; its own design note |

The first draft's v2 candidates are placed by the table above (2026-11-15): work breakdown
(tasks, Gantt) in phase 2, project templates in phase 3, resource requests and capacity in
phase 4, and billing milestones in Order to Cash.

> **Note (2026-10-23).** The billing milestones are now designed — not here but in the
> order-to-cash module ([`order-to-cash-module-plan.md`](./order-to-cash-module-plan.md),
> REQ-0007), whose `crm_billing_milestone` a `fixed_fee` project reaches through its
> `crm_contract`. The same record reopens the 2026-08-02 ruling that rows 37, 38 and 40 of the
> mapping table above cite: invoice and collection status is that module's, never PSA's.

## Decisions needed from the maintainer before Phase 0 — ruled 2026-11-15

All closed. The first draft's token-gate and barrel questions were closed by the 2026-09-14
rulings. Its three remaining questions were ruled on 2026-11-15 (*Recorded 2026-11-15* above):
navigation → PSA's own app rather than a *Projects* group or items under *Sales*; v1 scope →
the standard tier, with budget versions, tasks and Gantt in phase 2 and billing milestones in
Order to Cash; one `crm_project` with `kind` (`presales` / `delivery` / `internal`).

## Upstream asks

None blocks v1. Two are already filed by `module-split-plan.md` and are re-cited, not
re-derived: the ACCEPT/REFUSE matrix over the page related-list class (ask 1), and
cross-package dataset binding (ask 4). One is cosmetic: the Studio package picker lists
only `type: app` packages today (ADR-0130 consequences row 6, an objectui card), so the
module's metadata is browsed under the artifact rather than under its own name until that
lands.

## References

- ADR-0130 — the release artifact is the co-ownership boundary (one artifact, N packages);
  its 2026-09-02 addendum on permission sets
- ADR-0019 D2 — the internal-contribution tier a `module` package belongs to
- ADR-0029 D7 — `navigationContributions` as the cross-package navigation channel
- ADR-0070 D2 — the writable verdict a booted package receives
- ADR-0072 D4 — lookups are not dot-walked in CEL; relationship checks are run-time reads
- ADR-0097 — declarative connector instances (the shape an HR sync would take)
- [`module-split-plan.md`](./module-split-plan.md) — rules R1–R4, the assignment rule, the
  2026-09-02 decisions, the upstream asks
- [`../requirements/0002-it-services-project-delivery-and-cost.md`](../requirements/0002-it-services-project-delivery-and-cost.md) — the intake this design validates against
- `src/sales/flows/opportunity-approval.flow.ts` — the approval pattern every PSA approval copies
- `src/sales/flows/billing-handoff-closed-won.flow.ts` and
  `src/revenue/flows/billing-handoff-contract-activated.flow.ts` — the two halves of the hand-off;
  the first carries the 2026-08-02 revenue-scope ruling and the outbox pattern in its header
