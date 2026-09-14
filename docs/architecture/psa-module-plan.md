# HotCRM PSA module — a standard-product design, and the first ADR-0130 module cut

> **Status**: design only. Nothing in `src/` moves on the strength of this document; every
> phase below lands through its own PR, `pnpm verify` and changeset.
> **Measured against**: `origin/main` at `c716a2c`, `@objectstack/*` **17.4.0** (the pin).
> **Companions**: [`module-split-plan.md`](./module-split-plan.md) — the inventory, the
> four measured edge rules (R1–R4) and the maintainer decisions of 2026-09-02 that this
> design applies without re-deciding; [`../requirements/0002-it-services-project-delivery-and-cost.md`](../requirements/0002-it-services-project-delivery-and-cost.md)
> — the customer intake that triggered it.
> **Upstream**: ADR-0130 (*the release artifact is the co-ownership boundary — one artifact,
> N packages*), [objectstack#14122](https://github.com/objectstack-ai/objectstack/issues/14122) (epic).

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
| HotCRM owns lead → contract and models **no orders, invoices or payments** (2026-08-02, recorded in `src/flows/billing-handoff.flow.ts`) | PSA tracks **cost and billable effort**, never invoicing or collection. What billing needs — approved billable hours and expenses per project — leaves through the same durable-outbox hand-off pattern the contract flow already uses. |
| HotCRM is a **pure metadata application**; platform capability is built in objectstack (AGENTS.md, Scope) | Approvals are `approval` flow nodes, the org dimension is `sys_business_unit`, attachments are `enable.files`, people are `sys_user`. PSA declares no infrastructure. |
| Permission sets stay **whole in the `type: app` package** (ADR-0130 addendum, 2026-09-02, objectstack#14487) | PSA ships no permission set of its own. Its object grants are rows added to the app package's sets; new roles are new sets there. |

## Why PSA is the first module cut

[`module-split-plan.md`](./module-split-plan.md) nominated `cpq` as the first *extraction*
because it is a leaf. PSA is better than a leaf: it is **new**. It moves no file, converts no
navigation node, relocates no hook and touches none of the six unmeasured item classes on
day one. Landing it as `app.objectstack.hotcrm.psa` proves the composition, compile, load
and registration path in this repository end to end — exactly what every later extraction
needs proven — while shipping a product capability instead of a refactor.

The split plan listed three upstream blockers. Two of them are now **in the pin**; the third
does not gate a module booted from an artifact:

| Blocker as listed on 2026-09-02 | Where it landed | In 17.4.0? |
| --- | --- | --- |
| Compile path — `os build` emitting `packages[]` ([objectstack#14439](https://github.com/objectstack-ai/objectstack/issues/14439)) | `@objectstack/cli` 17.3.0 (`7085f90`), `@objectstack/spec` 17.3.0 (`2e3e8c7`, `manifest: 'preserve'`) | ✅ |
| Per-package registration at load — every object has one owner across every door ([objectstack#14599](https://github.com/objectstack-ai/objectstack/issues/14599)) | `@objectstack/core` 17.3.0 (`655b106`); `@objectstack/runtime` 17.4.0 (`f1a1028`, collections read from `packages[]`) | ✅ |
| Studio's writable verdict ([objectstack#14430](https://github.com/objectstack-ai/objectstack/issues/14430)) | Studio surface | Not needed: a module booted from an artifact is served `writable: false` like the app package is today (ADR-0070 D2). |

Phase 0 below is the measurement that turns this table from a changelog reading into a
fact about this repository. Merged upstream is not the same as proven in the pin
(AGENTS.md, *Platform Upgrades*), and no later phase opens until Phase 0 is green.

## Package shape

One new package, composed into the artifact HotCRM already ships:

| | Value | Why |
| --- | --- | --- |
| Package id | `app.objectstack.hotcrm.psa` | The id convention `module-split-plan.md` reserved for every module. |
| `type` | `module` | ADR-0019 D2's internal-contribution tier: shipped inside the App, never installed alone. |
| `namespace` | `crm` | ADR-0130 D1 co-ownership, so objects are `crm_project` and not `psa_project` — the same prefix rule as every other object here (AGENTS.md, Tech Stack rule 2). |
| `dependencies` | `{ 'app.objectstack.hotcrm': '^3.0.0' }` | The topological edge that registers the app package first (ADR-0130 D5). The array order in `composeStacks` decides nothing. |
| `navigationContributions` | one entry into a group the app publishes | R2 — the only way a module reaches the menu (see *Navigation*). |
| Version | the artifact's | ADR-0130 D6: one artifact, one version, no per-module hot-fix. |

**Source layout — the flat tree, per the 2026-09-02 ruling (item 2).** PSA files live in
the same `src/{type}/` directories as everything else: `src/objects/project.object.ts`,
`src/flows/project-approval.flow.ts`, `src/views/project.view.ts`, and so on. Module
membership is decided by **which barrel imports the file**, not by a directory: each
metadata type gains a second barrel next to its `index.ts` that re-exports only the module's
share (the file name is decision 2 below), and `objectstack.config.ts` becomes two
`defineStack` calls composed with `composeStacks([psaStack, crmStack], { manifest: 'preserve' })`.
AGENTS.md's prohibition on `packages/<x>/src/` paths is therefore **not** touched, and every
guard test that globs `src/{type}/*` covers PSA metadata from the first file — i18n
coverage, object docs coverage, view references, validation-predicate totality — with no
new guard written (AGENTS.md, Scope rule 3).

**What stays in the app package** (from the split plan's assignment rule, unchanged):
the app and its navigation groups, the six existing permission sets plus any new role,
`src/sharing/positions.ts`, the four locale packs, `src/docs/`, and the shared TypeScript
sources (`_hook-api.ts`, `_picklists.ts`, …). PSA imports those shared sources; it never
copies them. **One copy of each shared file is an acceptance criterion** of every PSA PR,
for the same token reason the split plan gives.

**Navigation.** The app package publishes one new group node (`group_projects`, label
*Projects*) in `src/apps/crm.app.ts` with no children of its own; the module contributes its
items into it. Two facts from `module-split-plan.md` are re-stated because they bite here:
`navigationContributions[].app` is the app's bare `name` (`crm_enterprise`), not the dotted
manifest id; and a `group` id that names no group the app declares is **relocated to the
top level with a warning, not refused** (spec docblock, objectstack#14925). Phase 0's
acceptance therefore includes reading the boot log for `nav_contribution_group_missing`.

## The data model — v1

Eight objects. The rule for what made the cut: **a thing is an object in v1 if the standard
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
| **R2** `navigationContributions` into the app | one contribution into `group_projects` | ✅ ACCEPTED |
| **R3** a module's own app navigating to a foreign object | none — the module declares no app | n/a |
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
pattern `src/flows/opportunity-approval.flow.ts` already sets — `lockRecord: true`,
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

- **Positions** (app package, `src/sharing/positions.ts`): `project_manager`,
  `project_director`, `pmo`, `finance_controller`. Approvals route to positions or stamped
  fields, never to named users.
- **Permission sets** (app package, `src/profiles/`): three new sets — `project_manager`
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
  packs under `src/translations/` in the same PR as the metadata (AGENTS.md, Constraint
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

## The token budget — the one number that decides whether this ships

`scripts/check-source-token-ratchet.mjs` at `c716a2c` reads:

| Layer | Reading | Ceiling | Kind | Headroom |
| --- | ---: | ---: | --- | ---: |
| business semantics | 86,074 | 100,000 | ruled (2026-09-05, #1601) | 13,926 |
| interaction layer | 38,585 | 40,000 | anchored | 1,415 |

A conservative estimate for PSA v1 — eight objects with hooks, four approval flows, one
alert flow, a handful of actions — is **15–20k business-semantics tokens**, and its views,
two record pages and one dashboard **5–7k interaction tokens**. Neither fits, and the
interaction layer does not fit by an order of magnitude.

Manifests are free (the gate walks `src/` only; `objectstack.config.ts` and the module
manifest sit at the root), and translations and seed data are outside the gate by ruling.
The metadata itself is not free, and there are exactly two honest answers:

1. **Partition the ratchet by package** — the per-module budget ADR-0130 §4 promises.
   The gate learns which barrel a file belongs to (the same file → module mapping
   `module-split-inventory.json` already records), keeps the app package's two ceilings
   **exactly where they are**, and gives `app.objectstack.hotcrm.psa` its own ruled
   ceilings. The headline claim — *the CRM fits in one context window* — stays measured on
   the CRM. **Recommended.**
2. **Raise the two ceilings** to admit PSA into the same budget. Honest, but it retires the
   CRM claim the gate exists to protect, and it means the next module competes with sales
   for headroom again.

Either is a maintainer ruling quoted in the PR that changes the gate (the script's own
rule); neither is an agent's call. **Phase 0 cannot open without it** — this is decision 1.

## Phasing

Each phase is one PR family: `pnpm verify` green, a changeset, product docs in three
languages for anything a user sees, and a browser pass on `pnpm dev` for anything a user
clicks (the internal dogfood process). A phase does not open until the previous one is on
`main`.

| Phase | Ships | Acceptance |
| --- | --- | --- |
| **0 — pipeline proof** | The composition: `objectstack.config.ts` as two `defineStack` calls under `composeStacks(…, { manifest: 'preserve' })`; the empty `psa` module with its manifest, `dependencies` and one `navigationContributions` entry; the `group_projects` node in the app; the ratchet change decision 1 rules; the second barrel per type (empty) | `pnpm build` emits `dist/objectstack.json` with `packages[]` of exactly two entries, `app.objectstack.hotcrm` first in topological order; `pnpm dev` boots and `GET /api/v1/packages` lists both rows with `writable: false`; the boot log carries no `nav_contribution_group_missing`; the artifact registers bit-identically to today's for every existing object (ADR-0130 D7 — same FQNs, same owners); `pnpm verify` green; a measurement of the related-list class (a throw-away page binding `crm_project` from the app package) recorded in the PR body, then reverted |
| **1 — project core** | `crm_project`, `crm_project_member`, `crm_rate_card`; the project approval flow; list views, a project record page; positions and permission-set rows; seed rows; locales; `content/docs/projects/` index + `projects` + `staffing-and-rates` | A project moves `draft → in_approval → approved → active` through the Console with the approval inbox; the presales/delivery provenance gates refuse an unapproved source; every object has its docs page and four labels (existing guards go green, none added) |
| **2 — budget** | `crm_project_budget`, `crm_project_budget_line`; baseline and revision approval; `baseline_cost` and margin formulas on the project; `budgets` doc | Version 1 approved sets `is_baseline`; version 2 approved moves it and supersedes version 1; `gross_margin` recomputes; a `labor` line without a rate card is refused at submit, not at draft |
| **3 — time and expense** | `crm_timesheet`, `crm_time_entry`, `crm_expense`; their approvals; the cost-copy hook; the actual-cost summaries; `budget_status` + alert flow; `time_entry_locked` guard; `time-and-expenses` and `cost-control` docs | Approved hours appear in `actual_labor_cost` at the rate in force when entered; a later rate-card change leaves them unchanged; crossing 80 % notifies once; a submit on a locked project is refused with a message naming the lock; drafts are never refused |
| **4 — analytics and CRM touchpoints** | `project_financials`, `time_utilization`, the *Projects overview* dashboard; the related lists on account and opportunity pages **if** Phase 0's measurement accepted the class; the billing hand-off extension (approved billable hours and expenses on the contract-activated payload) | Both datasets answer `POST /api/v1/analytics/dataset/query` with rows; the dashboard draws (DOM probe, not a screenshot); the outbox delivery carries the new fields |

v2 candidates, each its own design note when its turn comes: work breakdown (tasks and
milestones with planned-vs-actual hours), resource requests and capacity, billing
milestones for `fixed_fee` projects, and a project template to seed members and budget lines.

## Decisions needed from the maintainer before Phase 0

1. **The token gate**: partition per package (recommended) or raise the ceilings. Quoted in
   the Phase 0 PR either way.
2. **The second barrel's file name** per `src/{type}/` — `index.psa.ts` (reads as "the PSA
   index", sorts beside `index.ts`) is proposed; the alternative is a `psa.ts` re-export
   file. Whatever is chosen becomes the convention every later module follows.
3. **The navigation group**: a new top-level *Projects* group (proposed) versus placing the
   items under the existing *Sales* group.
4. **v1 scope**: confirm that work breakdown, resource requests and billing milestones are
   v2 — the "margin is computable without it" rule above.
5. **One `crm_project` with a `kind`** (proposed) versus separate presales-estimate and
   delivery-project objects. The single object keeps one timesheet target, one member
   object and one budget object; two objects would triple those.

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
- `src/flows/opportunity-approval.flow.ts` — the approval pattern every PSA approval copies
- `src/flows/billing-handoff.flow.ts` — the 2026-08-02 revenue-scope ruling and the outbox pattern
