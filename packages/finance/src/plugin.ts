/**
 * @hotcrm/finance - Finance Plugin Definition
 * 
 * This plugin provides financial management functionality including:
 * - Contract Lifecycle Management
 * - Payment Tracking & Reconciliation
 * - Revenue Recognition
 * 
 * Dependencies: @hotcrm/crm (required for Account and Opportunity references)
 */

// Import all Finance objects
import { Contract } from './contract.object';
import { Payment } from './payment.object';
import { Invoice } from './invoice.object';
import { InvoiceLine } from './invoice_line.object';

// Import hooks
import { ContractBillingHook } from './hooks/contract.hook';
import { ContractRenewalCheck, ContractExpirationAlert } from './hooks/contract_renewal.hook';

/**
 * Finance Plugin Definition
 * 
 * Exports all finance-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const FinancePlugin: any = {
  name: 'finance',
  label: 'finance',
  version: '1.0.0',
  description: 'Financial management - Contracts, Invoices, Payments, and Revenue Recognition',
  
  // Plugin dependencies
  dependencies: ['crm'],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  // Business objects provided by this plugin
  objects: {
    contract: Contract,
    invoice: Invoice,
    invoice_line: InvoiceLine,
    payment: Payment,
  },
  
  // Triggers
  triggers: {
    contract_billing: ContractBillingHook,
    contract_renewal: ContractRenewalCheck,
    contract_expiration_alert: ContractExpirationAlert
  },

  // Navigation structure for this plugin
  navigation: [
    {
      type: 'group',
      label: 'finance',
      children: [
        { type: 'object', object: 'contract' },
        { type: 'object', object: 'invoice' },
        { type: 'object', object: 'payment' },
      ]
    }
  ]
};

export default FinancePlugin;
