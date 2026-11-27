// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';
import { BUDGET_STATUS_OPTIONS, PROJECT_BILLING_TYPE_OPTIONS, PROJECT_KIND_OPTIONS, PROJECT_STATUS_OPTIONS } from './_psa-picklists';

/**
 * Project — one engagement the delivery team runs for a customer
 * (`docs/architecture/psa-module-plan.md`, *The data model — v1*, hotcrm#2316).
 *
 * One object for presales, delivery and internal work (ruling 6, 2026-11-15):
 * time is booked, people are staffed and cost is counted the same way on all
 * three, so `kind` tells them apart rather than three objects duplicating the
 * children. A delivery project points at the presales one it was won from
 * through `source_project`.
 *
 * ## The money
 *
 * Every figure below the plan is a summary or a formula, never typed in:
 *
 *   - `actual_labor_cost` sums the APPROVED timesheets' cost, and each
 *     timesheet sums its entries' cost (two summaries, measured as a working
 *     chain on 18.4.0 in phase 0). An entry's cost is its hours at the cost
 *     rate copied from the staffing's rate card when the hours were written
 *     (`time_entry.hook.ts`), so a rate change never rewrites past cost.
 *   - `actual_expense_cost` sums the approved expenses.
 *   - `billable_amount` is the approved amount to bill: approved billable hours
 *     at their bill rate plus approved billable expenses. Invoicing it is Order
 *     to Cash's (ruling 4); this module only produces the figure.
 *   - `actual_cost`, `cost_variance`, `budget_consumed_percent`,
 *     `gross_margin` and `gross_margin_percent` are formulas over those.
 *
 * Amounts are in the organization's currency, as every amount in HotCRM is.
 * A summary is drawn as a bare number on 18.4.0 (objectstack#33659).
 *
 * `approved_budget` is the baseline budget version's total (hotcrm#2547):
 * the budget is planned in versions (`project_budget.object.ts`), version 1 is
 * approved with the project, and an approved top-up becomes the new baseline.
 *
 * ## Who sees a project
 *
 * `private`: the owner, the people staffed on it (`team_members`, kept by
 * `project_member.hook.ts`) and its project manager reach it through the two
 * record-relative rules in `../sharing/project.sharing.ts`; the delivery
 * leadership sets read every project.
 */
export const Project = ObjectSchema.create({
  name: 'crm_project',
  label: 'Project',
  pluralLabel: 'Projects',
  icon: 'briefcase',
  description: 'A customer engagement the delivery team runs, with its staffing, time, expenses, cost and margin',

  sharingModel: 'private',
  nameField: 'name',
  highlightFields: ['crm_account', 'kind', 'status', 'project_manager', 'gross_margin'],

  fieldGroups: [
    { key: 'identity',   label: 'Project',     icon: 'briefcase' },
    { key: 'provenance', label: 'Customer',    icon: 'building' },
    { key: 'plan',       label: 'Plan',        icon: 'calendar' },
    { key: 'financials', label: 'Financials',  icon: 'dollar-sign' },
    { key: 'team',       label: 'Team',        icon: 'users', collapse: 'collapsed' },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `src/sales/objects/account.object.ts`.
    owner_id: Field.lookup('sys_user', {
      label: 'Project Owner',
      group: 'team',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    project_number: Field.autonumber({
      label: 'Project Number',
      group: 'identity',
      format: 'PRJ-{00000}',
    }),

    name: Field.text({
      label: 'Project Name',
      group: 'identity',
      required: true,
      maxLength: 200,
    }),

    kind: Field.select({
      label: 'Kind',
      group: 'identity',
      required: true,
      options: PROJECT_KIND_OPTIONS.map((o) => (o.value === 'delivery' ? { ...o, default: true } : o)),
    }),

    billing_type: Field.select({
      label: 'Billing Type',
      group: 'identity',
      options: PROJECT_BILLING_TYPE_OPTIONS,
      description: 'How the customer pays for the work. Invoicing itself is done in Order to Cash.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'identity',
      required: true,
      trackHistory: true,
      options: PROJECT_STATUS_OPTIONS.map((o) => (o.value === 'draft' ? { ...o, default: true } : o)),
    }),

    description: Field.textarea({
      label: 'Description',
      group: 'identity',
    }),

    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'provenance',
      required: true,
      relatedListColumns: ['project_number', 'name', 'kind', 'status', 'planned_end', 'project_manager'],
    }),

    crm_opportunity: Field.lookup('crm_opportunity', {
      label: 'Opportunity',
      group: 'provenance',
      dependsOn: ['crm_account'],
      relatedListColumns: ['project_number', 'name', 'kind', 'status'],
    }),

    crm_contract: Field.lookup('crm_contract', {
      label: 'Contract',
      group: 'provenance',
      dependsOn: ['crm_account'],
      relatedListColumns: ['project_number', 'name', 'status', 'billing_type'],
    }),

    // The sale the project delivers, for a project sold on an order with no
    // contract (hotcrm#2561, REQ-0010 stage 2). Optional, as the contract is.
    // The order page's Projects list is the one this lookup derives; it leaves
    // with this module, since the field is on the module's own object.
    crm_sales_order: Field.lookup('crm_sales_order', {
      label: 'Order',
      group: 'provenance',
      description: 'The sales order this project delivers.',
      dependsOn: ['crm_account'],
      relatedListColumns: ['project_number', 'name', 'kind', 'status', 'planned_end', 'project_manager'],
    }),

    source_project: Field.lookup('crm_project', {
      label: 'Won From',
      group: 'provenance',
      description: 'For a delivery project: the presales project it was won from.',
      relatedListColumns: ['project_number', 'name', 'kind', 'status'],
    }),

    planned_start: Field.date({ label: 'Planned Start', group: 'plan' }),
    planned_end: Field.date({ label: 'Planned End', group: 'plan' }),
    actual_start: Field.date({ label: 'Actual Start', group: 'plan' }),
    actual_end: Field.date({ label: 'Actual End', group: 'plan' }),

    // Computed, not typed (hotcrm#2545): `project_task.hook.ts` keeps it from
    // the project's tasks with no subtasks, weighted by their planned hours,
    // cancelled tasks left out, Completed counted as 100. Empty while the
    // project has no task to count.
    percent_complete: Field.percent({
      label: 'Percent Complete',
      group: 'plan',
      min: 0,
      max: 100,
      readonly: true,
      description: 'Computed from the project\'s tasks, weighted by their planned hours. A task with subtasks counts through them.',
    }),

    planned_revenue: Field.currency({
      label: 'Planned Revenue',
      group: 'financials',
      min: 0,
      description: 'What the customer pays for this project. Gross margin is measured against it.',
    }),

    // The baseline budget version's total (hotcrm#2547): never typed. Version 1
    // is approved with the project; a top-up version, once approved, takes
    // the baseline over (`project_budget.hook.ts`), and this follows.
    approved_budget: Field.summary({
      label: 'Approved Budget',
      group: 'financials',
      scale: 2,
      readonly: true,
      description: 'The total of the project\'s baseline budget version: version 1 once the project is approved, then each approved top-up.',
      summaryOperations: {
        object: 'crm_project_budget',
        field: 'total_cost',
        function: 'sum',
        relationshipField: 'crm_project',
        filter: { is_baseline: true },
      },
    }),

    actual_labor_cost: Field.summary({
      label: 'Labor Cost',
      group: 'financials',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_timesheet',
        field: 'total_cost',
        function: 'sum',
        relationshipField: 'crm_project',
        filter: { status: 'approved' },
      },
    }),

    actual_expense_cost: Field.summary({
      label: 'Expense Cost',
      group: 'financials',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_expense',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_project',
        filter: { status: 'approved' },
      },
    }),

    billable_labor_amount: Field.summary({
      label: 'Billable Labor',
      group: 'financials',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_timesheet',
        field: 'total_bill_amount',
        function: 'sum',
        relationshipField: 'crm_project',
        filter: { status: 'approved' },
      },
    }),

    billable_expense_amount: Field.summary({
      label: 'Billable Expenses',
      group: 'financials',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_expense',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_project',
        filter: { status: 'approved', is_billable: true },
      },
    }),

    billable_amount: Field.formula({
      label: 'Approved to Bill',
      group: 'financials',
      returnType: 'currency',
      scale: 2,
      expression: F`coalesce(record.billable_labor_amount, 0) + coalesce(record.billable_expense_amount, 0)`,
      description: 'Approved billable hours at their bill rate, plus approved billable expenses. Order to Cash invoices it.',
    }),

    actual_cost: Field.formula({
      label: 'Actual Cost',
      group: 'financials',
      returnType: 'currency',
      scale: 2,
      expression: F`coalesce(record.actual_labor_cost, 0) + coalesce(record.actual_expense_cost, 0)`,
    }),

    cost_variance: Field.formula({
      label: 'Budget Remaining',
      group: 'financials',
      returnType: 'currency',
      scale: 2,
      expression: F`coalesce(record.approved_budget, 0) - coalesce(record.actual_labor_cost, 0) - coalesce(record.actual_expense_cost, 0)`,
    }),

    budget_consumed_percent: Field.formula({
      label: 'Budget Used %',
      group: 'financials',
      returnType: 'number',
      scale: 1,
      expression: F`coalesce(record.approved_budget, 0) > 0 ? (coalesce(record.actual_labor_cost, 0) + coalesce(record.actual_expense_cost, 0)) * 100 / record.approved_budget : null`,
    }),

    // A machine signal (#2316 phase 1b), kept by `project.hook.ts` on every
    // save from Budget Used %: warning at BUDGET_WARNING_PERCENT, exceeded at
    // BUDGET_EXCEEDED_PERCENT (`_thresholds.ts`). Stored, not a formula, so
    // `project_budget_alert` can see it cross and notify once per crossing.
    budget_status: Field.select({
      label: 'Budget Status',
      group: 'financials',
      readonly: true,
      options: BUDGET_STATUS_OPTIONS,
      description: 'On Track below 80 % of the Approved Budget, Warning from 80 %, Exceeded from 100 %.',
    }),

    // A person's decision, never set by the system (#2316 phase 1b): while it
    // is ticked, a timesheet or an expense on this project cannot be submitted
    // (`timesheet.hook.ts`, `expense.hook.ts`). Drafts can still be written.
    // The budget notice proposes it; the project manager or finance ticks it.
    time_entry_locked: Field.boolean({
      label: 'Lock Time and Expenses',
      group: 'financials',
      defaultValue: false,
      trackHistory: true,
      description: 'While ticked, no timesheet or expense on this project can be submitted. Drafts can still be written.',
    }),

    gross_margin: Field.formula({
      label: 'Gross Margin',
      group: 'financials',
      returnType: 'currency',
      scale: 2,
      expression: F`coalesce(record.planned_revenue, 0) - coalesce(record.actual_labor_cost, 0) - coalesce(record.actual_expense_cost, 0)`,
    }),

    gross_margin_percent: Field.formula({
      label: 'Gross Margin %',
      group: 'financials',
      returnType: 'number',
      scale: 1,
      expression: F`coalesce(record.planned_revenue, 0) > 0 ? (record.planned_revenue - coalesce(record.actual_labor_cost, 0) - coalesce(record.actual_expense_cost, 0)) * 100 / record.planned_revenue : null`,
    }),

    // Kept by `project_member.hook.ts` from the staffing rows: the member
    // whose responsibility is Project Manager. Read-only to people, so the approver is
    // never typed twice.
    project_manager: Field.lookup('sys_user', {
      label: 'Project Manager',
      group: 'team',
      readonly: true,
      description: 'The person staffed on this project as its project manager.',
    }),

    // Every person staffed on the project, its manager included, kept by
    // `project_member.hook.ts`. The sharing rule `project_team_read` reads it;
    // the manager also has `project_manager_edit`, and the wider grant wins.
    team_members: Field.lookup('sys_user', {
      label: 'Team',
      group: 'team',
      multiple: true,
      readonly: true,
    }),
  },

  validations: [
    {
      name: 'project_planned_dates',
      type: 'script',
      severity: 'error',
      message: 'Planned End must be on or after Planned Start.',
      condition: P`has(record.planned_start) && record.planned_start != null && has(record.planned_end) && record.planned_end != null && record.planned_end < record.planned_start`,
    },
    {
      // A transition gate, not an invariant (AGENTS.md rule 7): rows created
      // in any state (seed, import) pass untouched; only a CHANGE of status is
      // judged.
      name: 'project_status_progression',
      type: 'state_machine',
      severity: 'error',
      message:
        'This status change is not allowed. A project moves Draft → In Approval → Approved → Active → Completed → Closed; Active and On Hold switch back and forth, a rejected project goes back to Draft, and an open project can be Cancelled.',
      field: 'status',
      // Every status is an initial state: a create is not judged by this rule, so
      // an import lands a record in the status it already has. Protocol 19 refuses
      // a state machine that declares no list (`state-machine-no-initial-states`).
      initialStates: ['draft', 'in_approval', 'approved', 'rejected', 'active', 'on_hold', 'completed', 'closed', 'cancelled'],
      transitions: {
        draft: ['in_approval', 'cancelled'],
        in_approval: ['approved', 'rejected', 'draft', 'cancelled'],
        approved: ['active', 'cancelled'],
        rejected: ['draft', 'cancelled'],
        active: ['on_hold', 'completed', 'cancelled'],
        on_hold: ['active', 'cancelled'],
        completed: ['closed', 'active'],
        closed: [],
        cancelled: [],
      },
    },
  ],

  indexes: [
    { fields: ['owner_id'] },
    { fields: ['crm_account'] },
    { fields: ['crm_opportunity'] },
    { fields: ['crm_contract'] },
    { fields: ['crm_sales_order'] },
    { fields: ['status'] },
    { fields: ['project_manager'] },
  ],

  enable: {
    trackHistory: true,
    files: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
