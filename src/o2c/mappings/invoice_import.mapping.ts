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
 * - **References resolve by their titles.** `Account` takes the account's
 *   name, `Contract` the contract number (`CTR-0001`, unique, which the
 *   pipeline also tries, as for `Order` below) or the contract's name (its
 *   `nameField` since hotcrm#2746; names may repeat, so the number is the
 *   safe spelling); the import pipeline
 *   resolves a reference cell against the target's title, and a cell that
 *   matches nothing fails its row. `Order` (hotcrm#2560) takes the order
 *   number (`SO-0001`) or the order's External Reference: the pipeline also
 *   tries the target's unique fields, and both are unique (an autonumber
 *   counts as one), so either spelling of the same order resolves.
 * - **The account is what an invoice belongs to** (hotcrm#2557). A row names
 *   it, or names an order or a contract and the account is filled
 *   from it (`../objects/_row-stamp.ts`); a row naming an account is refused
 *   when the order or the contract is another account's, and a row naming an
 *   order and a different contract than the order's is refused. A row naming
 *   none of them fails: the account is required.
 * - **No `Billing Milestone` column** (the 2026-11-26 ruling, hotcrm#2806):
 *   an invoice hangs on no plan step. A file that still carries the column
 *   imports with it ignored (a named mapping projects only the columns below).
 * - **`source` is `import`** on every row, a constant — which also stamps
 *   Synced At (`../objects/_row-stamp.ts`).
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
    { source: 'Account', target: 'crm_account', transform: 'lookup' },
    { source: 'Order', target: 'crm_sales_order', transform: 'lookup' },
    { source: 'Contract', target: 'crm_contract', transform: 'lookup' },
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
