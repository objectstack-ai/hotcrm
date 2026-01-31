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
import Contract from './contract.object';

/**
 * Finance Plugin Definition
 * 
 * Exports all finance-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const FinancePlugin = {
  name: 'finance',
  label: 'Finance',
  version: '1.0.0',
  description: 'Financial management - Contracts, Payments, and Revenue Recognition',
  
  // Plugin dependencies
  dependencies: ['crm'],
  
  // Business objects provided by this plugin
  objects: {
    contract: Contract,
  },
  
  // Navigation structure for this plugin
  navigation: [
    {
      type: 'group',
      label: 'Finance',
      children: [
        { type: 'object', object: 'contract' },
      ]
    }
  ]
};

export default FinancePlugin;
