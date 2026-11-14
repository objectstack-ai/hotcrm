// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Invoice Views
 *
 *   • grid — every invoice the reader can see, newest first, with what is
 *     paid and what is open.
 *   • Overdue Invoices — the rep's view (plan *The data model*): issued
 *     invoices past their due date with money still open. `{today}` resolves
 *     on the read path (measured for this view on 18.3.0, #2315). `open_amount`
 *     is a STORED column for this filter's sake (see the field): a formula
 *     cannot be filtered.
 *
 * No form is authored: the form and the record page derive from the object's
 * `fieldGroups`. Finance enters invoices on that form or imports them
 * (`../mappings/invoice_import.mapping.ts`).
 */
export const InvoiceViews = defineView({
  list: {
    type: 'grid',
    name: 'all_invoices',
    label: 'All Invoices',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_invoice' },
    columns: [
      { field: 'invoice_number', width: 150, link: true, pinned: 'left' },
      { field: 'crm_account', width: 200 },
      { field: 'crm_contract', width: 130 },
      { field: 'issue_date', width: 120, sortable: true },
      { field: 'due_date', width: 120, sortable: true },
      { field: 'amount', width: 140, align: 'right', summary: 'sum' },
      { field: 'paid_amount', width: 130, align: 'right', summary: 'sum' },
      { field: 'open_amount', width: 130, align: 'right', summary: 'sum' },
      { field: 'status', width: 110 },
    ],
    sort: [{ field: 'issue_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    /** Issued, past due, not fully paid — oldest due first. */
    overdue_invoices: {
      name: 'overdue_invoices',
      type: 'grid',
      label: 'Overdue Invoices',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_invoice' },
      columns: ['invoice_number', 'crm_account', 'crm_contract', 'due_date', 'amount', 'paid_amount', 'open_amount'],
      filter: [
        { field: 'status', operator: 'equals', value: 'issued' },
        { field: 'due_date', operator: 'less_than', value: '{today}' },
        { field: 'open_amount', operator: 'greater_than', value: 0 },
      ],
      sort: [{ field: 'due_date', order: 'asc' }],
    },
  },
});
