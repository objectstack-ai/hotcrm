// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { Field, type ObjectExtension } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';
import { leftOver, outstanding, planned, receivables } from './contract-account.extension';

/**
 * The order's Order to Cash figures (REQ-0010 rule 5, hotcrm#2560): what is
 * planned, invoiced and received against this order, on the order's page, as
 * the contract's page shows them. Added from the module through
 * `objectExtensions` (ADR-0130 D5), as the order plan says of every field
 * another package contributes (`docs/architecture/sales-order-plan.md`,
 * *Fields other packages contribute*): a tenant that disables the module is
 * served none of them, and the order still works.
 *
 * The same definitions as the contract's, built by the same factories
 * (`./contract-account.extension.ts`): one hop over the rows that name the
 * order through their optional `crm_sales_order` lookup. *Invoiced* counts
 * issued invoices only. *Unpaid* and *Uninvoiced* (the 2026-11-26 ruling,
 * hotcrm#2806) are the order's Total Price less Received, and less Invoiced,
 * never below 0, stored so the account can total them.
 *
 * *Payment Plan Differs* is the notice the ruling asks for when the order's
 * amount changes and the plan is not updated by itself
 * (`../flows/sales-order-amount-plan-step.flow.ts` updates a lone step that
 * has received nothing): it shows, read-only, while the order has a plan and
 * the plan's total is not the order's Total Price. A formula, computed on
 * read, so it follows both sides with no write of its own.
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
/**
 * Confirming again may not take the order's total below what it has already
 * invoiced or received (hotcrm#2827). Since hotcrm#2826 an order's amount
 * changes only while it is Draft, so a lowered total reaches Confirmed only
 * through this move; let through, Unpaid or Uninvoiced would sit at 0 over a
 * real overpayment and the payment plan would no longer add up.
 *
 * A transition gate (AGENTS.md rule 7): only the status move Draft →
 * Confirmed is judged, so an order already Confirmed, or one confirmed for the
 * first time (nothing invoiced or received yet), is untouched, and an order
 * that was confirmed below its figures before this rule keeps its status.
 * Judged on the status field until the Confirm button (hotcrm#2716) ships.
 *
 * The figures are this module's own summary fields, stored on the order, so
 * the rule reads them in its `{...previous, ...data}` record and lives here:
 * the sales package does not import this module, and a hook of this module
 * on the order is refused by ADR-0130 R4. A tenant without the module has
 * neither the figures nor the rule.
 *
 * Two rules, so the refusal says which figure is above the total. Each is
 * `cross_field` on Total Price, the field to change. The messages are fixed
 * text: 18.6.0 interpolates no record values into a rule's message, so they
 * name the fields the order's page shows beside each other, not the amounts.
 */
const confirmedBelow = (figure: 'invoiced_amount' | 'received_amount') => ({
  // Built from parts, so spelled as the expression object `P` compiles to
  // (`P` would quote an interpolated string as a CEL string literal).
  dialect: 'cel' as const,
  source: `previous != null && has(previous.status) && previous.status == "draft"
    && has(record.status) && record.status == "confirmed"
    && has(record.${figure}) && record.${figure} != null
    && double(record.${figure}) > (has(record.total_price) && record.total_price != null ? double(record.total_price) : 0.0)`,
});

export const SalesOrderExtensions = [
  {
    extend: 'crm_sales_order',
    validations: [
      {
        name: 'reconfirm_total_below_received',
        type: 'cross_field',
        severity: 'error',
        events: ['update'],
        fields: ['total_price', 'received_amount'],
        message:
          "This order's Total Price is below what was already received (Received). Deal with the overpayment or the invoices first, then confirm.",
        condition: confirmedBelow('received_amount'),
      },
      {
        name: 'reconfirm_total_below_invoiced',
        type: 'cross_field',
        severity: 'error',
        events: ['update'],
        fields: ['total_price', 'invoiced_amount'],
        message:
          "This order's Total Price is below what was already invoiced (Invoiced). Cancel or correct the invoices first, then confirm.",
        condition: confirmedBelow('invoiced_amount'),
      },
    ] satisfies ObjectExtension['validations'],
    fields: (() => {
      return {
        ...planned('crm_sales_order', 'pricing'),
        ...receivables('crm_sales_order', 'pricing'),
        ...outstanding('pricing', {
          unpaid: leftOver('total_price', 'received_amount'),
          uninvoiced: leftOver('total_price', 'invoiced_amount'),
        }),
        plan_differs: Field.formula({
          label: 'Payment Plan Differs',
          group: 'pricing',
          returnType: 'boolean',
          // True, or empty: an empty value draws nothing on the page.
          expression: F`has(record.planned_amount) && record.planned_amount != null && double(record.planned_amount) > 0.0
            && double(record.planned_amount) != (has(record.total_price) && record.total_price != null ? double(record.total_price) : 0.0)
            ? true : null`,
          visibleWhen: P`has(record.planned_amount) && record.planned_amount != null && double(record.planned_amount) > 0.0
            && double(record.planned_amount) != (has(record.total_price) && record.total_price != null ? double(record.total_price) : 0.0)`,
          description: "The payment plan's total is not the order's Total Price. Edit, split or add plan steps so the plan adds up to the order.",
        }),
      };
    })(),
  },
];
