// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { Field } from '@objectstack/spec/data';
import { expression, type EvaluatedExpression } from '@objectstack/spec';

/**
 * The contract's and the account's Order to Cash figures (REQ-0007, plan
 * *Contract and account fields*, #2416; the 2026-11-26 ruling, hotcrm#2806):
 * what sales sees on the two pages without opening the module's lists. Added
 * from the module through `objectExtensions` (ADR-0130 D5), so they come and
 * go with it: a tenant that disables the package is served none of them
 * (measured on 18.4.0, objectstack#30304).
 *
 * *Invoiced* and *Received* are one hop over the module's own rows: the
 * account's over its master-detail children, the contract's (and the
 * order's, `./sales-order.extension.ts`) over the rows that name it through
 * their optional lookup. *Invoiced* counts issued invoices only. Invoices and
 * payments run in parallel (the 2026-11-26 ruling): neither is set against
 * the other, and each is summed on its own.
 *
 * *Unpaid* and *Uninvoiced* replace the Receivable Balance (the 2026-11-26
 * ruling, superseding the 2026-11-15 ruling B that summed the invoices' open
 * amounts). On the order and the contract each is the row's own amount (on
 * a contract with orders, what was ordered under it: `CONTRACT_BASE`) less
 * what was received, or invoiced, never below 0 (`max`), STORED: the engine
 * computes the expression on every write of the row, the summary recompute
 * that moves Received or Invoiced included, so the account can total it (a
 * `formula` stores nothing and cannot be totalled). The account sums each
 * deal's own figure (`accountOutstanding` below), so a deal paid above its
 * amount does not hide what another deal still owes.
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
export const receivables = (relationshipField: string, group: string) => ({
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
});

/**
 * Unpaid and Uninvoiced on a row that has an amount of its own (the order's
 * Total Price, the contract's Contract Value): that amount less Received, and
 * less Invoiced, never below 0. Stored computed fields (a non-`formula` field
 * with an `expression`), read from the row's own columns only, so nothing
 * across records goes stale: Received and Invoiced are this row's summaries,
 * and the recompute that moves them writes this row.
 */
export const outstanding = (
  group: string,
  amount: { unpaid: EvaluatedExpression; uninvoiced: EvaluatedExpression },
  base = 'The amount',
) => ({
  unpaid_amount: Field.currency({
    label: 'Unpaid',
    description: `${base} less what was received, never below 0.`,
    group,
    readonly: true,
    expression: amount.unpaid,
  }),
  uninvoiced_amount: Field.currency({
    label: 'Uninvoiced',
    description: `${base} less what was invoiced (issued invoices), never below 0.`,
    group,
    readonly: true,
    expression: amount.uninvoiced,
  }),
});

/** The collection plan, summed, over the steps that name the row through `relationshipField`. */
export const planned = (relationshipField: string, group: string) => ({
  planned_amount: Field.summary({
    label: 'Planned',
    description: 'The collection plan, summed: what the steps expect to collect.',
    group,
    scale: 2,
    readonly: true,
    summaryOperations: {
      object: 'crm_billing_milestone',
      field: 'planned_amount',
      function: 'sum',
      relationshipField,
    },
  }),
});

/** A number field of the row, or 0.0 when it holds none. */
const amountOf = (field: string): string =>
  `(has(record.${field}) && record.${field} != null ? double(record.${field}) : 0.0)`;

/** `max(0, amount − figure)` over the row's own columns; `amount` is a field name or a CEL number expression. */
export const leftOver = (amount: string, figure: string): EvaluatedExpression =>
  expression(`max(0.0, ${/^[a-z_]+$/.test(amount) ? amountOf(amount) : amount} - ${amountOf(figure)})`);

/**
 * The contract's base for Unpaid and Uninvoiced (the maintainer's ruling of
 * 2026-11-27 on hotcrm#2806): a contract that has confirmed or completed
 * orders owes what was ordered under it, its Order Amount (`order_amount`,
 * the sales package's roll-up of those orders' totals, hotcrm#2804/#2807),
 * not its Contract Value, which on a framework contract is a ceiling. A
 * contract with none keeps its Contract Value; Draft and Cancelled orders
 * count nowhere. `order_count` empty (a row stored before the upgrade) reads
 * as none, as on the account.
 */
const CONTRACT_BASE =
  `((has(record.order_count) && record.order_count != null && double(record.order_count) > 0.0) ? ${amountOf('order_amount')} : ${amountOf('contract_value')})`;

/** The sum of the row's own number fields. */
const sumOf = (...fields: string[]): EvaluatedExpression => expression(fields.map(amountOf).join(' + '));

/**
 * Which deals the account sums (the 2026-11-26 ruling: "the account sums each
 * order's or contract's own figure"). Each deal is counted once, by the row
 * that carries it:
 *
 *   - its **order**, when the order is Confirmed or Completed — a Draft order
 *     is not yet owed and a Cancelled one never will be. The order is the
 *     spine (REQ-0010): an order contract's amount is its order's, and a
 *     framework contract's amount is a ceiling, not what is owed, so a deal
 *     with an order is counted on the order and never on its contract too;
 *   - its **contract**, only when no confirmed or completed order names the
 *     contract (a contract signed before orders, hotcrm#2560, or one whose
 *     orders are all Draft or Cancelled) and it is Activated or Expired —
 *     signed, not withdrawn.
 *
 * The account cannot total two objects in one summary, so each figure is two
 * hidden summaries, one per object, and the shown field is their sum, stored
 * like the order's and the contract's. The summary recompute writes each
 * hidden one onto the account, and that write computes the sum.
 */
const COUNTED_ORDER = { status: { $in: ['confirmed', 'completed'] } };
// `order_count` empty reads as none: a contract stored before the upgrade
// holds no count until `os migrate summary-nulls` fills it (the changeset).
const COUNTED_CONTRACT = { status: { $in: ['activated', 'expired'] }, $or: [{ order_count: 0 }, { order_count: null }] };

const accountLeg = (label: string, object: 'crm_sales_order' | 'crm_contract', field: string, filter: Record<string, unknown>) =>
  Field.summary({
    label,
    group: 'financials',
    hidden: true,
    scale: 2,
    readonly: true,
    summaryOperations: { object, field, function: 'sum', relationshipField: 'crm_account', filter },
  });

export const accountOutstanding = {
  unpaid_on_orders: accountLeg('Unpaid on Orders', 'crm_sales_order', 'unpaid_amount', COUNTED_ORDER),
  unpaid_on_contracts: accountLeg('Unpaid on Contracts', 'crm_contract', 'unpaid_amount', COUNTED_CONTRACT),
  uninvoiced_on_orders: accountLeg('Uninvoiced on Orders', 'crm_sales_order', 'uninvoiced_amount', COUNTED_ORDER),
  uninvoiced_on_contracts: accountLeg('Uninvoiced on Contracts', 'crm_contract', 'uninvoiced_amount', COUNTED_CONTRACT),
  unpaid_amount: Field.currency({
    label: 'Unpaid',
    description: "What the account's confirmed and completed orders, and its signed contracts with no order, still have to receive: each one's amount less what it received, never below 0, summed.",
    group: 'financials',
    readonly: true,
    expression: sumOf('unpaid_on_orders', 'unpaid_on_contracts'),
  }),
  uninvoiced_amount: Field.currency({
    label: 'Uninvoiced',
    description: "What the account's confirmed and completed orders, and its signed contracts with no order, still have to invoice: each one's amount less its issued invoices, never below 0, summed.",
    group: 'financials',
    readonly: true,
    expression: sumOf('uninvoiced_on_orders', 'uninvoiced_on_contracts'),
  }),
};

export const ContractAccountExtensions = [
  {
    extend: 'crm_contract',
    fields: {
      ...planned('crm_contract', 'value'),
      ...receivables('crm_contract', 'value'),
      // Invoiced and Received already count what was recorded on the
      // contract's orders: `_row-stamp.ts` gives every invoice and payment
      // that names an order the order's contract (form, import and API alike),
      // and `sales_order_contract_fill` passes a contract set on the order
      // later to its rows. Each row is one row, so nothing counts twice.
      ...outstanding('value', {
        unpaid: leftOver(CONTRACT_BASE, 'received_amount'),
        uninvoiced: leftOver(CONTRACT_BASE, 'invoiced_amount'),
      }, 'The Order Amount when the contract has orders, else the Contract Value,'),
      // How many confirmed or completed orders name the contract, the set its
      // Order Amount counts (hotcrm#2806): a contract with one owes what was
      // ordered and is counted on the account through its orders
      // (`accountOutstanding`), never itself. A contract whose orders are all
      // Draft or Cancelled keeps its Contract Value and counts on the account
      // itself, once it is signed.
      order_count: Field.summary({
        label: 'Orders',
        group: 'value',
        hidden: true,
        readonly: true,
        summaryOperations: {
          object: 'crm_sales_order', function: 'count', relationshipField: 'crm_contract',
          filter: { status: { $in: ['confirmed', 'completed'] } },
        },
      }),
    },
  },
  {
    extend: 'crm_account',
    fields: {
      ...receivables('crm_account', 'financials'),
      ...accountOutstanding,
    },
  },
];
