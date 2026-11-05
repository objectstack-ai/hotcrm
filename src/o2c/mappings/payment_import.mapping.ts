// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineMapping } from '@objectstack/spec/data';

/**
 * Payment import — receipts from finance's system (REQ-0007, plan *How
 * figures come in*). The same shape as `./invoice_import.mapping.ts`: upsert
 * on `erp_ref`, references resolved by their titles (`Invoice` takes the
 * invoice number, `Contract` the contract number), `source` written as the
 * constant `import`. A receipt that pays several invoices is one row per
 * invoice, each with its own reference.
 */
export const PaymentImportMapping = defineMapping({
  name: 'crm_payment_import',
  label: 'Payment Import (CSV)',
  targetObject: 'crm_payment',
  sourceFormat: 'csv',
  mode: 'upsert',
  upsertKey: ['erp_ref'],

  fieldMapping: [
    { source: 'ERP Reference', target: 'erp_ref' },
    { source: 'Contract', target: 'crm_contract', transform: 'lookup' },
    { source: 'Invoice', target: 'crm_invoice', transform: 'lookup' },
    { source: 'Billing Milestone', target: 'crm_billing_milestone', transform: 'lookup' },
    { source: 'Payment Date', target: 'payment_date' },
    { source: 'Amount', target: 'amount' },
    {
      source: 'Method',
      target: 'method',
      transform: 'map',
      params: { valueMap: { 'Bank Transfer': 'bank_transfer', Wire: 'bank_transfer', Bill: 'bill', Other: 'other' } },
    },
    { source: 'Bill Maturity Date', target: 'bill_maturity_date' },
    { source: 'Source', target: 'source', transform: 'constant', params: { value: 'import' } },
  ],
});
