// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Sales Order Views (hotcrm#2555)
 *
 *   • grid   — the order register with totals
 *   • kanban — orders grouped by status
 *   • grid   — confirmed orders not yet fully shipped
 *
 * No `form`: the create dialog and the record page are derived from the
 * object's `fieldGroups` (AGENTS.md, layout is derived by default).
 */
export const SalesOrderViews = defineView({
  list: {
    type: 'grid',
    name: 'all_sales_orders',
    label: 'All Orders',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_sales_order' },
    // Eight columns, the quote register's width budget (#2292).
    columns: [
      { field: 'order_number', width: 120, link: true, pinned: 'left' },
      { field: 'name', width: 200 },
      { field: 'crm_account', width: 200 },
      { field: 'status', width: 110, sortable: true },
      { field: 'order_date', width: 110, sortable: true },
      { field: 'fulfillment_status', width: 140 },
      { field: 'total_price', width: 130, align: 'right', summary: 'sum' },
      { field: 'owner_id', width: 120 },
    ],
    sort: [{ field: 'order_date', order: 'desc' }],
    pagination: { pageSize: 25 },
    selection: { type: 'multiple' },
    appearance: {
      allowedVisualizations: ['grid', 'kanban'],
    },
    kanban: {
      groupByField: 'status',
      summarizeField: 'total_price',
      columns: ['order_number', 'crm_account', 'total_price', 'order_date'],
    },
  },

  listViews: {
    /** Orders by status */
    order_board: {
      name: 'order_board',
      type: 'kanban',
      label: 'Order Board',
      data: { provider: 'object', object: 'crm_sales_order' },
      columns: ['order_number', 'crm_account', 'total_price', 'order_date'],
      kanban: {
        groupByField: 'status',
        summarizeField: 'total_price',
        columns: ['order_number', 'crm_account', 'total_price', 'order_date'],
      },
    },

    /** Confirmed orders still to ship, oldest first */
    orders_to_ship: {
      name: 'orders_to_ship',
      type: 'grid',
      label: 'To Ship',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_sales_order' },
      columns: ['order_number', 'name', 'crm_account', 'order_date', 'fulfillment_status', 'total_price'],
      filter: [
        { field: 'status', operator: 'equals', value: 'confirmed' },
        { field: 'fulfillment_status', operator: 'not_equals', value: 'shipped' },
      ],
      sort: [{ field: 'order_date', order: 'asc' }],
    },
  },
});
