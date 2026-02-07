import { defineStack } from '@objectstack/spec';
import CRMPlugin from '@hotcrm/crm';
import FinancePlugin from '@hotcrm/finance';
import MarketingPlugin from '@hotcrm/marketing';
import ProductsPlugin from '@hotcrm/products';
import SupportPlugin from '@hotcrm/support';
import HRPlugin from '@hotcrm/hr';

/**
 * HotCRM Server Configuration
 * 
 * Aggregates all business plugins into a single runtime application.
 */
export default defineStack({
  manifest: {
    id: 'com.hotcrm.server',
    namespace: 'hotcrm',
    version: '1.0.0',
    type: 'app',
    name: 'HotCRM Enterprise Server',
    description: 'AI-Native Enterprise CRM with Sales, Marketing, Products, Finance, Service, and HR clouds',
  },

  // Register all Plugins
  plugins: [
    CRMPlugin,
    FinancePlugin,
    MarketingPlugin,
    ProductsPlugin,
    SupportPlugin,
    HRPlugin
  ],
});
