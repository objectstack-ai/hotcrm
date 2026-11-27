// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { BUDGET_VERSION_STATUS_OPTIONS } from './_psa-picklists';

/**
 * Project Budget — one VERSION of a project's budget (hotcrm#2547, PSA phase
 * 2c; plan *crm_project_budget*).
 *
 * The budget is versioned, which makes "the approved business case becomes
 * the baseline" and "ask for more when the budget runs short" one mechanism:
 * a new version, a reason, an approval, and on approval the baseline moves.
 *
 * ## The baseline
 *
 * Exactly one approved version of a project is its baseline (`is_baseline`).
 * When a later version is approved it becomes the baseline and the one before
 * is Superseded (`project_budget.hook.ts`). The project's Approved Budget is
 * the baseline's total (a summary on `crm_project`), so Budget Used %, Budget
 * Status and the budget notice follow the baseline with no typing.
 *
 * ## Approval
 *
 *   - **Version 1 rides on the project's initiation approval** (seat ruling
 *     A, 2026-11-16). Sending the project for approval takes its draft
 *     version 1 along (`with_initiation`); approving the project approves it
 *     and makes it the baseline; a rejected or recalled project puts it back
 *     to Draft (`project.hook.ts`).
 *   - **A top-up** (any later version) has its own approval,
 *     `project_budget_approval`: a Project Director or the PMO, then a Finance
 *     Controller when it raises the baseline by
 *     `BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT` or more. It needs a reason.
 *
 * A project has one open version at a time (Draft, In Approval or Rejected).
 * Version numbers are stamped, 1, 2, 3…
 *
 * ## Who sees and writes it
 *
 * `controlled_by_parent`: whoever edits the project (its owner, its project
 * manager, finance, an administrator) writes its budget. Project members read
 * no budget: it is cost, which is hidden from them (ruling D).
 */
export const ProjectBudget = ObjectSchema.create({
  name: 'crm_project_budget',
  label: 'Project Budget',
  pluralLabel: 'Project Budgets',
  icon: 'wallet',
  description: 'One version of a project\'s budget: its lines, its total and its approval. The approved one is the baseline.',

  sharingModel: 'controlled_by_parent',
  nameField: 'name',
  highlightFields: ['version', 'status', 'is_baseline', 'total_cost'],

  fieldGroups: [
    { key: 'basic', label: 'Budget Version', icon: 'wallet' },
    // The budget's lines are part of the budget: this group draws their table
    // between the version and its totals on the record page, and keeps the
    // line grid in the New / Edit Budget form. From objectstack#35889 on, the
    // platform inlines a master-detail child only where a group of the parent
    // names it; the line FK's `inlineEdit: 'grid'` only picks the grid.
    { key: 'lines', label: 'Budget Lines', icon: 'list', relatedList: 'crm_project_budget_line' },
    { key: 'totals', label: 'Totals', icon: 'sigma' },
  ],

  fields: {
    crm_project: Field.masterDetail('crm_project', {
      label: 'Project',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      relatedListColumns: ['name', 'version', 'status', 'is_baseline', 'total_cost', 'reason'],
    }),

    // Filled on save from the project and the version (`project_budget.hook.ts`).
    name: Field.text({
      label: 'Budget',
      group: 'basic',
      maxLength: 200,
    }),

    version: Field.number({
      label: 'Version',
      group: 'basic',
      scale: 0,
      readonly: true,
      description: 'Numbered 1, 2, 3… in the order the versions were made.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'basic',
      required: true,
      trackHistory: true,
      options: BUDGET_VERSION_STATUS_OPTIONS.map((o) => (o.value === 'draft' ? { ...o, default: true } : o)),
    }),

    is_baseline: Field.boolean({
      label: 'Baseline',
      group: 'basic',
      readonly: true,
      defaultValue: false,
      trackHistory: true,
      description: 'The approved version the project\'s Approved Budget is. One per project; a later approved version takes it over.',
    }),

    with_initiation: Field.boolean({
      label: 'Approved With the Project',
      group: 'basic',
      readonly: true,
      defaultValue: false,
      description: 'Sent for approval with the project itself, as its first budget, rather than as a top-up.',
    }),

    reason: Field.textarea({
      label: 'Reason',
      group: 'basic',
      description: 'Why this version is needed. Required to send a top-up (version 2 or later) for approval.',
    }),

    total_cost: Field.summary({
      label: 'Total Cost',
      group: 'totals',
      scale: 2,
      readonly: true,
      summaryOperations: { object: 'crm_project_budget_line', field: 'amount', function: 'sum', relationshipField: 'crm_project_budget' },
    }),

    labor_cost: Field.summary({
      label: 'Labor Cost',
      group: 'totals',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_project_budget_line',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_project_budget',
        filter: { category: 'labor' },
      },
    }),

    labor_hours: Field.summary({
      label: 'Labor Hours',
      group: 'totals',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_project_budget_line',
        field: 'hours',
        function: 'sum',
        relationshipField: 'crm_project_budget',
        filter: { category: 'labor' },
      },
    }),

    notes: Field.textarea({ label: 'Notes', group: 'basic' }),
  },

  validations: [
    {
      name: 'project_budget_status_progression',
      type: 'state_machine',
      severity: 'error',
      message: 'This status change is not allowed. A budget version moves Draft → In Approval → Approved or Rejected; a rejected one goes back to Draft, and an approved one is Superseded when a later version is approved.',
      field: 'status',
      // Every status is an initial state: a create is not judged by this rule, so
      // an import lands a record in the status it already has. Protocol 19 refuses
      // a state machine that declares no list (`state-machine-no-initial-states`).
      initialStates: ['draft', 'in_approval', 'approved', 'rejected', 'superseded'],
      transitions: {
        draft: ['in_approval'],
        in_approval: ['approved', 'rejected', 'draft'],
        approved: ['superseded'],
        rejected: ['draft'],
        superseded: [],
      },
    },
  ],

  indexes: [
    { fields: ['crm_project'] },
    { fields: ['crm_project', 'version'] },
    { fields: ['status'] },
  ],

  enable: {
    trackHistory: true,
    apiEnabled: true,
    // `bulk` is the door the New / Edit form saves through when the version's
    // lines are typed into its inline grid: the console sends the version and
    // its lines in one `POST /batch` (hotcrm#2565).
    apiMethods: ['get', 'list', 'create', 'update', 'delete', 'bulk'],
  },
});
