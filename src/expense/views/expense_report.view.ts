// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Expense report views (hotcrm#2559).
 *
 *   • All Expense Reports — every report the reader may see, newest first.
 *   • My Reports — the reader's own, with what each comes to and where it is.
 *   • Reports to Approve — submitted reports the reader is the approver of.
 *   • Reports to Pay — approved reports waiting for finance to mark them paid.
 *
 * The Project column is Project Delivery's field (`src/psa/extensions/`),
 * for the reason the expense views give.
 */
export const ExpenseReportViews = defineView({
  list: {
    type: 'grid',
    name: 'all_expense_reports',
    label: 'All Expense Reports',
    data: { provider: 'object', object: 'crm_expense_report' },
    userActions: { editInline: true },
    columns: [
      { field: 'report_number', width: 120, link: true, pinned: 'left' },
      { field: 'name', width: 240, link: true },
      { field: 'owner_id', width: 160 },
      { field: 'crm_project', width: 220 },
      { field: 'total_amount', width: 130, align: 'right' },
      { field: 'reimbursable_amount', width: 130, align: 'right' },
      { field: 'status', width: 110 },
      { field: 'submitted_date', width: 150, sortable: true },
      { field: 'payment_date', width: 120 },
    ],
    sort: [{ field: 'submitted_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    my_expense_reports: {
      name: 'my_expense_reports',
      type: 'grid',
      label: 'My Reports',
      data: { provider: 'object', object: 'crm_expense_report' },
      userActions: { editInline: true },
      columns: ['report_number', 'name', 'crm_project', 'total_amount', 'reimbursable_amount', 'status', 'approver', 'payment_date'],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'submitted_date', order: 'desc' }],
    },

    expense_reports_to_approve: {
      name: 'expense_reports_to_approve',
      type: 'grid',
      label: 'Reports to Approve',
      data: { provider: 'object', object: 'crm_expense_report' },
      userActions: { editInline: true },
      columns: ['report_number', 'name', 'owner_id', 'crm_project', 'total_amount', 'submitted_date', 'review_notes'],
      filter: [
        { field: 'approver', operator: 'equals', value: '{current_user_id}' },
        { field: 'status', operator: 'equals', value: 'submitted' },
      ],
      sort: [{ field: 'submitted_date', order: 'asc' }],
    },

    expense_reports_to_pay: {
      name: 'expense_reports_to_pay',
      type: 'grid',
      label: 'Reports to Pay',
      data: { provider: 'object', object: 'crm_expense_report' },
      userActions: { editInline: true },
      columns: ['report_number', 'name', 'owner_id', 'reimbursable_amount', 'total_amount', 'approved_date'],
      filter: [
        { field: 'status', operator: 'equals', value: 'approved' },
      ],
      sort: [{ field: 'approved_date', order: 'asc' }],
    },
  },
});
