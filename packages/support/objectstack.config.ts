import { defineStack } from '@objectstack/spec';
import { SupportPlugin } from './src/plugin.js';

/**
 * Support Package Configuration
 * 
 * Standalone configuration for the Support package.
 * Can be used to run or test the Support package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.support',
    namespace: 'support',
    version: '1.0.0',
    type: 'plugin',
    name: 'Service Cloud',
    description: 'Customer Support - Case and Knowledge management',
  },

  plugins: [SupportPlugin],
});
