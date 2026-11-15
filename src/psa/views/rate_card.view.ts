// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Rate Card views. The cost rate column is listed for those who may read it;
 * a project member's grid drops it (field-level security).
 */
export const RateCardViews = defineView({
  list: {
    type: 'grid',
    name: 'all_rate_cards',
    label: 'All Rate Cards',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_rate_card' },
    columns: [
      { field: 'name', width: 220, link: true, pinned: 'left' },
      { field: 'seniority', width: 140 },
      { field: 'unit', width: 110 },
      { field: 'cost_rate', width: 130, align: 'right' },
      { field: 'bill_rate', width: 130, align: 'right' },
      { field: 'is_internal', width: 100, align: 'center' },
      { field: 'effective_from', width: 130 },
      { field: 'effective_to', width: 130 },
    ],
    sort: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 50 },
  },
});
