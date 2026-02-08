import { defineStack } from '@objectstack/spec';
import { FinancePlugin } from './src/plugin';

/**
 * Finance Package Configuration
 * 
 * Standalone configuration for the Finance package.
 * Can be used to run or test the Finance package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.finance',
    namespace: 'finance',
    version: '1.0.0',
    type: 'plugin',
    name: 'Finance Cloud',
    description: 'Finance & Contract Management',
  },

  plugins: [FinancePlugin],
});
