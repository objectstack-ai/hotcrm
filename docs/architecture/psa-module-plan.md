# HotCRM PSA module — Project Delivery, as built and as ruled

> **Status**: phases 0–2 shipped; phase 3 ruled, not built (see *Phasing*). This file states what
> `src/psa/` is on `main` and what is ruled for it; every statement names the source it was read
> from. Where this file and `src/` disagree, `src/` is right and this file is the bug.
> **Measured against**: `main` at `ac17670a` (2026-11-19), `@objectstack/*` **18.6.0** — the pin in
> `package.json`, held by `engines.protocol: '^18.6.0'` in `src/psa/index.ts`. Readings that name
> 17.x come from the first draft (`main` at `c716a2c`, pin 17.4.0) and are kept under *History* as
> history; they are not claims about the current pin.
> **Companions**: [`module-split-plan.md`](./module-split-plan.md) — the edge rules R1–R4 and the
> numbered decisions (items 10, 16–20 bear on PSA); [`expense-module-plan.md`](./expense-module-plan.md)
> — the expense module PSA depends on; [`order-to-cash-module-plan.md`](./order-to-cash-module-plan.md)
> — the module phase 3 will depend on; [`../requirements/0002-it-services-project-delivery-and-cost.md`](../requirements/0002-it-services-project-delivery-and-cost.md)
> — the customer intake that triggered PSA.
> **Upstream**: ADR-0130 (*the release artifact is the co-ownership boundary — one artifact,
> N packages*), [objectstack#14122](https://github.com/objectstack-ai/objectstack/issues/14122) (epic).

## Recorded 2026-11-15 — PSA restarts, six rulings

The maintainer ruled all six questions of the restart evaluation on 2026-11-15 (03:48–03:49Z,
option A each; evaluation report `claude.ai/artifact/X8BPYw9KW45x4k6iBSZ6Zu`). They were first
written down in [hotcrm#2467](https://github.com/objectstack-ai/hotcrm/pull/2467), which closed
unmerged; this section is now their record. `src/psa/index.ts`, `src/psa/apps/psa.app.ts` and
`test/psa-module-package.test.ts` cite it by name.

1. **Shape.** PSA is a suite module, `src/psa/`, `type: 'module'`, with **its own app, 项目交付
   (*Project Delivery*)** — `crm_psa` in `src/psa/apps/psa.app.ts`, the same shape as Order to
   Cash's app. This replaced the first draft's `group_projects` node in the Sales app. The ruling
   named the app package as the only dependency; the expense edge was added on 2026-11-16 (below).
2. **Restart.** hotcrm#2316 left `pm:on-hold` and was queued after hotcrm#2465. #2316 is closed.
3. **v1 is the standard tier**: project, staffing, rate card, timesheet and its entries, expense;
   project, timesheet and expense approvals; actual cost and margin roll-ups; the overrun alert and
   lock. Budget versions, tasks and Gantt moved to phase 2.
4. **Time-and-materials invoicing stays in Order to Cash.** PSA produces the approved amount to
   bill (`crm_project.billable_amount`, `src/psa/objects/project.object.ts`); invoicing is Order to
   Cash's. How the two connect was left to phase 3, and ruled on 2026-11-17 (below).
5. **The rate card holds both cost and bill price** — `cost_rate` and `bill_rate` on
   `crm_rate_card` (`src/psa/objects/rate_card.object.ts`), with no dependency on the revenue
   module's price books.
6. **One `crm_project` with `kind`** = `presales` / `delivery` / `internal`
   (`PROJECT_KIND_OPTIONS`, `src/psa/objects/_psa-picklists.ts`).

## Rulings since — what changed the shape

| When | Ruling | Where it shows in `src/` |
| --- | --- | --- |
| 2026-11-15 | Ruling D on hotcrm#2316: a project team member reads accounts, not opportunities, and no cost | `src/sales/profiles/project-member.profile.ts` |
| 2026-11-16 22:54Z–23:01Z | Expense is its own package and app; PSA depends on it — the one add-on → add-on edge (`module-split-plan.md` item 18; [hotcrm#2556](https://github.com/objectstack-ai/hotcrm/issues/2556)) | `dependencies` in `src/psa/index.ts`; `src/expense/` |
| 2026-11-16 | Phase 2a–2c scope (tasks and Gantt; the weekly timesheet; budget versions), ruled after the PSA comparison | hotcrm#2545, #2546, #2547 |
| 2026-11-17 03:27Z | 「先放报销包,修好后搬回」: the project-path approvals sit in the expense package until objectstack#34616 ships, then move back ([hotcrm#2575](https://github.com/objectstack-ai/hotcrm/issues/2575)) | done: moved back by PR [#2678](https://github.com/objectstack-ai/hotcrm/pull/2678) (2026-11-19); now `src/psa/flows/` (see *Approvals*) |
| 2026-11-17 14:43Z | 「依赖订单与回款」: phase 3 bills time and expenses through Order to Cash, and PSA will depend on it; after the probe ([hotcrm#2618](https://github.com/objectstack-ai/hotcrm/issues/2618)), 「立开发卡」 at 16:11Z | not built — see *Phase 3* |
| 2026-11-18 | Option C on hotcrm#2570: timesheet and expense approval needs the deployment's approvals; no second path without them | `test/psa-approvals-composition.test.ts` (header); `src/psa/docs/crm_psa_approvals_budget.md` |

## Premise — a standard module, not one customer's spreadsheet

Maintainer ruling, 2026-09-14, verbatim and untranslated:

> 「hotcrm 是标准模版，如果开发 psa 也是应该按标准产品的方向设计，不应该受限于这个 excel」

PSA is Professional Services Automation as a standard product ships it: the seam between winning
work (lead → contract, which HotCRM owns) and delivering it profitably — projects, the people
staffed on them, their rates, the budget, the time and expenses consumed, and the margin.
REQ-0002 is a validation scenario, mapped at the end of this file; where the spreadsheet and the
standard shape disagree, the standard shape wins and the difference is a customer overlay.

Standing rulings that bound it:

| Ruling | Consequence for PSA, as built |
| --- | --- |
| HotCRM models no invoices or payments in the CRM (2026-08-02, `src/sales/flows/billing-handoff-closed-won.flow.ts`), reopened only for the Order to Cash module (2026-10-23, `order-to-cash-module-plan.md`) | PSA counts cost and the amount to bill; it never invoices (ruling 4). |
| HotCRM is a pure metadata application (AGENTS.md, Scope) | Approvals are `approval` flow nodes, people are `sys_user`, attachments are `enable.files`. PSA declares no infrastructure. |
| Permission sets stay whole in the `type: app` package (ADR-0130 addendum, 2026-09-02) | PSA ships no permission set; its grants are rows in `src/sales/profiles/` (see *Permissions, positions, sharing*). |

## Package shape — as built

Read from the manifest in `src/psa/index.ts`:

| | Value |
| --- | --- |
| Package id | `app.objectstack.hotcrm.psa`, name *HotCRM Project Delivery* |
| `type` | `module` — shipped inside the one HotCRM artifact, switched on or off per tenant by the platform's package disable |
| `namespace` | `crm` (ADR-0130 D1), so objects are `crm_project`, not `psa_project`; `module-split-plan.md` item 16 keeps it |
| `version` | the artifact's, `6.5.0` (ADR-0130 D6) |
| `engines.protocol` | the range every package manifest of the artifact declares: `^19.0.0-next.2` at this writing (`^18.6.0` when this plan was written) |
| `dependencies` | `{ 'app.objectstack.hotcrm': '^6.5.0', 'app.objectstack.hotcrm.expense': '^6.5.0' }` — **no Order to Cash** today |
| `requires` | `automation`, `triggers`, `approvals`, `sharing`, `analytics` |
| `apps` | `crm_psa`, *Project Delivery* (`src/psa/apps/psa.app.ts`) |
| `objectExtensions` | the Project field on `crm_expense`, `crm_expense_report` and `crm_expense_request` (`src/psa/extensions/expense-project.extension.ts`) |

**Expenses are their own package** since hotcrm#2556 (PR [#2577](https://github.com/objectstack-ai/hotcrm/pull/2577),
2026-11-17): `crm_expense` lives in `src/expense/objects/expense.object.ts`, owned by
`app.objectstack.hotcrm.expense`, whose only dependency is the app package (`src/expense/index.ts`).
The expense package knows no project of its own; PSA contributes the optional Project field
through `objectExtensions` and keeps the expense cost summaries on `crm_project`. With PSA
disabled the field leaves the expense; with expense disabled projects still work
(`module-split-plan.md` item 18; `expense-module-plan.md`, *Measured on 2026-11-16*).

**Composition.** `objectstack.composition.ts` builds the stack as `psaStack` and lists it last in
`moduleStacks`, after `o2cStack` and `expenseStack`; it joins the artifact-wide `allHooks`,
`allFlows` and `CrmSharingRules` through `psaHooks`, `psaFlows` and `psaSharingRules`
(`src/psa/index.ts`).

**Source layout.** `src/psa/` with an `index.ts` and its typed subdirectories: `objects/` (each
`*.hook.ts` beside its `*.object.ts`, registered in `objects/hooks.ts`), `views/`, `pages/`,
`flows/`, `actions/`, `extensions/`, `sharing/`, `datasets/`, `dashboards/`, `apps/`, `books/`,
`docs/`, `email-templates/`, `translations/`, `data/`. PSA imports source only from its own
directory and from `src/sales/` (`_hook-api.ts`, the app's icon).

**Navigation — PSA's own app.** `crm_psa` declares its groups itself: *Projects*
(`group_projects` — inside PSA's app, not the Sales app), *Time and Expenses*, *Rates*, *My Work*
and *Help*, plus the anchor group *Customers and Contracts*. The app package fills the anchors
through `navigationContributions` (`app: 'crm_psa'` in `src/sales/index.ts`: Accounts,
Opportunities, Contracts; My Tasks), and the expense module contributes My Expenses, Reports to
Approve and My Travel Requests into *Time and Expenses* (`src/expense/index.ts`). Who is offered
the app is `tabPermissions` in the app package's sets: the three delivery sets and the sales manager see it; reps, service, marketing
and receivables hide it (`src/psa/apps/psa.app.ts`, header).

> **Superseded (2026-11-15, ruling 1).** The first draft planned a `group_projects` node in
> `src/sales/apps/crm.app.ts` filled by one R2 `navigationContributions` entry from PSA, and a
> phase-0 check for `nav_contribution_group_missing`. PSA declares its own app instead and
> contributes nothing to the Sales app.

## The data model — v1

The heading keeps its name because `src/psa/objects/project.object.ts` cites it. Eight objects
in `src/psa/objects/` today — ruling 3's v1 standard tier plus the two phase-2 additions; the
expense left for its own package.

| Object | File | Role | Parent / key references | `sharingModel` |
| --- | --- | --- | --- | --- |
| `crm_project` | `project.object.ts` | The engagement: plan, money, team | lookups `crm_account`, `crm_opportunity`, `crm_contract`, `crm_sales_order`, `source_project` (self); `project_manager`, `team_members` → `sys_user` | `private` |
| `crm_project_member` | `project_member.object.ts` | Who is staffed, with what responsibility, at what rate | masterDetail `crm_project`; `person` → `sys_user`; lookup `crm_rate_card` | `controlled_by_parent` |
| `crm_rate_card` | `rate_card.object.ts` | A seniority's cost rate and bill rate, effective-dated | — | `public_read` |
| `crm_timesheet` | `timesheet.object.ts` | One person's hours on one project for one period | lookup `crm_project`; `approver` → `sys_user` | `private` |
| `crm_time_entry` | `time_entry.object.ts` | One line of hours, with its copied rates | masterDetail `crm_timesheet`; lookups `crm_project`, `crm_project_task` | `controlled_by_parent` |
| `crm_project_task` | `project_task.object.ts` | Work breakdown, milestones, Gantt (phase 2a) | masterDetail `crm_project`; `parent_task`, `predecessors` (self); `task_owner` → `sys_user` | `controlled_by_parent` |
| `crm_project_budget` | `project_budget.object.ts` | One version of the budget (phase 2c) | masterDetail `crm_project` | `controlled_by_parent` |
| `crm_project_budget_line` | `project_budget_line.object.ts` | A budget line | masterDetail `crm_project_budget`; lookup `crm_rate_card` | `controlled_by_parent` |

`crm_expense` is not here: it is the expense module's (*Package shape*). Every option list lives
once in `src/psa/objects/_psa-picklists.ts` (*Picklists*, cited by that file); thresholds in
`src/psa/objects/_thresholds.ts`.

### `crm_project`

Read from `src/psa/objects/project.object.ts` and `project.hook.ts`.

- **Identity**: `project_number` (autonumber), `name`, `kind` (`presales` · `delivery` ·
  `internal`), `billing_type` (`fixed_fee` · `time_and_materials` · `retainer` · `non_billable`),
  `status`, `description`.
- **Provenance**: `crm_account`, `crm_opportunity`, `crm_contract`, `crm_sales_order` (the order
  the project delivers, PR [#2585](https://github.com/objectstack-ai/hotcrm/pull/2585) for
  hotcrm#2561; `crm_sales_order` is the app package's, `src/sales/objects/sales_order.object.ts`),
  and `source_project` (*Won From*: the presales project a delivery one was won from). No hook
  gates provenance: an unapproved opportunity or source project is not refused.
- **Plan**: `planned_start`, `planned_end`, `actual_start`, `actual_end`, `planned_revenue`, and
  `percent_complete`, computed from the leaf tasks weighted by planned hours (`project_task.hook.ts`).
- **Lifecycle**: `project_status_progression`, a `state_machine` validation: `draft → in_approval
  → approved → active ⇄ on_hold`, `active → completed → closed` (`completed` may return to
  `active`), `rejected → draft`, and `cancelled` from any open state. `project_status_guard`
  (`project.hook.ts`) leaves Approved and Rejected to the initiation approval; administrators
  are exempt, to repair a project whose approval cannot run.
- **Money** — every figure a summary or a formula, never typed: `approved_budget` (summary over
  the baseline version's `total_cost`), `actual_labor_cost` (over approved timesheets'
  `total_cost`), `actual_expense_cost` (over approved `crm_expense.amount`), `billable_labor_amount`
  and `billable_expense_amount`, `billable_amount` (*Approved to Bill*), `actual_cost`,
  `cost_variance`, `budget_consumed_percent`, `gross_margin`, `gross_margin_percent`. Amounts are
  in the organization's currency; multi-currency is not started (`module-split-plan.md` item 19).
- **Control**: `budget_status` (`on_track` · `warning` · `exceeded`), a machine signal kept by
  `project_budget_status`; `time_entry_locked` (*Lock Time and Expenses*), a person's decision.
  See *Cost control*.
- **Team**: `project_manager` and `team_members`, both read-only, kept by `project_team_sync`
  (`project_member.hook.ts`) from the staffing rows. **Since PR [#2674](https://github.com/objectstack-ai/hotcrm/pull/2674)
  (2026-11-19) `team_members` includes the project manager**: on 18.6.0 two sharing rules naming
  one user on one record each keep their own grant and the wider wins (objectstack#33683), so a
  non-owner manager in the team keeps edit.
- Attachments: `enable.files`. Layout derived from `fieldGroups` (`identity`, `provenance`,
  `plan`, `financials`, `team`).

### `crm_project_member`

`src/psa/objects/project_member.object.ts`: `person` (→ `sys_user`), `person_name`,
`responsibility` (`project_manager` · `project_director` · `account_manager` · `architect` ·
`consultant` · `quality_assurance` · `finance_partner` · `subcontractor`), `rate_card`,
`allocation_percent`, `start_date`, `end_date`, `is_billable`. A validation refuses an end before
the start; `project_member_unique` keeps one row per person per project; `person_name` follows a
renamed user (`project_member_person_rename`, `src/psa/flows/project-member-person-rename.flow.ts`).

### `crm_rate_card`

`src/psa/objects/rate_card.object.ts`: `name`, `seniority` (`junior` · `intermediate` · `senior`
· `lead` · `principal`), `unit` (`hour` · `day`), `cost_rate`, `bill_rate`, `is_internal`,
`effective_from`, `effective_to`. `rate_card_bill_not_below_cost` keeps the bill rate at or above
the cost rate unless the card is internal. No business-unit scope.

### `crm_timesheet` and `crm_time_entry`

- **Timesheet** (`timesheet.object.ts`, `timesheet.hook.ts`): owner, `name` (generated from the
  project and period unless typed, PR #2630), `crm_project`, `period_start`, `period_end`
  (31 days at most), `status` (`draft` · `submitted` · `approved` · `rejected`), `approver`
  (stamped with the project's manager when the sheet is created), `total_hours`,
  `billable_hours`, `total_cost`, `total_bill_amount`. **One timesheet per person, project and
  period start**, approved by the project manager — the phase-2b ruling (hotcrm#2546). A locked
  project takes no submission; a Closed or Cancelled project takes no new time (PR #2500).
- **Entry** (`time_entry.object.ts`, `time_entry.hook.ts`): `entry_date`, `crm_project`,
  `crm_project_task` (optional, summed into the task's `actual_hours`), `hours`, `is_billable`,
  `notes`, and `cost_rate`, `cost_amount`, `bill_rate`, `bill_amount`. **The rates are copied
  once**, from the person's staffing rate card when the entry is written (a day rate counts as
  `HOURS_PER_DAY` = 8 hours), so a later rate change never rewrites past cost. A person not
  staffed on the project cannot book to it. A submitted or approved sheet's entries do not change.
- **The week** (phase 2b, PR #2552): a line entered with its project and date finds the person's
  timesheet whose period holds the date, or creates a Monday-to-Sunday draft; a week across three
  projects makes three timesheets, each approved by its own project manager. *My Week* lists the
  lines; *Submit This Week* (`submit_timesheet`, `src/psa/actions/timesheet.actions.ts`) submits
  them.

### `crm_project_task`

Phase 2a (PR #2549), `src/psa/objects/project_task.object.ts`: `name`, `parent_task` (a tree),
`predecessors`, `task_owner`, `status`, `is_milestone`, `planned_start`, `planned_end`,
`planned_hours`, `percent_complete`, `actual_hours` (summary over time entries). The
`project_plan` view (`src/psa/views/project_task.view.ts`) draws every task the reader may see on
a Gantt, with a quick filter by project; the project record page is the platform default and draws
no Gantt (its authored page was deleted by #2740). The console's auto-schedule shifts
successors; nothing cascades on the server (phase-0 reading P3, accepted for 2a).

### `crm_project_budget` and `crm_project_budget_line`

Phase 2c (PR #2554), `src/psa/objects/project_budget.object.ts` and `project_budget_line.object.ts`.

- **Version**: `version` (stamped 1, 2, 3…), `status` (`draft` · `in_approval` · `approved` ·
  `rejected` · `superseded`), `is_baseline`, `with_initiation`, `reason` (required to send
  version 2 and later), `total_cost`, `labor_cost`, `labor_hours`, `notes`. One open version per
  project. Exactly one approved version is the baseline; approving a later one supersedes it
  (`project_budget_baseline`), and `crm_project.approved_budget` follows.
- **Line**: `category` (`labor` · `subcontract_service` · `third_party_goods` · `expense` ·
  `other`), `description`, `period`, `rate_card`, `hours`, `quantity`, `unit_cost`, `amount`
  (stored by `project_budget_line_amount`, since a formula cannot be summed; a labor line's unit
  cost defaults from its rate card).
- **Approval**: version 1 rides on the project's initiation approval (`project_budget_follow`,
  seat ruling A, 2026-11-16); a top-up has its own (*Approvals*). Projects saved before phase 2c
  keep their figure through `scripts/backfill-project-budget-baseline.ts`.

## Cross-package edges, judged by the four measured rules

| Rule | PSA edges as built | Verdict |
| --- | --- | --- |
| **R1** lookup / masterDetail into another package's object | `crm_project` → `crm_account`, `crm_opportunity`, `crm_contract`, `crm_sales_order` (app package); people → `sys_user` | ✅ accepted |
| **R2** `navigationContributions` into another package's app | none from PSA; the app package and the expense module contribute **into** `crm_psa` | ✅ accepted |
| **R3** an app's own navigation naming another package's object | none: PSA's app names only PSA objects; the rest arrive by contribution | ✅ held |
| **R4** a hook on another package's object | none: every PSA hook attaches to a PSA object (`psaHooks`, `src/psa/index.ts`) | ✅ held |
| Field extension on a dependency's object | the Project field on `crm_expense`, `crm_expense_report`, `crm_expense_request` | ✅ accepted (`module-split-plan.md` item 20) |

Analytics bind downward only: PSA's dashboard reads PSA's own datasets; an upward or sideways
binding answers 409 outside-closure (phase-0 reading P4, ADR-0150 D3).

## Approvals — as built

Every approval is an `approval` node in a record-change flow under `src/psa/flows/`, `runAs:
'system'`, `lockRecord`, with `admin_rescue` for an empty bench. They **need the deployment's
`approvals` capability**: without it a submission saves as Submitted, the flow fails at its
approval node and nobody is asked; an administrator decides by setting the status (ruling C on
hotcrm#2570; pinned on both compositions by `test/psa-approvals-composition.test.ts`, PR
[#2673](https://github.com/objectstack-ai/hotcrm/pull/2673), 2026-11-19).

| Record | Flow | Chain |
| --- | --- | --- |
| `crm_project` | `project_initiation_approval` (`project-initiation-approval.flow.ts`) | any Project Director or PMO; then a Finance Controller when the budget riding along (or the Approved Budget) is `PROJECT_FINANCE_REVIEW_BUDGET` (100,000) or more |
| `crm_project_budget` (top-up) | `project_budget_approval` (`project-budget-approval.flow.ts`) | a Project Director or the PMO; then a Finance Controller when it raises the baseline by `BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT` (10 %) or more |
| `crm_timesheet` | `timesheet_approval` and `timesheet_approval_on_create` (`submission-approval.flow.ts`) | the stamped `approver`, the project manager |
| `crm_expense_report` on a project | `expense_report_project_approval` (`expense-report-project-approval.flow.ts`) | the project's manager; then a Finance Controller from `EXPENSE_FINANCE_REVIEW_AMOUNT` (2,000, `src/sales/objects/_thresholds.ts`) |
| `crm_expense_request` on a project | `expense_request_project_approval` and its `_on_create` twin (`expense-request-project-approval.flow.ts`) | the project's manager |

The first draft named a business-unit manager as the project's first approver; HotCRM has no
business unit, so the first tier is the delivery leadership's two positions (header of
`project-initiation-approval.flow.ts`).

**The project-path expense approvals are PSA's again — moved back 2026-11-19.** The last two
rows, and the turn-back templates `crm.expense_report_project_over` and
`crm.expense_report_project_locked` (`src/psa/email-templates/`), are registered by PSA
(`psaFlows` and `emailTemplates` in `src/psa/index.ts`): PR
[#2678](https://github.com/objectstack-ai/hotcrm/pull/2678) for
[hotcrm#2575](https://github.com/objectstack-ai/hotcrm/issues/2575) moved them back from
`src/expense/` once objectstack#34616 shipped in 18.6.0, as the 2026-11-17 ruling 「先放报销包,修好后搬回」
said. The expense package keeps only its manager-path flows (`src/expense/flows/`); behaviour,
approvers and the 2,000 threshold are unchanged. **Upgrade note**
(`.changeset/2575-project-approval-to-psa.md`): a project expense report or travel request still
waiting for approval at the upgrade cannot be decided afterwards — deciding it answers 409
`RESUME_TARGET_LOST`, because the paused run belongs to the expense package's flow. Decide them
before upgrading; for one left waiting, the submitter recalls it, an administrator sets its status
back to Draft, and the submitter submits it again.

## Cost control — a machine signal warns, a person's decision blocks

AGENTS.md rule 8, as built:

1. **The signal is automatic.** `project_budget_status` (`project.hook.ts`) writes `budget_status`
   from spent ÷ Approved Budget on every save: Warning from `BUDGET_WARNING_PERCENT` (80), Exceeded
   from `BUDGET_EXCEEDED_PERCENT` (100). `project_budget_alert` (`project-budget-alert.flow.ts`)
   notifies the project manager and every Finance Controller once per crossing, and proposes the
   lock; it never sets it.
2. **The block is a decision.** With `time_entry_locked` ticked, a timesheet cannot be submitted
   (`timesheet.hook.ts`), and an expense report on the project is turned back to Draft
   (`expense_report_project_approval`). Drafts are never refused; there is no override flag.

## Permissions, positions, sharing

- **Positions** (app package, `src/sales/sharing/positions.ts`): `crm_project_director`,
  `crm_pmo`, `crm_project_manager`, `crm_project_member`, `crm_finance_controller`. The director
  and the PMO hold both the manager and the finance sets.
- **Permission sets** (app package, `src/sales/profiles/`): `project-manager.profile.ts`,
  `project-member.profile.ts`, `finance-controller.profile.ts`. A project member reads the
  projects they are staffed on and writes only their own time and expenses; cost — rate-card cost
  rates, entry and timesheet cost, the project's cost block and every budget — is hidden from
  them (ruling D), and since PR [#2650](https://github.com/objectstack-ai/hotcrm/pull/2650) they
  read the account without its Order to Cash totals.
- **Sharing** (`src/psa/sharing/project.sharing.ts`): `project_team_read` (the people in
  `team_members`), `project_manager_edit` (the `project_manager`), `timesheet_approver_edit` (the
  stamped approver), and one `project_finance_edit_*` rule per position holding the finance set.
  The expense's approver rule left with the expense (hotcrm#2556).
- No `runAs: 'system'` scan exists in PSA: every elevated read is keyed to an id (AGENTS.md rule
  10; headers of `project_member.hook.ts` and `time_entry.hook.ts`).

## i18n, docs, analytics

- **Locales**: PSA's labels live in its own packs, `src/psa/translations/` (en, zh-CN, es-ES,
  ja-JP), and come and go with the package (`src/psa/translations/index.ts`).
- **In-app manual**: the `crm_psa_manual` book (`src/psa/books/crm-psa-manual.book.ts`) over
  `src/psa/docs/crm_psa_*.md` and `.zh.md`, opened from the app's *Help* group.
- **Product docs**: `content/docs/(product)/projects/` (index, projects and staffing, project plan, budgets,
  time and expenses), in English, zh-Hans and zh-Hant.
- **Analytics**: datasets `project_financials` (`src/psa/datasets/project.dataset.ts`) and
  `time_utilization` (`src/psa/datasets/time-entry.dataset.ts`); the `projects_overview`
  dashboard reads only those two. Its menu entry is not offered to a plain team member, whose
  cost reads are refused.
- **Seed**: `src/psa/data/psa.seed.ts` and `psa.zh-CN.seed.ts`.

## Phasing

### Phases 0–2 — shipped

Each phase landed through its own PRs with `pnpm verify`, a changeset, product docs and a browser
pass. Dates are the merge dates on `main`.

| Phase | Card | PRs | Shipped |
| --- | --- | --- | --- |
| **0 — join the suite, measure** | hotcrm#2316 | [#2471](https://github.com/objectstack-ai/hotcrm/pull/2471) (2026-11-15) | `app.objectstack.hotcrm.psa` composed as a module with the Project Delivery app skeleton; the module-disable reading; four readings: P1 a summary over a summary works, P2 multi-currency works with a display gap (objectstack#33659), P3 Gantt shifts successors in the console only, P4 dataset binding is downward only |
| **1a — the v1 objects** | hotcrm#2316 | [#2472](https://github.com/objectstack-ai/hotcrm/pull/2472) (2026-11-15) | project, staffing, rate card, timesheet and entry, expense; team and rate hooks, sharing, views, seed, labels, the cost and margin roll-ups |
| **1b — approvals and cost control** | hotcrm#2316 | [#2473](https://github.com/objectstack-ai/hotcrm/pull/2473) (2026-11-15) | the three approvals, the overrun alert and the lock |
| **1c — overview** | hotcrm#2316 | [#2477](https://github.com/objectstack-ai/hotcrm/pull/2477) (2026-11-15) | the two datasets, the Projects Overview dashboard, the manual |
| **1, ruling D** | hotcrm#2316 | [#2478](https://github.com/objectstack-ai/hotcrm/pull/2478), [#2480](https://github.com/objectstack-ai/hotcrm/pull/2480) (2026-11-15) | team members read accounts, not opportunities |
| **2a — tasks and Gantt** | hotcrm#2545 | [#2549](https://github.com/objectstack-ai/hotcrm/pull/2549) (2026-11-16) | `crm_project_task`, the Gantt, computed Percent Complete |
| **2b — the weekly timesheet** | hotcrm#2546 | [#2552](https://github.com/objectstack-ai/hotcrm/pull/2552) (2026-11-16) | lines find or create their timesheet; My Week; Submit This Week. Ruling: one sheet per person × project × period, approved by the project manager |
| **2c — budget versions** | hotcrm#2547 | [#2554](https://github.com/objectstack-ai/hotcrm/pull/2554) (2026-11-16) | `crm_project_budget` and its lines, the baseline, the top-up approval |
| **Walkthrough fixes** | hotcrm#2565–#2568 | [#2630](https://github.com/objectstack-ai/hotcrm/pull/2630) (2026-11-18) | budget lines save, timesheet names, member titles, stacked New/Edit forms |

Other PSA changes on `main`, outside the phase cards: weekly hours by the day worked (#2486),
Closed and Cancelled projects take no new time or expense (#2500), refusals in the caller's
language (#2506), the expense moves to its own module (#2577), a project names its sales order
(#2585), the project page's Overview (#2594), the platform bump to 18.6.0 (#2637), consultants
read the account without Order to Cash totals (#2650), approvals need the deployment's approvals
(#2673), the project manager back in the team (#2674), the project-path expense approvals moved
back from the expense module (#2678).

### Phase 3 — ruled, not built

Ruled 2026-11-17: phase 3 bills approved time and expenses through Order to Cash, and **PSA will
depend on `app.objectstack.hotcrm.o2c`** — a second add-on → add-on edge after PSA → expense. The
probe [hotcrm#2618](https://github.com/objectstack-ai/hotcrm/issues/2618) measured the shape on
18.5.0 (closed; no repo change) and asked four design changes: no Project column in Order to
Cash's own views, the billed-on stamp exempt from the timesheet lock, Prepare Billing cleaning up
after a failure, and deleting a billed step treated as blocked on the platform. Today
`src/psa/index.ts` declares no Order to Cash dependency.

| Step | Card | What it builds | What it waits on |
| --- | --- | --- | --- |
| **3a** | [hotcrm#2621](https://github.com/objectstack-ai/hotcrm/issues/2621), `pm:blocked` | the PSA → Order to Cash edge; a Project field on `crm_billing_milestone`; a billed-on lookup on `crm_time_entry` and `crm_expense`; *Prepare Billing*, which puts approved billable time and expenses on one new plan step | `Blocked-by: #2557` — plan steps, invoices and payments under the account, open (`needs-user-decision` since 2026-11-18, PR #2583 a draft); `Blocked-by: #2560` — a plan step citing a sales order, open and `pm:blocked` on #2557 (its other blocker, #2555, is closed) |
| **3b** | [hotcrm#2622](https://github.com/objectstack-ai/hotcrm/issues/2622), `pm:blocked` | Billed and Not Yet Billed on the project, in `project_financials` and on the dashboard; the manual page on billing | `Blocked-by: #2621` — step 3a |

Platform cards 3a cites, read 2026-11-19: objectstack#34899 (a read-only lookup kept a deleted
step's id) and #34901 (a column on a disabled package's field failed the list) are closed;
#34900 (a script body writes into a disabled package) is open and not listed as a blocker — the
action checks first. Nothing beyond the two cards is designed here.

### Phase 4 — resources and capacity

Resource requests and capacity planning, as placed on 2026-11-15; no card, and no design here.
Project templates and case time were placed in phase 3 by that re-phasing and have no card either.

## Mapping REQ-0002 onto what is built

The spreadsheet's 26 project-side steps. **B** = standard product, **C** = customer overlay,
**D** = declined or deferred, **A** = already in the platform or the app.

| Steps | Asked | As built | Disposition |
| --- | --- | --- | --- |
| 15–16 售前立项 | presales project citing an approved opportunity | `kind = presales`, `crm_opportunity` lookup; **no gate** refuses an unapproved opportunity | B, gate not built |
| 17, 24 项目角色 | account manager, PM, director, QA, pricing owner | `crm_project_member.responsibility`; customer titles are picklist values | B, titles C |
| 18 成本与报价测算 | labor / services / goods / expense estimate, margin | budget version 1 and its lines; `gross_margin` on the project | B |
| 19, 25 信息安全 | security category, kick-off upload | attachments via `enable.files`; **no security classification field** | B upload; category not built |
| 20 五级串行审批 | five-step named chain | two-tier initiation approval; the named chain is an overlay flow | B core, chain C |
| 21–22 交付立项 | delivery project citing an approved presales one | `kind = delivery`, `source_project`; **no gate** | B, gate not built |
| 23 成本中心与核算主体 | cost centres, department | **not built**: no business unit or cost centre on the project | not built |
| 26 交付立项审批 | approval, then the project starts | `project_initiation_approval`; `approved → active` by the manager | B |
| 27 预算基线导入 | approved business case becomes the baseline | version 1 approved with the project becomes the baseline | B |
| 28–31 四类成本计划 | four cost plans by month | budget line `category` and `period`, plus `other` | B |
| 32 成本调整审批 | top-up with reason | a later version, `reason`, `project_budget_approval` | B |
| 33 月度工时填报 | monthly timesheet; leave and overtime sync | periods up to 31 days; weekly entry; **HR sync D** (an external system's data; ADR-0097) | B; sync D |
| 34 工时审批 | PM approves, then it counts as cost | `timesheet_approval`; `actual_labor_cost` sums approved sheets | B |
| 35 差旅成本填报 | expenses per project with receipts | `crm_expense` (expense module) with attachments and the PSA Project field | B |
| 36 成本超支预警与管控 | overrun alert, restrict entry | `budget_status` + `time_entry_locked` (*Cost control*) | B, rule-8 shape |
| 37–38 项目查询 | basics, budget, cost, margin, invoiced, collected | list views, `project_financials`; invoicing and collection are Order to Cash's, reached from PSA only in phase 3 | B; billing phase 3 |
| 39 成本跟踪 | budget execution, baseline vs actual | `budget_consumed_percent`, `cost_variance` | B |
| 40 合同与订单查询 | sales contracts, purchase contracts, orders | `crm_contract` and `crm_sales_order` (app package) on the project; purchase contracts D | A; purchase D |

Steps 1–14 are CRM-side and are not PSA's scope.

## History — the first draft (17.4.0)

Kept as the record of how the plan reached its shape. Nothing below is a claim about the current
pin or `src/`.

### Where PSA sits

Maintainer ruling, 2026-09-14, verbatim and untranslated:

> 「所以应该先分拆基础的crm, 比如 sales 和 support， token 门禁： 放到 sales」

The base CRM split first; PSA was added later to an artifact already composed. The split plan
listed three upstream blockers on 2026-09-02; on 17.4.0 two were in the pin and the third did not
gate a module booted from an artifact:

| Blocker as listed on 2026-09-02 | Where it landed | In 17.4.0? |
| --- | --- | --- |
| Compile path — `os build` emitting `packages[]` ([objectstack#14439](https://github.com/objectstack-ai/objectstack/issues/14439)) | `@objectstack/cli` 17.3.0 (`7085f90`), `@objectstack/spec` 17.3.0 (`2e3e8c7`, `manifest: 'preserve'`) | ✅ |
| Per-package registration at load ([objectstack#14599](https://github.com/objectstack-ai/objectstack/issues/14599)) | `@objectstack/core` 17.3.0 (`655b106`); `@objectstack/runtime` 17.4.0 (`f1a1028`) | ✅ |
| Studio's writable verdict ([objectstack#14430](https://github.com/objectstack-ai/objectstack/issues/14430)) | Studio surface | Not needed: a module booted from an artifact is served `writable: false` (ADR-0070 D2) |

### The first draft's package shape

`dependencies` of `{ 'app.objectstack.hotcrm': '^3.0.0' }` plus revenue once packaged; one
`navigationContributions` entry into a `group_projects` node in the Sales app. Amended
2026-10-26 (`module-split-plan.md` items 10, 11 and 13: app package only, born as its own
artifact), then superseded by the 2026-11-15 rulings (a module of the one artifact, with its own
app) and by item 18 on 2026-11-16 (the expense edge).

### The token budget — retired

Measured at `c716a2c` by `scripts/check-source-token-ratchet.mjs` over the whole tree: business
semantics 86,074 of a 100,000 ceiling, interaction layer 38,585 of 40,000; PSA v1 was estimated
at 15–20k and 5–7k. The 2026-09-14 ruling scoped the gate to `src/sales/`; #1928 (2026-09-16,
「1928 门禁 改为 多 sales 模块的门禁」) gave every package its own ceiling. **Retired 2026-11-15
(#2468)**: 「为了让整个 CRM 能放进一个 AI 的上下文窗口，已经不是重点了。」 The gate and every
ceiling are gone; PSA's size is not gated.

### Decisions needed — ruled

The first draft asked the maintainer four questions before phase 0. All are ruled:

| Question | Ruled | Answer |
| --- | --- | --- |
| Partition the token gate per package, or raise its ceilings | 2026-09-14, then 2026-09-16 (#1928); moot 2026-11-15 (#2468) | the gate measured sales, then every package; then it was removed |
| The navigation group: a top-level *Projects* group or items under *Sales* | 2026-11-15, ruling 1 | neither: PSA's own app |
| v1 scope: work breakdown, resource requests, billing milestones in v2 | 2026-11-15, ruling 3 | tasks and Gantt in phase 2; resources in phase 4; billing milestones in Order to Cash (2026-10-23) |
| One `crm_project` with `kind`, or two objects | 2026-11-15, ruling 6 | one object, `presales` / `delivery` / `internal` |

## References

- ADR-0130 — one artifact, N packages; its 2026-09-02 addendum on permission sets
- ADR-0019 D2 — the internal-contribution tier a `module` package belongs to
- ADR-0029 D7 — `navigationContributions` as the cross-package navigation channel
- ADR-0150 D3 — dataset binding along the dependency closure
- [`module-split-plan.md`](./module-split-plan.md) — rules R1–R4; items 10 and 16–20
- [`expense-module-plan.md`](./expense-module-plan.md) — the expense module and its readings
- [`order-to-cash-module-plan.md`](./order-to-cash-module-plan.md) — plan steps, invoices, payments
- [`sales-order-plan.md`](./sales-order-plan.md) — the sales order a project names
- [`../requirements/0002-it-services-project-delivery-and-cost.md`](../requirements/0002-it-services-project-delivery-and-cost.md),
  [`../requirements/0011-expense-and-reimbursement.md`](../requirements/0011-expense-and-reimbursement.md),
  [`../requirements/0012-multi-currency.md`](../requirements/0012-multi-currency.md)
- `src/psa/index.ts` — the manifest and what the package registers
