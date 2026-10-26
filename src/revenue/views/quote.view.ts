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
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_quote' },
    // Eight columns sized to fit a 1440 px screen with the sidebar open
    // (#2292): eleven ran 1580 px wide and cut the discount at the edge.
    // `quote_date` still orders the list and opens the calendar; it, the
    // subtotal and the tax are on the record page, and the total carries them.
    columns: [
      { field: 'quote_number', width: 120, link: true, pinned: 'left' },
      { field: 'crm_account', width: 200 },
      { field: 'crm_opportunity', width: 190 },
      { field: 'status', width: 100, sortable: true },
      { field: 'expiration_date', width: 110, sortable: true },
      { field: 'discount', width: 100, align: 'right' },
      { field: 'total_price', width: 130, align: 'right', summary: 'sum' },
      { field: 'owner_id', width: 120 },
    ],
    sort: [{ field: 'quote_date', order: 'desc' }],
    pagination: { pageSize: 25 },
    selection: { type: 'multiple' },
    appearance: {
      allowedVisualizations: ['grid', 'kanban', 'calendar'],
    },
    // Binds the 'calendar' entry above: the same span the dedicated
    // `quote_calendar` view shows. `quote_date` and `expiration_date` are both
    // required + notNull on crm_quote, so every quote lands on a real window.
    calendar: {
      startDateField: 'quote_date',
      endDateField: 'expiration_date',
      titleField: 'quote_number',
      colorField: 'status',
    },
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
        name: 'quote',
        label: 'Quote',
        columns: 2,
        // `name` is required on crm_quote with no default — omitting it made
        // quote creation through this form impossible.
        fields: [{ field: 'name', required: true, span: 'full' }, 'quote_number', 'crm_account', 'crm_contact', 'crm_opportunity', 'owner_id', 'status', 'quote_date', 'expiration_date'],
      },
      {
        name: 'totals',
        label: 'Totals',
        columns: 2,
        fields: ['subtotal', 'discount', 'discount_amount', 'tax', 'shipping_handling', 'total_price'],
      },
      {
        // Named `quote_terms`, not `terms` — `terms` is already a distinct
        // fieldGroup key on `crm_quote` ("Terms & Validity"), and reusing it
        // here would make this section's translated heading follow that
        // group's wording instead of its own "Terms".
        name: 'quote_terms',
        label: 'Terms',
        columns: 2,
        fields: ['payment_terms', 'shipping_terms'],
      },
      {
        name: 'addresses_and_notes',
        label: 'Addresses & Notes',
        columns: 1,
        fields: ['billing_address', 'shipping_address', 'internal_notes'],
      },
    ],
  },
});
