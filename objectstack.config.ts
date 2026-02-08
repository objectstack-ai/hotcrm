import { defineStack } from '@objectstack/spec';
import { CRMPlugin } from './packages/crm/src/plugin';
import { FinancePlugin } from './packages/finance/src/plugin';
import { MarketingPlugin } from './packages/marketing/src/plugin';
import { ProductsPlugin } from './packages/products/src/plugin';
import { SupportPlugin } from './packages/support/src/plugin';
import { HRPlugin } from './packages/hr/src/plugin';

/**
 * HotCRM Application Configuration
 * 
 * Aggregates all business plugins into a single runtime application.
 * This replaces the deprecated @hotcrm/server package.
 * 
 * Note: @hotcrm/ai is a utility library and doesn't need to be registered as a plugin.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.app',
    namespace: 'hotcrm',
    version: '1.0.0',
    type: 'app',
    name: 'HotCRM Enterprise',
    description: 'AI-Native Enterprise CRM with Sales, Marketing, Products, Finance, Service, and HR clouds',
  },

  // Register all Business Plugins
  plugins: [
    CRMPlugin,
    FinancePlugin,
    MarketingPlugin,
    ProductsPlugin,
    SupportPlugin,
    HRPlugin
  ],
});
