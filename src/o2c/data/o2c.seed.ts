// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Order to Cash seeds (hotcrm#2529): a collection plan, its invoices and the
 * payments against them, on the demo story's two signed contracts, so the
 * module's lists, the Overdue Invoices view and the contract's and account's
 * receivables read something on a fresh demo.
 *
 * The story, by contract (`src/sales/data/contract.seed.ts`):
 *
 *   - Initech Solutions, the EXPIRED quarterly service agreement (60,000, Net
 *     30): four quarterly steps of 15,000, each invoiced on its planned day.
 *     Q1 and Q2 are paid in full; Q3 is paid 9,000 of 15,000; Q4 is not paid.
 *     Both Q3 and Q4 are past due, so Overdue Invoices lists two rows and the
 *     account's Receivable Balance reads 21,000.
 *   - Acme Corporation, the one ACTIVATED contract (220,000 a year, Net 30,
 *     off the won `Acme Annual Renewal 2025`): the year-one step, planned and
 *     invoiced today, nothing paid yet and not due for 30 days, so the
 *     Receivable Balance reads 220,000 and the step shows in Planned This
 *     Month whatever the calendar.
 *
 * And by order (`src/sales/data/sales_order.seed.ts`, hotcrm#2560):
 *
 *   - Globex Industries' Seat Expansion Order, a product sale with no
 *     contract (22,464, Net 60 on the order): two steps of 11,232, one on
 *     order and one on delivery, the plan hanging on the order because there
 *     is no contract. The first is invoiced, its due date taken from the
 *     order's terms (no contract to read), and paid in full; the payment
 *     names only its invoice and takes the invoice's order and step. The
 *     order's page reads Planned 22,464, Invoiced 11,232 and Received
 *     11,232, and Globex's account the same Invoiced and Received.
 *
 * Wayne's contract is still in approval and Stark's is a draft, so neither is
 * billed. Wayne has paid a 10,000 deposit all the same: it matches no invoice
 * and no plan step yet, so it is recorded against the account alone (the rows
 * belong to the account, hotcrm#2557). Wayne's account reads Received 10,000
 * and a Receivable Balance of 0; no contract counts it. No payment exceeds its
 * invoice, so every Overpaid reads 0 (#2513).
 *
 * Hook-owned figures are not authored (`src/sales/data/_shared.ts`, rule 3):
 * the account stamp on every row that names an order or a contract, an
 * invoice's Due Date (issue date plus the contract's terms, else the order's),
 * Open and Overpaid, a payment's order, contract and plan step (copied from
 * its invoice), and the steps' invoiced and received summaries all come from the
 * module's own hooks and the engine as the rows are written. The datasets are
 * replayed in this order, after the contracts they reference.
 *
 * Seed identities: a step's `name`, an invoice's `invoice_number`, and a
 * payment's `erp_ref` (its bank reference), since `payment_number` is an
 * autonumber the runtime owns. References name those keys, a contract by its
 * `description`, the contracts' own seed identity, an order by its name, the
 * orders' own, and an account by its name.
 *
 * INSERT-ONCE (`mode: 'ignore'`, as the contracts): finance edits, cancels and
 * re-imports these rows, and a boot must not write them back.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { BillingMilestone } from '../objects/billing_milestone.object';
import { Invoice } from '../objects/invoice.object';
import { Payment } from '../objects/payment.object';
import { SEED_EN_LOCALES } from '../../sales/data/_locale';
import { celDaysFromNow } from '../../sales/data/_shared';

/** The two billed contracts, by their seed identity. */
const INITECH = 'Initech Solutions';
const ACME = 'Acme Corporation';
/** The account whose deposit arrived before any contract was billed. */
const WAYNE = 'Wayne Enterprises';
const O2C_CONTRACTS = {
  [INITECH]: 'Initial service agreement, pending renewal discussion.',
  [ACME]: 'Annual platform subscription with premium support tier.',
} as const;
/** The order billed with no contract, by its seed identity (its name). */
const GLOBEX_ORDER = 'Globex Seat Expansion Order';

export const billingMilestones = defineSeed(BillingMilestone, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: 'name',
  records: [
    { name: 'Initech Q1 service fee', crm_contract: O2C_CONTRACTS[INITECH], planned_amount: 15000, planned_date: cel`daysAgo(400)`, description: 'First quarter of the service agreement, billed at the start of the quarter.' },
    { name: 'Initech Q2 service fee', crm_contract: O2C_CONTRACTS[INITECH], planned_amount: 15000, planned_date: cel`daysAgo(309)`, description: 'Second quarter of the service agreement.' },
    { name: 'Initech Q3 service fee', crm_contract: O2C_CONTRACTS[INITECH], planned_amount: 15000, planned_date: cel`daysAgo(218)`, description: 'Third quarter of the service agreement.' },
    { name: 'Initech Q4 service fee', crm_contract: O2C_CONTRACTS[INITECH], planned_amount: 15000, planned_date: cel`daysAgo(127)`, description: 'Fourth and last quarter of the service agreement.' },
    { name: 'Acme Year 1 subscription', crm_contract: O2C_CONTRACTS[ACME], planned_amount: 220000, planned_date: cel`today()`, description: 'Year one of the platform subscription, billed annually in advance.' },
    // The plan of an order with no contract hangs on the order (hotcrm#2560).
    { name: 'Globex seats on order', crm_sales_order: GLOBEX_ORDER, planned_amount: 11232, planned_date: cel`daysAgo(5)`, description: 'Half of the seat order, billed when the order was confirmed.' },
    { name: 'Globex seats on delivery', crm_sales_order: GLOBEX_ORDER, planned_amount: 11232, planned_date: celDaysFromNow(25), description: 'The other half, billed once every seat and workshop day is delivered.' },
  ],
});

export const invoices = defineSeed(Invoice, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: 'invoice_number',
  records: [
    { invoice_number: 'INV-00412', crm_contract: O2C_CONTRACTS[INITECH], crm_billing_milestone: 'Initech Q1 service fee', issue_date: cel`daysAgo(400)`, amount: 15000, status: 'issued', source: 'manual' },
    { invoice_number: 'INV-00538', crm_contract: O2C_CONTRACTS[INITECH], crm_billing_milestone: 'Initech Q2 service fee', issue_date: cel`daysAgo(309)`, amount: 15000, status: 'issued', source: 'manual' },
    { invoice_number: 'INV-00707', crm_contract: O2C_CONTRACTS[INITECH], crm_billing_milestone: 'Initech Q3 service fee', issue_date: cel`daysAgo(218)`, amount: 15000, status: 'issued', source: 'manual' },
    { invoice_number: 'INV-00836', crm_contract: O2C_CONTRACTS[INITECH], crm_billing_milestone: 'Initech Q4 service fee', issue_date: cel`daysAgo(127)`, amount: 15000, status: 'issued', source: 'manual' },
    { invoice_number: 'INV-00991', crm_contract: O2C_CONTRACTS[ACME], crm_billing_milestone: 'Acme Year 1 subscription', issue_date: cel`today()`, amount: 220000, status: 'issued', source: 'manual' },
    // Against the order alone: the due date comes from the order's Net 60.
    { invoice_number: 'INV-01024', crm_sales_order: GLOBEX_ORDER, crm_billing_milestone: 'Globex seats on order', issue_date: cel`daysAgo(5)`, amount: 11232, status: 'issued', source: 'manual' },
  ],
});

export const payments = defineSeed(Payment, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: 'erp_ref',
  records: [
    { erp_ref: 'TRX-118730', crm_contract: O2C_CONTRACTS[INITECH], crm_invoice: 'INV-00412', payment_date: cel`daysAgo(375)`, amount: 15000, method: 'bank_transfer', source: 'manual' },
    { erp_ref: 'TRX-129420', crm_contract: O2C_CONTRACTS[INITECH], crm_invoice: 'INV-00538', payment_date: cel`daysAgo(282)`, amount: 15000, method: 'bank_transfer', source: 'manual' },
    // Part payment: the customer paid 9,000 and disputed the rest of the quarter.
    { erp_ref: 'TRX-135180', crm_contract: O2C_CONTRACTS[INITECH], crm_invoice: 'INV-00707', payment_date: cel`daysAgo(180)`, amount: 9000, method: 'bank_transfer', source: 'manual' },
    // A deposit with no invoice, no plan step and no contract: the account alone (hotcrm#2557).
    { erp_ref: 'TRX-140215', crm_account: WAYNE, payment_date: cel`daysAgo(20)`, amount: 10000, method: 'bank_transfer', source: 'manual' },
    // Names only its invoice: the order, the step and the account come from it (hotcrm#2560).
    { erp_ref: 'TRX-151360', crm_invoice: 'INV-01024', payment_date: cel`daysAgo(2)`, amount: 11232, method: 'bank_transfer', source: 'manual' },
  ],
});
