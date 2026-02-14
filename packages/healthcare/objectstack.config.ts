import { defineStack } from '@objectstack/spec';
import { HealthcarePlugin } from './src/plugin.js';

/**
 * Healthcare Package Configuration
 *
 * Standalone configuration for the Healthcare package.
 * Can be used to run or test the Healthcare package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.healthcare',
    namespace: 'healthcare',
    version: '1.0.0',
    type: 'plugin',
    name: 'Healthcare Cloud',
    description: 'Healthcare management - Patients, Appointments, Insurance, Referrals, and HIPAA Compliance',
  },

  plugins: [HealthcarePlugin],
});
