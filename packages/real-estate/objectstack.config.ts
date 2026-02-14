import { defineStack } from '@objectstack/spec';
import { RealEstatePlugin } from './src/plugin.js';

/**
 * Real Estate Package Configuration
 *
 * Standalone configuration for the Real Estate package.
 * Can be used to run or test the Real Estate package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.real-estate',
    namespace: 'real_estate',
    version: '1.0.0',
    type: 'plugin',
    name: 'Real Estate Cloud',
    description: 'Real Estate management - Properties, Listings, Showings, Offers, and Commission Tracking',
  },

  plugins: [RealEstatePlugin],
});
