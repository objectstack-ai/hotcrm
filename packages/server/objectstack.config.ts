import { defineStack } from '@objectstack/spec';
import CRM from '@hotcrm/crm';
import Finance from '@hotcrm/finance';
import Marketing from '@hotcrm/marketing';
import Products from '@hotcrm/products';
import Support from '@hotcrm/support';
import HR from '@hotcrm/hr';

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
    CRM.CRMPlugin,
    Finance.FinancePlugin,
    Marketing.MarketingPlugin,
    Products.ProductsPlugin,
    Support.SupportPlugin,
    HR.HRPlugin
  ],
});
