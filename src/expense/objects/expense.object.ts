// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';
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
 * An expense is sent, decided and paid back on an expense report
 * (`./expense_report.object.ts`, hotcrm#2559): Submit for Reimbursement puts
 * the selected expenses on a report and submits it, and each expense's status
 * follows its report's. An expense is no longer approved on its own.
 *
 * This package knows nothing of projects. Project Delivery adds the optional
 * `crm_project` lookup through `objectExtensions` and sums the approved
 * expenses into the project's cost (`src/psa/extensions/`). With Project
 * Delivery disabled the field leaves the object and an expense is still
 * recorded, reported and approved.
 *
 * The amount is in the organization's currency, as every amount here is
 * (REQ-0012: multi-currency is not started).
 *
 * `private` to the person who spent it (the owner). Whoever approves its
 * report reaches it through `expense_approver_edit`, which shares it to the
 * `approver` copied from the report (`../sharing/expense.sharing.ts`).
 */
export const Expense = ObjectSchema.create({
  name: 'crm_expense',
  label: 'Expense',
  pluralLabel: 'Expenses',
  icon: 'receipt',
  description: 'A cost a person spent for the company, with its receipt',

  sharingModel: 'private',

  // No "+ New" on a report's Expenses list, whatever the report's status. An
  // expense reaches a report only through Submit for Reimbursement: the
  // report field is read-only, so the platform drops a report a person names
  // and the new expense would land on no report at all. A related list's
  // create toolbar evaluates this against the HOST record, and only a report
  // carries a report number, so the project page's Expenses list keeps it.
  userActions: {
    create: {
      visibleWhen: P`!has(record.report_number)`,
    },
  },
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

    // The report it was sent on (hotcrm#2559). Written by Submit for
    // Reimbursement, never by hand, so an expense cannot be slipped onto a
    // report already decided: the platform drops a person's value before any
    // hook runs, on create and on update alike (pinned in
    // `test/expense-module.test.ts`).
    crm_expense_report: Field.lookup('crm_expense_report', {
      label: 'Expense Report',
      group: 'basic',
      readonly: true,
      relatedListColumns: ['name', 'expense_date', 'category', 'amount', 'paid_by', 'merchant', 'status', 'review_notes'],
    }),

    // Follows the report (`expense_report.hook.ts`): Submitted, Approved or
    // Rejected with it, and back to Draft when it is recalled or corrected.
    // Read-only to people since per-expense approval retired (hotcrm#2559).
    status: Field.select({
      label: 'Status',
      group: 'basic',
      required: true,
      readonly: true,
      trackHistory: true,
      options: EXPENSE_STATUS_OPTIONS.map((o) => (o.value === 'draft' ? { ...o, default: true } : o)),
    }),

    // The report's approver, copied onto each of its expenses when the
    // report's approval names one (`expense_report.hook.ts`), so the approver
    // can open the expenses they decide (`expense_approver_edit`).
    approver: Field.lookup('sys_user', {
      label: 'Approver',
      group: 'basic',
      readonly: true,
    }),

    notes: Field.textarea({ label: 'Notes', group: 'basic' }),

    // Where an assistant or a rule writes what it found on this one expense
    // (over a standard, a receipt number seen before, a missing receipt), and
    // the approver reads it in the report's expense list (hotcrm#2616, F4a).
    // The report and the travel request carry the same field. The product
    // writes nothing here itself, and nothing compares (REQ-0011: agents
    // check, the app provides the place). It locks with the expense's other
    // fields once the expense is on a sent report (`./expense.hook.ts`).
    review_notes: Field.textarea({
      label: 'Review Notes',
      group: 'basic',
      description: 'What a check found, for the approver to read.',
    }),
  },

  validations: [
    {
      name: 'expense_status_progression',
      type: 'state_machine',
      severity: 'error',
      message: 'This status change is not allowed. An expense follows its report: Draft → Submitted → Approved or Rejected, and back to Draft when the report is recalled or corrected.',
      field: 'status',
      // Protocol 19 asks for an entry contract (`state-machine-no-initial-states`). Every state is listed: a
      // record (an import or an integration included) may still be created in any of them, as on 18.6.
      // Narrowing this to the first state is a product decision of its own, not part of the upgrade.
      initialStates: ['draft', 'submitted', 'approved', 'rejected'],
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
    { fields: ['crm_expense_report'] },
    // A duplicate check by receipt number is one indexed query (hotcrm#2616).
    { fields: ['receipt_number'] },
  ],

  enable: {
    trackHistory: true,
    files: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
