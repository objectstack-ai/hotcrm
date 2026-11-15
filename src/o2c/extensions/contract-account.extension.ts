// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { Field } from '@objectstack/spec/data';

/**
 * The contract's and the account's receivables figures (REQ-0007, plan
 * *Contract and account fields*, #2416): what sales sees on the two pages
 * without opening the module's lists. Added from the module through
 * `objectExtensions` (ADR-0130 D5), so they come and go with it: a tenant that
 * disables the package is served none of them (measured on 18.4.0,
 * objectstack#30304).
 *
 * Every figure is one hop over the module's own rows, never a summary of a
 * summary: the contract's over its master-detail children, the account's over
 * the invoices and payments stamped with it (`*_row_stamp`). *Invoiced* counts
 * issued invoices only, as the plan step's does. The balance sums the stored
 * `open_amount` of the issued invoices (Q2 ruled B on 2026-11-15), not
 * invoiced minus received: a payment held as an advance, not yet set against
 * an invoice, shows in *Received* and leaves the balance alone, so the balance
 * never goes below zero on an advance. `open_amount` is a plain column the
 * invoice hook writes, recomputed when a payment moves `paid_amount`.
 *
 * Placement (plan decision 6, ruled C on 2026-11-15, superseding A): each
 * figure names a section the core object already declares, `value` (Contract
 * Value) on the contract and `financials` on the account. An extension cannot
 * contribute `fieldGroups` of its own (`ObjectExtensionSchema`, 18.4.0), but a
 * field may name an existing group key, and the console renders it inside that
 * section (measured on 18.4.0). `crm_contract` and `crm_account` are unchanged.
 *
 * Who reads them is the app package's permission sets (the 2026-11-05 ruling):
 * every member reads, nobody edits — they are computed.
 */
const receivables = (relationshipField: string, group: string) => ({
  invoiced_amount: Field.summary({
    label: 'Invoiced',
    description: 'The issued invoices, summed. A cancelled invoice is not counted.',
    group,
    scale: 2,
    readonly: true,
    summaryOperations: {
      object: 'crm_invoice',
      field: 'amount',
      function: 'sum',
      relationshipField,
      filter: { status: 'issued' },
    },
  }),
  received_amount: Field.summary({
    label: 'Received',
    description: 'The payments received, summed.',
    group,
    scale: 2,
    readonly: true,
    summaryOperations: {
      object: 'crm_payment',
      field: 'amount',
      function: 'sum',
      relationshipField,
    },
  }),
  receivable_balance: Field.summary({
    label: 'Receivable Balance',
    description: 'What the customer still owes on the open invoices: the open amount of the issued invoices, summed. A payment not yet set against an invoice shows in Received only.',
    group,
    scale: 2,
    readonly: true,
    summaryOperations: {
      object: 'crm_invoice',
      field: 'open_amount',
      function: 'sum',
      relationshipField,
      filter: { status: 'issued' },
    },
  }),
});

export const ContractAccountExtensions = [
  {
    extend: 'crm_contract',
    fields: {
      planned_amount: Field.summary({
        label: 'Planned',
        description: 'The collection plan, summed: what the steps expect to collect.',
        group: 'value',
        scale: 2,
        readonly: true,
        summaryOperations: {
          object: 'crm_billing_milestone',
          field: 'planned_amount',
          function: 'sum',
          relationshipField: 'crm_contract',
        },
      }),
      ...receivables('crm_contract', 'value'),
    },
  },
  {
    extend: 'crm_account',
    fields: receivables('crm_account', 'financials'),
  },
];
