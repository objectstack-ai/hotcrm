import { defineStack } from '@objectstack/spec';
import CRM from '@hotcrm/crm';
import Finance from '@hotcrm/finance';
import Marketing from '@hotcrm/marketing';
import Products from '@hotcrm/products';
import Support from '@hotcrm/support';
import HR from '@hotcrm/hr';

/**
 * HotCRM Application Configuration
 * 
 * Aggregates all business plugins into a single runtime application.
 * This replaces the deprecated @hotcrm/server package.
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
    CRM.CRMPlugin,
    Finance.FinancePlugin,
    Marketing.MarketingPlugin,
    Products.ProductsPlugin,
    Support.SupportPlugin,
    HR.HRPlugin
  ],
});
