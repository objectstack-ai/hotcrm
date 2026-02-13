import { defineStack } from '@objectstack/spec';
import { IntegrationPlugin } from './src/plugin';

/**
 * Integration Package Configuration
 * 
 * Standalone configuration for the Integration package.
 * Can be used to run or test the Integration package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.integration',
    namespace: 'integration',
    version: '1.0.0',
    type: 'plugin',
    name: 'Integration Cloud',
    description: 'Integration and connectivity - Connectors, Sync, Webhooks, API Management, and AI-Powered Tools',
  },

  plugins: [IntegrationPlugin],
});
