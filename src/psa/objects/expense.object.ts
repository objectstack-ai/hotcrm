// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { EXPENSE_CATEGORY_OPTIONS, SUBMISSION_STATUS_OPTIONS } from './_psa-picklists';

/**
 * Expense — a cost a person spent on a project, with its receipt attached
 * (hotcrm#2316, plan *crm_expense*). Only an APPROVED expense counts toward
 * the project's cost, and an approved billable one toward its amount to bill.
 *
 * The amount is in the organization's currency, as every amount here is. A
 * per-expense currency converted to the home currency is measured to work on
 * 18.4.0 (phase 0, P2), but it refuses every expense on an organization that
 * has not set its home currency yet, so v1 does not take it on.
 *
 * `private` to the person who spent it (the owner); the approver reaches it
 * through the approval request.
 */
export const Expense = ObjectSchema.create({
  name: 'crm_expense',
  label: 'Expense',
  pluralLabel: 'Expenses',
  icon: 'receipt',
  description: 'A cost spent on a project, with its receipt',

  sharingModel: 'private',
  nameField: 'name',
  highlightFields: ['crm_project', 'amount', 'expense_date', 'status'],

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

    crm_project: Field.lookup('crm_project', {
      label: 'Project',
      group: 'basic',
      required: true,
      relatedListColumns: ['name', 'owner_id', 'expense_date', 'category', 'amount', 'status'],
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
      options: SUBMISSION_STATUS_OPTIONS.map((o) => (o.value === 'draft' ? { ...o, default: true } : o)),
    }),

    // Stamped from the project's Project Manager when the expense is created
    // (`expense.hook.ts`).
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
    { fields: ['crm_project'] },
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
