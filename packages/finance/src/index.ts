/**
 * @hotcrm/finance - Finance Module
 * 
 * This package contains all finance-related business objects:
 * - Contract: Contract lifecycle management
 * - Invoice: Billing statements
 * - Payment: Payment tracking and reconciliation
 */

export { Contract } from './contract.object.js';
export { Invoice } from './invoice.object.js';
export { InvoiceLine } from './invoice_line.object.js';
export { Payment } from './payment.object.js';
export { CreditNote } from './credit_note.object.js';
export { BillingSchedule } from './billing_schedule.object.js';

// Export Hooks
export { default as ContractHooks } from './hooks/contract.hook.js';
export { default as ContractRenewalHooks } from './hooks/contract_renewal.hook.js';

// Export plugin definition
export { default as FinancePlugin } from './plugin.js';
