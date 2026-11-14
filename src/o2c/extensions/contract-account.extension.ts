// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { Field } from '@objectstack/spec/data';
import { F } from '@objectstack/spec';

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
 * issued invoices only, as the plan step's does; the balance is invoiced minus
 * received, a formula, so it is read and never filtered.
 *
 * Placement (plan decision 6, ruled A on 2026-11-14): no group. An extension
 * cannot contribute `fieldGroups` (`ObjectExtensionSchema`, 18.4.0), and the
 * maintainer ruled the default placement over a group declared on
 * `crm_contract`, so the core object is unchanged.
 *
 * Who reads them is the app package's permission sets (the 2026-11-05 ruling):
 * every member reads, nobody edits — they are computed.
 */
const receivables = (relationshipField: string) => ({
  invoiced_amount: Field.summary({
    label: 'Invoiced',
    description: 'The issued invoices, summed. A cancelled invoice is not counted.',
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
    scale: 2,
    readonly: true,
    summaryOperations: {
      object: 'crm_payment',
      field: 'amount',
      function: 'sum',
      relationshipField,
    },
  }),
  receivable_balance: Field.formula({
    label: 'Receivable Balance',
    description: 'Invoiced minus received: what the customer still owes on the invoices issued.',
    returnType: 'currency',
    expression: F`coalesce(record.invoiced_amount, 0) - coalesce(record.received_amount, 0)`,
    scale: 2,
  }),
});

export const ContractAccountExtensions = [
  {
    extend: 'crm_contract',
    fields: {
      planned_amount: Field.summary({
        label: 'Planned',
        description: 'The collection plan, summed: what the steps expect to collect.',
        scale: 2,
        readonly: true,
        summaryOperations: {
          object: 'crm_billing_milestone',
          field: 'planned_amount',
          function: 'sum',
          relationshipField: 'crm_contract',
        },
      }),
      ...receivables('crm_contract'),
    },
  },
  {
    extend: 'crm_account',
    fields: receivables('crm_account'),
  },
];
