/**
 * @hotcrm/finance - Finance Module
 * 
 * This package contains all finance-related business objects:
 * - Contract: Contract lifecycle management
 * - Payment: Payment tracking and reconciliation
 */

export * from './contract.object';

// Export plugin definition
export { default as FinancePlugin } from './plugin';

// Note: YAML files (Payment) are kept for reference
// TypeScript definitions should be created following the metadata protocol
