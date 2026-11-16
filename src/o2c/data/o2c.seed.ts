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
 * Wayne's contract is still in approval and Stark's is a draft, so neither is
 * billed. No payment exceeds its invoice, so every Overpaid reads 0 (#2513).
 *
 * Hook-owned figures are not authored (`src/sales/data/_shared.ts`, rule 3):
 * the account stamp on every row, an invoice's Due Date (issue date plus the
 * contract's terms), Open and Overpaid, a payment's plan step (copied from its
 * invoice), and the steps' invoiced and received summaries all come from the
 * module's own hooks and the engine as the rows are written. The datasets are
 * replayed in this order, after the contracts they reference.
 *
 * Seed identities: a step's `name`, an invoice's `invoice_number`, and a
 * payment's `erp_ref` (its bank reference), since `payment_number` is an
 * autonumber the runtime owns. References name those keys, and a contract by
 * its `description`, the contracts' own seed identity.
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

/** The two billed contracts, by their seed identity. */
const INITECH = 'Initech Solutions';
const ACME = 'Acme Corporation';
const O2C_CONTRACTS = {
  [INITECH]: 'Initial service agreement, pending renewal discussion.',
  [ACME]: 'Annual platform subscription with premium support tier.',
} as const;

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
  ],
});
