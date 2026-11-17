// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Expense views (hotcrm#2556; moved here from Project Delivery with the
 * object, names unchanged, so a saved view or a bookmark keeps working).
 *
 *   • All Expenses — every expense the reader may see, newest first.
 *   • My Expenses — the reader's own.
 *   • Expenses to Approve — submitted ones stamped with the reader as approver.
 *
 * The Project column is Project Delivery's field (`src/psa/extensions/`),
 * named here because a view of a foreign object may not live in that package
 * (ADR-0130 R3) and these views are the ones project staff open too. With
 * Project Delivery disabled the field leaves the object, and so does the
 * column (measured on 18.5.0 before filing, hotcrm#2556).
 */
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
    ],
    sort: [{ field: 'expense_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    my_expenses: {
      name: 'my_expenses',
      type: 'grid',
      label: 'My Expenses',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_expense' },
      columns: ['name', 'crm_project', 'expense_date', 'category', 'amount', 'status'],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'expense_date', order: 'desc' }],
    },

    expenses_to_approve: {
      name: 'expenses_to_approve',
      type: 'grid',
      label: 'Expenses to Approve',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_expense' },
      columns: ['name', 'owner_id', 'crm_project', 'expense_date', 'category', 'amount', 'status'],
      filter: [
        { field: 'approver', operator: 'equals', value: '{current_user_id}' },
        { field: 'status', operator: 'equals', value: 'submitted' },
      ],
      sort: [{ field: 'expense_date', order: 'asc' }],
    },
  },
});
