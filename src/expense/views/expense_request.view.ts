// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Travel request views (hotcrm#2578), in the Expenses app only:
 *
 *   • All Travel Requests — every request the reader may see, newest trip
 *     first (finance, and the sets that read every expense, read them all).
 *   • My Travel Requests — the reader's own.
 *   • Requests to Approve — submitted ones stamped with the reader as approver.
 */
export const ExpenseRequestViews = defineView({
  list: {
    type: 'grid',
    name: 'all_travel_requests',
    label: 'All Travel Requests',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_expense_request' },
    columns: [
      { field: 'request_number', width: 120 },
      { field: 'name', width: 240, link: true, pinned: 'left' },
      { field: 'owner_id', width: 160 },
      { field: 'destination', width: 160 },
      { field: 'start_date', width: 120, sortable: true },
      { field: 'end_date', width: 120 },
      { field: 'estimated_amount', width: 140, align: 'right' },
      { field: 'status', width: 110 },
    ],
    sort: [{ field: 'start_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    my_travel_requests: {
      name: 'my_travel_requests',
      type: 'grid',
      label: 'My Travel Requests',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_expense_request' },
      columns: ['request_number', 'name', 'destination', 'start_date', 'end_date', 'estimated_amount', 'status'],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'start_date', order: 'desc' }],
    },

    travel_requests_to_approve: {
      name: 'travel_requests_to_approve',
      type: 'grid',
      label: 'Requests to Approve',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_expense_request' },
      columns: ['request_number', 'name', 'owner_id', 'destination', 'start_date', 'end_date', 'estimated_amount', 'status'],
      filter: [
        { field: 'approver', operator: 'equals', value: '{current_user_id}' },
        { field: 'status', operator: 'equals', value: 'submitted' },
      ],
      sort: [{ field: 'start_date', order: 'asc' }],
    },
  },
});
