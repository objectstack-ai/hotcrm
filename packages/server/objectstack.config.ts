/**
 * @deprecated This package is deprecated and no longer maintained.
 * Please use the root objectstack.config.ts with @objectstack/cli instead.
 * 
 * This file is kept for reference purposes only and should not be used.
 * See packages/server/README.md for migration instructions.
 */

import { defineStack } from '@objectstack/spec';

/**
 * HotCRM Server Configuration (DEPRECATED)
 * 
 * This configuration is deprecated. The application now uses the root
 * objectstack.config.ts file instead.
 * 
 * Migration: Use /objectstack.config.ts in the root directory
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.server',
    namespace: 'hotcrm',
    version: '1.0.0',
    type: 'app',
    name: 'HotCRM Enterprise Server (DEPRECATED)',
    description: 'This configuration is deprecated. Use root objectstack.config.ts instead.',
  },

  // This configuration is no longer used
  // All plugins are now registered in /objectstack.config.ts
  plugins: [],
});
