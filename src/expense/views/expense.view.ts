// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Expense views (hotcrm#2556; moved here from Project Delivery with the
 * object, names unchanged, so a saved view or a bookmark keeps working).
 *
 *   • All Expenses — every expense the reader may see, newest first.
 *   • My Expenses — the reader's own, where they select expenses and Submit
 *     for Reimbursement (hotcrm#2559).
 *
 * Expenses to Approve retired with per-expense approval (hotcrm#2559): an
 * approver decides a report, from Reports to Approve
 * (`./expense_report.view.ts`).
 *
 * The Project column is Project Delivery's field (`src/psa/extensions/`),
 * named here because a view of a foreign object may not live in that package
 * (ADR-0130 R3) and these views are the ones project staff open too. With
 * Project Delivery disabled the field leaves the object, and so does the
 * column (measured on 18.5.0 before filing, hotcrm#2556).
 */

/**
 * The selection bar of My Expenses: one Submit for Reimbursement for the
 * whole selection (`execution: 'aggregate'`, one report per project), its
 * Submit for a Trip twin, and
 * Delete, which any authored bar entry would otherwise hide.
 */
const MY_EXPENSES_BAR = [
  { name: 'submit_for_reimbursement', operation: 'custom', execution: 'aggregate' },
  // The same, against one approved travel request picked in its dialog
  // (hotcrm#2580).
  { name: 'submit_trip_for_reimbursement', operation: 'custom', execution: 'aggregate' },
  {
    name: 'delete',
    label: 'Delete',
    icon: 'trash-2',
    variant: 'danger',
    operation: 'delete',
    confirmText: 'Delete {{count}} expense(s)? They go to the recycle bin, where an administrator can restore them.',
    confirmLabel: 'Delete',
  },
] as const;

export const ExpenseViews = defineView({
  list: {
    type: 'grid',
    name: 'all_expenses',
    label: 'All Expenses',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_expense' },
    columns: [
      { field: 'name', width: 240, link: true, pinned: 'left' },
      { field: 'owner_id', width: 160 },
      { field: 'crm_project', width: 220 },
      { field: 'expense_date', width: 120, sortable: true },
      { field: 'category', width: 120 },
      { field: 'amount', width: 130, align: 'right' },
      { field: 'paid_by', width: 110 },
      { field: 'is_billable', width: 100, align: 'center' },
      { field: 'status', width: 110 },
      { field: 'crm_expense_report', width: 200 },
    ],
    sort: [{ field: 'expense_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    my_expenses: {
      name: 'my_expenses',
      type: 'grid',
      label: 'My Expenses',
      bulkActionDefs: [...MY_EXPENSES_BAR],
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_expense' },
      columns: ['name', 'crm_project', 'expense_date', 'category', 'amount', 'paid_by', 'status', 'crm_expense_report'],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'expense_date', order: 'desc' }],
    },
  },
});
