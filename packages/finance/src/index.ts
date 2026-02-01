/**
 * @hotcrm/finance - Finance Module
 * 
 * This package contains all finance-related business objects:
 * - Contract: Contract lifecycle management
 * - Invoice: Billing statements
 * - Payment: Payment tracking and reconciliation
 */

export { default as Contract } from './contract.object';
export { default as Invoice } from './invoice.object';
export { default as InvoiceLine } from './invoice_line.object';
export { default as Payment } from './payment.object';

// Export Hooks
export { default as ContractHooks } from './hooks/contract.hook';

// Export plugin definition
export { default as FinancePlugin } from './plugin';
