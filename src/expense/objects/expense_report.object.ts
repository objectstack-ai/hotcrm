// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { EXPENSE_REPORT_STATUS_OPTIONS } from './_expense-picklists';

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
 * Project Manager (`../flows/expense-report-project-approval.flow.ts`), and
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
  ],

  enable: {
    trackHistory: true,
    files: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
