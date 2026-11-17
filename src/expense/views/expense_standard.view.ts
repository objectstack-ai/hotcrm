// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Expense standard views (hotcrm#2616, F4a): one list, in the Expenses app
 * only (REQ-0010 usability rule 3), where everyone reads the standards and
 * finance keeps them. Retired standards stay listed, marked by Active, so
 * finance can bring one back.
 */
export const ExpenseStandardViews = defineView({
  list: {
    type: 'grid',
    name: 'all_expense_standards',
    label: 'Expense Standards',
    // Finance edits in the grid; for everyone else the row is read-only by
    // permission, and the grid offers no edit.
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_expense_standard' },
    columns: [
      { field: 'name', width: 260, link: true, pinned: 'left' },
      { field: 'category', width: 120 },
      { field: 'limit_amount', width: 130, align: 'right' },
      { field: 'limit_per', width: 100 },
      { field: 'applies_to', width: 220 },
      { field: 'is_active', width: 90, align: 'center' },
    ],
    sort: [{ field: 'category', order: 'asc' }, { field: 'name', order: 'asc' }],
    pagination: { pageSize: 50 },
  },
});
