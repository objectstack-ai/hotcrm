// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineMapping } from '@objectstack/spec/data';

/**
 * Invoice import — finance's spreadsheet, an accounting package's export or
 * an ERP's (REQ-0007, plan *How figures come in*).
 *
 * Pass `mappingName: 'crm_invoice_import'` to
 * `POST /api/v1/data/crm_invoice/import/jobs`. The behaviour the app's own
 * mappings document holds here too (`src/sales/mappings/account_import.mapping.ts`):
 * a named mapping projects ONLY the columns below, and `mode` / `upsertKey`
 * are defaults a request may override.
 *
 * - **Upsert on `erp_ref`.** The invoice's key in finance's system, `unique`
 *   on the object: importing the same reference again updates that invoice
 *   rather than adding a second one. An ERP writing through REST batch upsert
 *   uses the same key.
 * - **References resolve by their titles.** `Contract` takes the contract
 *   number (`CTR-0001`, the contract's `nameField`), `Billing Milestone` the
 *   step's name; the import pipeline resolves a reference cell against the
 *   target's title, and a cell that matches nothing fails its row.
 * - **`source` is `import`** on every row, a constant — which also stamps
 *   Synced At (`../objects/_row-stamp.ts`). The account is stamped from the
 *   contract, so the sheet carries no account column.
 */
export const InvoiceImportMapping = defineMapping({
  name: 'crm_invoice_import',
  label: 'Invoice Import (CSV)',
  targetObject: 'crm_invoice',
  sourceFormat: 'csv',
  mode: 'upsert',
  upsertKey: ['erp_ref'],

  fieldMapping: [
    { source: 'ERP Reference', target: 'erp_ref' },
    { source: 'Invoice Number', target: 'invoice_number' },
    { source: 'Contract', target: 'crm_contract', transform: 'lookup' },
    { source: 'Billing Milestone', target: 'crm_billing_milestone', transform: 'lookup' },
    { source: 'Issue Date', target: 'issue_date' },
    { source: 'Due Date', target: 'due_date' },
    { source: 'Amount', target: 'amount' },
    {
      source: 'Status',
      target: 'status',
      transform: 'map',
      params: { valueMap: { Issued: 'issued', Cancelled: 'cancelled', Canceled: 'cancelled', Credited: 'cancelled' } },
    },
    { source: 'Source', target: 'source', transform: 'constant', params: { value: 'import' } },
  ],
});
