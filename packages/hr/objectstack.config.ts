import { defineStack } from '@objectstack/spec';
import { HRPlugin } from './src/plugin.js';

/**
 * HR Package Configuration
 * 
 * Standalone configuration for the HR package.
 * Can be used to run or test the HR package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.hr',
    namespace: 'hr',
    version: '1.0.0',
    type: 'plugin',
    name: 'HR Cloud',
    description: 'Human Capital Management - Employee lifecycle, recruitment, performance, and payroll',
  },

  plugins: [HRPlugin],
});
