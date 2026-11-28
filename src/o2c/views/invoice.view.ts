// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Invoice Views
 *
 *   • grid — every invoice the reader can see, newest first.
 *
 * Invoices and payments run in parallel (the 2026-11-26 ruling, hotcrm#2806):
 * an invoice is not set against payments, so it shows no paid or open amount,
 * and overdue is measured on the payment plan (the Overdue Payment Plans view,
 * `./billing_milestone.view.ts`), which replaced Overdue Invoices.
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
      { field: 'crm_sales_order', width: 200 },
      { field: 'crm_contract', width: 130 },
      { field: 'issue_date', width: 120, sortable: true },
      { field: 'due_date', width: 120, sortable: true },
      // No total on Amount: it would count cancelled invoices (hotcrm#2463).
      // The order's, the contract's and the account's Invoiced count the
      // issued ones.
      { field: 'amount', width: 140, align: 'right' },
      { field: 'status', width: 110 },
    ],
    sort: [{ field: 'issue_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },
});
