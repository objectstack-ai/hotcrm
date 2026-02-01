import { CRMPlugin } from '@hotcrm/crm';
import { FinancePlugin } from '@hotcrm/finance';
import { MarketingPlugin } from '@hotcrm/marketing';
import { ProductsPlugin } from '@hotcrm/products';
import { SupportPlugin } from '@hotcrm/support';

/**
 * HotCRM Server Configuration
 * 
 * Aggregates all business plugins into a single runtime application.
 */
const config = {
  // Database connection provided by environment variables
  // MONGODB_URI=mongodb://localhost:27017/hotcrm

  // Register all Plugins
  plugins: [
    CRMPlugin,
    FinancePlugin,
    MarketingPlugin,
    ProductsPlugin,
    SupportPlugin
  ],

  // Server Settings
  port: process.env.PORT ? parseInt(process.env.PORT) : 5000,
  
  // UI Configuration
  siteName: 'HotCRM Enterprise',
  logoUrl: '/assets/hotcrm-logo.png'
};

export default config;
