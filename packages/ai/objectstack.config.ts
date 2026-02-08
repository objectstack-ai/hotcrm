import { defineStack } from '@objectstack/spec';
import { AIPlugin } from './src/plugin';

/**
 * AI Package Configuration
 * 
 * Standalone configuration for the AI package.
 * Can be used to run or test the AI package independently.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.ai',
    namespace: 'ai',
    version: '1.0.0',
    type: 'plugin',
    name: 'AI Services',
    description: 'Unified AI service layer - ML model integration framework and shared AI utilities',
  },

  plugins: [AIPlugin],
});
