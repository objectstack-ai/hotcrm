// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Payment Views
 *
 *   • grid — every payment the reader can see, newest first.
 *
 * No form is authored: the form and the record page derive from the object's
 * `fieldGroups`. Finance enters payments there or imports them
 * (`../mappings/payment_import.mapping.ts`).
 */
export const PaymentViews = defineView({
  list: {
    type: 'grid',
    name: 'all_payments',
    label: 'All Payments',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_payment' },
    columns: [
      { field: 'payment_number', width: 130, link: true, pinned: 'left' },
      { field: 'crm_account', width: 200 },
      { field: 'crm_contract', width: 130 },
      { field: 'crm_invoice', width: 150 },
      { field: 'payment_date', width: 120, sortable: true },
      { field: 'amount', width: 140, align: 'right', summary: 'sum' },
      { field: 'method', width: 130 },
    ],
    sort: [{ field: 'payment_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },
});
