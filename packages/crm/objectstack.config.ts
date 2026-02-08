import { defineStack } from '@objectstack/spec';
import { CRMPlugin } from './src/plugin';

/**
 * CRM Package Configuration
 * 
 * Standalone configuration for the CRM package.
 * Can be used to run or test the CRM package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.crm',
    namespace: 'crm',
    version: '1.0.0',
    type: 'plugin',
    name: 'Sales Cloud',
    description: 'Core Sales Cloud - Accounts, Contacts, Leads, Opportunities, and Activity Tracking',
  },

  plugins: [CRMPlugin],
});
