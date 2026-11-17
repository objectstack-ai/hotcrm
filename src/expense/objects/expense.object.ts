// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import {
  EXPENSE_CATEGORY_OPTIONS, EXPENSE_PAID_BY_OPTIONS, EXPENSE_SOURCE_OPTIONS, EXPENSE_STATUS_OPTIONS,
} from './_expense-picklists';

/**
 * Expense — a cost a person spent for the company, with its receipt attached
 * (REQ-0011, hotcrm#2556). It moved here from Project Delivery under the same
 * name, so its table, REST path and stored rows are the ones it had: the
 * object name is the table name (ADR-0129), and both packages share the `crm`
 * namespace (`module-split-plan.md` item 16).
 *
 * This package knows nothing of projects. Project Delivery adds the optional
 * `crm_project` lookup through `objectExtensions`, sums the approved expenses
 * into the project's cost, and approves an expense on a project
 * (`src/psa/extensions/`, `src/psa/flows/submission-approval.flow.ts`). With
 * Project Delivery disabled the field leaves the object and an expense is
 * still recorded, submitted and approved.
 *
 * The amount is in the organization's currency, as every amount here is
 * (REQ-0012: multi-currency is not started).
 *
 * `private` to the person who spent it (the owner). Whoever approves it
 * reaches it through `expense_approver_edit`, which shares it to the
 * `approver` its approval stamps (`./expense.sharing.ts`).
 */
export const Expense = ObjectSchema.create({
  name: 'crm_expense',
  label: 'Expense',
  pluralLabel: 'Expenses',
  icon: 'receipt',
  description: 'A cost a person spent for the company, with its receipt',

  sharingModel: 'private',
  nameField: 'name',
  highlightFields: ['amount', 'expense_date', 'paid_by', 'status'],

  fieldGroups: [
    { key: 'basic', label: 'Expense', icon: 'receipt' },
  ],

  fields: {
    owner_id: Field.lookup('sys_user', {
      label: 'Spent By',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    name: Field.text({
      label: 'Description',
      group: 'basic',
      required: true,
      maxLength: 200,
    }),

    expense_date: Field.date({ label: 'Date', group: 'basic', required: true }),

    category: Field.select({
      label: 'Category',
      group: 'basic',
      required: true,
      options: EXPENSE_CATEGORY_OPTIONS,
    }),

    amount: Field.currency({
      label: 'Amount',
      group: 'basic',
      required: true,
      min: 0,
    }),

    // REQ-0011's first model: who paid, where, on which receipt, and how the
    // record arrived. None is required, so no existing form gains a required
    // field (usability rule 2).
    paid_by: Field.select({
      label: 'Paid By',
      group: 'basic',
      options: EXPENSE_PAID_BY_OPTIONS,
      description: 'The employee, who is paid back, or the company.',
    }),

    merchant: Field.text({
      label: 'Merchant',
      group: 'basic',
      maxLength: 200,
    }),

    receipt_number: Field.text({
      label: 'Receipt Number',
      group: 'basic',
      maxLength: 100,
    }),

    source: Field.select({
      label: 'Source',
      group: 'basic',
      options: EXPENSE_SOURCE_OPTIONS,
      description: 'Typed by a person, written by an agent, or imported.',
    }),

    is_billable: Field.boolean({
      label: 'Billable',
      group: 'basic',
      defaultValue: false,
      description: 'Whether this expense is passed on to the customer.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'basic',
      required: true,
      trackHistory: true,
      options: EXPENSE_STATUS_OPTIONS.map((o) => (o.value === 'draft' ? { ...o, default: true } : o)),
    }),

    // Stamped by the approval when the expense is submitted: the project's
    // Project Manager on a project, otherwise the spender's manager
    // (`../flows/expense-approval.flow.ts`, and Project Delivery's).
    approver: Field.lookup('sys_user', {
      label: 'Approver',
      group: 'basic',
      readonly: true,
    }),

    notes: Field.textarea({ label: 'Notes', group: 'basic' }),
  },

  validations: [
    {
      name: 'expense_status_progression',
      type: 'state_machine',
      severity: 'error',
      message: 'This status change is not allowed. An expense moves Draft → Submitted → Approved or Rejected; a rejected expense goes back to Draft to be corrected.',
      field: 'status',
      transitions: {
        draft: ['submitted'],
        submitted: ['approved', 'rejected', 'draft'],
        approved: [],
        rejected: ['draft'],
      },
    },
  ],

  indexes: [
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['expense_date'] },
  ],

  enable: {
    trackHistory: true,
    files: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
