// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Itinerary line view (hotcrm#2579). Not in the navigation: the legs are read
 * and entered on their travel request's page. The related list there takes
 * its row order from this default view's sort, so the legs read in the order
 * of the trip, and two legs on one day in the order they were added.
 */
export const ExpenseRequestLineViews = defineView({
  list: {
    type: 'grid',
    name: 'all_itinerary_lines',
    label: 'All Itinerary Lines',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_expense_request_line' },
    columns: [
      { field: 'crm_expense_request', width: 200 },
      { field: 'line_number', width: 80 },
      { field: 'kind', width: 110 },
      { field: 'origin', width: 160 },
      { field: 'destination', width: 160, link: true },
      { field: 'start_date', width: 120 },
      { field: 'end_date', width: 120 },
      { field: 'booking_reference', width: 160 },
    ],
    sort: [{ field: 'start_date', order: 'asc' }, { field: 'line_number', order: 'asc' }],
    pagination: { pageSize: 50 },
  },
});
