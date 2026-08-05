// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Quote Views
 *
 *   • grid     — quote register with totals
 *   • kanban   — quote workflow grouped by status
 *   • calendar — quote-date calendar
 */
export const QuoteViews = defineView({
  list: {
    type: 'grid',
    name: 'all_quotes',
    label: 'All Quotes',
    data: { provider: 'object', object: 'crm_quote' },
    columns: [
      { field: 'quote_number', width: 140, link: true, pinned: 'left' },
      { field: 'crm_account', width: 200 },
      { field: 'crm_opportunity', width: 200 },
      { field: 'status', width: 130, sortable: true },
      { field: 'quote_date', width: 130, sortable: true },
      { field: 'expiration_date', width: 140, sortable: true },
      { field: 'subtotal', width: 130, align: 'right', summary: 'sum' },
      { field: 'discount', width: 110, align: 'right' },
      { field: 'tax', width: 110, align: 'right', summary: 'sum' },
      { field: 'total_price', width: 140, align: 'right', summary: 'sum' },
      { field: 'owner_id', width: 150 },
    ],
    sort: [{ field: 'quote_date', order: 'desc' }],
    pagination: { pageSize: 25 },
    selection: { type: 'multiple' },
    appearance: {
      allowedVisualizations: ['grid', 'kanban', 'calendar'],
    },
    tabs: [
      { name: 'all', label: 'All', view: 'all_quotes', isDefault: true, pinned: true },
      { name: 'pipeline', label: 'Pipeline', icon: 'columns-3', view: 'quote_pipeline' },
      { name: 'calendar', label: 'Calendar', icon: 'calendar', view: 'quote_calendar' },
    ],
  },

  listViews: {
    /** Quote workflow board */
    quote_pipeline: {
      name: 'quote_pipeline',
      type: 'kanban',
      label: 'Quote Pipeline',
      data: { provider: 'object', object: 'crm_quote' },
      columns: ['quote_number', 'crm_account', 'total_price', 'expiration_date'],
      kanban: {
        groupByField: 'status',
        summarizeField: 'total_price',
        columns: ['quote_number', 'crm_account', 'total_price', 'expiration_date'],
      },
    },

    /** Quote-date calendar */
    quote_calendar: {
      name: 'quote_calendar',
      type: 'calendar',
      label: 'Quote Calendar',
      data: { provider: 'object', object: 'crm_quote' },
      columns: ['quote_number', 'crm_account', 'total_price'],
      calendar: {
        startDateField: 'quote_date',
        endDateField: 'expiration_date',
        titleField: 'quote_number',
        colorField: 'status',
      },
    },
  },

  form: {
    type: 'tabbed',
    sections: [
      {
        label: 'Quote',
        columns: 2,
        // `name` is required on crm_quote with no default — omitting it made
        // quote creation through this form impossible.
        fields: [{ field: 'name', required: true, colSpan: 2 }, 'quote_number', 'crm_account', 'crm_contact', 'crm_opportunity', 'owner_id', 'status', 'quote_date', 'expiration_date'],
      },
      {
        label: 'Totals',
        columns: 2,
        fields: ['subtotal', 'discount', 'discount_amount', 'tax', 'shipping_handling', 'total_price'],
      },
      {
        label: 'Terms',
        columns: 2,
        fields: ['payment_terms', 'shipping_terms'],
      },
      {
        label: 'Addresses & Notes',
        columns: 1,
        fields: ['billing_address', 'shipping_address', 'internal_notes'],
      },
    ],
  },
});
