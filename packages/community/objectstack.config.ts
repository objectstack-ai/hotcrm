import { defineStack } from '@objectstack/spec';
import { CommunityPlugin } from './src/plugin.js';

/**
 * Community Package Configuration
 * 
 * Standalone configuration for the Community package.
 * Can be used to run or test the Community package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.community',
    namespace: 'community',
    version: '1.0.0',
    type: 'plugin',
    name: 'Community Cloud',
    description: 'Community engagement - Forums, Ideas, Events, Gamification, and AI-Powered Moderation',
  },

  plugins: [CommunityPlugin],
});
