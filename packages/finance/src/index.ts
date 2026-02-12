/**
 * @hotcrm/finance - Finance Module
 * 
 * This package contains all finance-related business objects:
 * - Contract: Contract lifecycle management
 * - Invoice: Billing statements
 * - Payment: Payment tracking and reconciliation
 */

export { Contract } from './contract.object';
export { Invoice } from './invoice.object';
export { InvoiceLine } from './invoice_line.object';
export { Payment } from './payment.object';
export { CreditNote } from './credit_note.object';
export { BillingSchedule } from './billing_schedule.object';

// Export Hooks
export { default as ContractHooks } from './hooks/contract.hook';
export { default as ContractRenewalHooks } from './hooks/contract_renewal.hook';

// Export plugin definition
export { default as FinancePlugin } from './plugin';
