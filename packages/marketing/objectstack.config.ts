import { defineStack } from '@objectstack/spec';
import { MarketingPlugin } from './src/plugin.js';

/**
 * Marketing Package Configuration
 * 
 * Standalone configuration for the Marketing package.
 * Can be used to run or test the Marketing package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.marketing',
    namespace: 'marketing',
    version: '1.0.0',
    type: 'plugin',
    name: 'Marketing Cloud',
    description: 'Campaign Management - Campaigns, email templates, landing pages, forms',
  },

  plugins: [MarketingPlugin],
});
