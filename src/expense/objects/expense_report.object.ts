// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';
import { EXPENSE_REPORT_STATUS_OPTIONS } from './_expense-picklists';

/** A report that cites no travel request shows none of the trip's fields (hotcrm#2580). */
const CITES_A_REQUEST = P`has(record.crm_expense_request) && record.crm_expense_request != null && record.crm_expense_request != ""`;

/**
 * Expense Report — the expenses a person sends to be paid back, decided and
 * paid as one (REQ-0011, hotcrm#2559). An approver judges a trip as a whole
 * and finance pays per report, so submission, approval and payment live
 * here, and each expense on it follows it (`expense_report.hook.ts`).
 *
 * A report is made by **Submit for Reimbursement** on one or several of the
 * person's expenses (`../actions/expense.actions.ts`), which also submits it:
 * reporting a single expense takes no extra step. Project Delivery adds the
 * report's Project through `objectExtensions`
 * (`src/psa/extensions/expense-project.extension.ts`); Submit puts the
 * expenses of each project on a report of their own, so each project manager
 * decides only their project's spend.
 *
 * Two approvals, never both, as the expense had before: a report with no
 * project goes to the submitter's manager
 * (`../flows/expense-report-approval.flow.ts`), one on a project to its
 * Project Manager (`src/psa/flows/expense-report-project-approval.flow.ts`), and
 * either one from EXPENSE_FINANCE_REVIEW_AMOUNT (on the report's total) to a
 * Finance Controller as well.
 *
 * **Mark as Paid** records that the employee was paid back: a date and a
 * reference. It moves no money and posts nothing.
 *
 * `private` to its submitter (the owner). The approver reaches it through
 * `expense_report_approver_edit`; finance reads every report and marks it
 * paid through its permission sets.
 *
 * Amounts are in the organization's currency, as every amount here is
 * (REQ-0012: multi-currency is not started).
 */
export const ExpenseReport = ObjectSchema.create({
  name: 'crm_expense_report',
  label: 'Expense Report',
  pluralLabel: 'Expense Reports',
  icon: 'wallet',
  description: 'Expenses sent together to be approved and paid back',

  sharingModel: 'private',
  nameField: 'name',
  searchableFields: ['name', 'report_number', 'payment_reference'],
  highlightFields: ['report_number', 'total_amount', 'reimbursable_amount', 'status'],

  fieldGroups: [
    { key: 'basic', label: 'Expense Report', icon: 'wallet' },
    { key: 'trip', label: 'Travel Request', icon: 'plane' },
    { key: 'payment', label: 'Payment', icon: 'banknote' },
  ],

  fields: {
    owner_id: Field.lookup('sys_user', {
      label: 'Submitted By',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    report_number: Field.autonumber({
      label: 'Report Number',
      group: 'basic',
      format: 'ER-{0000}',
    }),

    name: Field.text({
      label: 'Title',
      group: 'basic',
      required: true,
      searchable: true,
      maxLength: 200,
    }),

    crm_account: Field.lookup('crm_account', {
      label: 'Account',
      group: 'basic',
      description: 'The customer the spend was for, when there is one.',
    }),

    // Every expense on the report, and the part the employee paid out of
    // their own pocket, which is what finance pays back. A company-paid
    // expense (a ticket bought on the company's account) is on the report so
    // the approver sees the whole trip, and is not paid back.
    // The approved travel request this report is the spending of (F3c,
    // hotcrm#2580). Chosen when the expenses are submitted
    // (`../actions/expense.actions.ts`) and never afterwards: a report is
    // born Submitted and an approved one is frozen. Optional, and at most one;
    // a request may have several reports.
    crm_expense_request: Field.lookup('crm_expense_request', {
      label: 'Travel Request',
      group: 'trip',
      readonly: true,
      visibleWhen: CITES_A_REQUEST,
      description: 'The approved travel request these expenses were spent on.',
      lookupFilters: [
        { field: 'owner_id', operator: 'eq', value: '{current_user_id}' },
        { field: 'status', operator: 'eq', value: 'approved' },
      ],
      // A request is filed and approved on its own page first; the picker
      // offers no "Create new".
      allowCreate: false,
      relatedListColumns: ['report_number', 'name', 'total_amount', 'status', 'submitted_date', 'payment_date'],
    }),

    // The request read from the report, for its approver (hotcrm#2580):
    // what was estimated, and what its reports in review, approved or paid
    // add up to, this one included once submitted. Stored copies, kept by
    // `expense_report_request_totals`, because the approver of a report is
    // not always someone who may open the request (a report on a project
    // goes to the project's manager; the request may have gone to the
    // traveler's manager). Empty on a report with no request.
    request_estimated_amount: Field.currency({
      label: 'Trip Estimate',
      group: 'trip',
      readonly: true,
      visibleWhen: CITES_A_REQUEST,
      description: 'The estimated amount on the travel request.',
    }),

    request_reported_amount: Field.currency({
      label: 'Reported for the Trip',
      group: 'trip',
      readonly: true,
      visibleWhen: CITES_A_REQUEST,
      description: 'The totals of the travel request\'s submitted, approved and paid reports.',
    }),

    // A sign, never a block (REQ-0011 F3c, AGENTS.md rule 8): an approver
    // can approve a report over the estimate.
    request_over_estimate: Field.formula({
      label: 'Over the Trip Estimate',
      group: 'trip',
      visibleWhen: CITES_A_REQUEST,
      returnType: 'boolean',
      // Empty, not "No", on a report with no request, so the detail page
      // folds it away with the other empty fields.
      expression: F`has(record.crm_expense_request) && record.crm_expense_request != null && record.crm_expense_request != "" ? coalesce(record.request_reported_amount, 0) > coalesce(record.request_estimated_amount, 0) : null`,
    }),

    total_amount: Field.summary({
      label: 'Total',
      group: 'basic',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_expense',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_expense_report',
      },
    }),

    reimbursable_amount: Field.summary({
      label: 'To Pay Back',
      group: 'basic',
      scale: 2,
      readonly: true,
      description: 'The expenses the employee paid themselves.',
      summaryOperations: {
        object: 'crm_expense',
        field: 'amount',
        function: 'sum',
        relationshipField: 'crm_expense_report',
        filter: { paid_by: 'employee' },
      },
    }),

    status: Field.select({
      label: 'Status',
      group: 'basic',
      required: true,
      trackHistory: true,
      options: EXPENSE_REPORT_STATUS_OPTIONS.map((o) => (o.value === 'draft' ? { ...o, default: true } : o)),
    }),

    // Stamped by the approval when the report is submitted: the project's
    // Project Manager on a project, otherwise the submitter's manager.
    approver: Field.lookup('sys_user', {
      label: 'Approver',
      group: 'basic',
      readonly: true,
    }),

    submitted_date: Field.datetime({ label: 'Submitted On', group: 'basic', readonly: true }),
    approved_date: Field.datetime({ label: 'Approved On', group: 'basic', readonly: true }),

    description: Field.textarea({ label: 'Remarks', group: 'basic' }),

    // Where an agent or a rule writes what it found (a missing receipt, a
    // duplicate, a meal over the usual amount) and the approver reads it
    // before deciding. The product writes nothing here itself
    // (REQ-0011: agents check, the app provides the place).
    review_notes: Field.textarea({
      label: 'Review Notes',
      group: 'basic',
      description: 'What a check found, for the approver to read.',
    }),

    payment_date: Field.date({ label: 'Paid On', group: 'payment' }),
    payment_reference: Field.text({ label: 'Payment Reference', group: 'payment', maxLength: 100 }),
  },

  validations: [
    {
      name: 'expense_report_status_progression',
      type: 'state_machine',
      severity: 'error',
      message: 'This status change is not allowed. A report moves Draft → Submitted → Approved → Paid; a submitted report can be recalled to Draft, and a rejected one goes back to Draft to be corrected.',
      field: 'status',
      // Every status is an initial state: a create is not judged by this rule, so
      // an import lands a record in the status it already has. Protocol 19 refuses
      // a state machine that declares no list (`state-machine-no-initial-states`).
      initialStates: ['draft', 'submitted', 'approved', 'paid', 'rejected'],
      transitions: {
        draft: ['submitted'],
        submitted: ['approved', 'rejected', 'draft'],
        approved: ['paid'],
        paid: [],
        rejected: ['draft'],
      },
    },
  ],

  indexes: [
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['approver'] },
    { fields: ['crm_expense_request'] },
  ],

  enable: {
    trackHistory: true,
    files: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
