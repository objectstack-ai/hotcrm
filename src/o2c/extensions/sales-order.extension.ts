// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { planned, receivables } from './contract-account.extension';

/**
 * The order's Order to Cash figures (REQ-0010 rule 5, hotcrm#2560): what is
 * planned, invoiced and received against this order, on the order's page, as
 * the contract's page shows them. Added from the module through
 * `objectExtensions` (ADR-0130 D5), as the order plan says of every field
 * another package contributes (`docs/architecture/sales-order-plan.md`,
 * *Fields other packages contribute*): a tenant that disables the module is
 * served none of them, and the order still works.
 *
 * The same definitions as the contract's, built by the same two factories
 * (`./contract-account.extension.ts`): one hop over the rows that name the
 * order through their optional `crm_sales_order` lookup. *Invoiced* counts
 * issued invoices only. The card names three figures, the contract's
 * Receivable Balance is not among them, and it is not added here.
 *
 * Nothing is counted twice: a row under an order under a framework contract
 * names both (`../objects/_row-stamp.ts` takes the order's contract), so the
 * order's page counts it once and the contract's page, which totals all its
 * orders, counts it once. Deal performance counts orders and never these
 * figures (the plan's premise).
 *
 * Placement: an extension cannot contribute `fieldGroups` of its own, but a
 * field may name a section the core object declares (plan decision 6, ruled C
 * on 2026-11-15, on the contract and the account); here the order's
 * `pricing` section, beside the order's own total. `crm_sales_order` is
 * unchanged.
 *
 * Who reads them: whoever reads the order. Every permission set that reads
 * orders also reads plan steps, invoices and payments (counted at hotcrm#2560),
 * so no reader sums rows it cannot read; the app package's sets name no row
 * for these fields, as `project_manager` and `finance_controller` name none for
 * the contract's.
 */
export const SalesOrderExtensions = [
  {
    extend: 'crm_sales_order',
    fields: (() => {
      const { invoiced_amount, received_amount } = receivables('crm_sales_order', 'pricing');
      return {
        ...planned('crm_sales_order', 'pricing'),
        invoiced_amount,
        received_amount,
      };
    })(),
  },
];
