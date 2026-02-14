import { defineStack } from '@objectstack/spec';
import { AnalyticsPlugin } from './src/plugin.js';

/**
 * Analytics Package Configuration
 * 
 * Standalone configuration for the Analytics package.
 * Can be used to run or test the Analytics package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.analytics',
    namespace: 'analytics',
    version: '1.0.0',
    type: 'plugin',
    name: 'Analytics Cloud',
    description: 'Analytics and reporting - Reports, Dashboards, KPIs, Metrics, and AI-Powered Insights',
  },

  plugins: [AnalyticsPlugin],
});
