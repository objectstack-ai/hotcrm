import { defineStack } from '@objectstack/spec';
import { FinancialServicesPlugin } from './src/plugin.js';

/**
 * Financial Services Package Configuration
 *
 * Standalone configuration for the Financial Services package.
 * Can be used to run or test the Financial Services package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.financial-services',
    namespace: 'financial_services',
    version: '1.0.0',
    type: 'plugin',
    name: 'Financial Services Cloud',
    description: 'Financial Services management - Wealth Management, Portfolio, KYC, Compliance, and Advisory',
  },

  plugins: [FinancialServicesPlugin],
});
