// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineMapping } from '@objectstack/spec/data';

/**
 * Payment import — receipts from finance's system (REQ-0007, plan *How
 * figures come in*). The same shape as `./invoice_import.mapping.ts`: upsert
 * on `erp_ref`, references resolved by their titles (`Account` takes the
 * account's name, `Contract` the contract number, `Order` the order number or
 * the order's External Reference, hotcrm#2560, `Billing Milestone` the plan
 * step's name), `source` written as the constant `import`. The account is
 * required and is filled from the order or the contract, else from the step,
 * when the row leaves it empty (hotcrm#2557); a deposit that matches no order
 * names the account alone.
 *
 * No `Invoice` column (the 2026-11-26 ruling, hotcrm#2806): invoices and
 * payments run in parallel, and a payment names no invoice. One receipt
 * split across two orders is two rows, and each needs its own `erp_ref`,
 * which is unique: agree the reference rule with the integrator (for example
 * the receipt's key plus the order number).
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
    { source: 'Account', target: 'crm_account', transform: 'lookup' },
    { source: 'Order', target: 'crm_sales_order', transform: 'lookup' },
    { source: 'Contract', target: 'crm_contract', transform: 'lookup' },
    { source: 'Billing Milestone', target: 'crm_billing_milestone', transform: 'lookup' },
    { source: 'Payment Date', target: 'payment_date' },
    { source: 'Amount', target: 'amount' },
    {
      source: 'Method',
      target: 'method',
      transform: 'map',
      params: { valueMap: { 'Bank Transfer': 'bank_transfer', Wire: 'bank_transfer', Other: 'other' } },
    },
    { source: 'Source', target: 'source', transform: 'constant', params: { value: 'import' } },
  ],
});
