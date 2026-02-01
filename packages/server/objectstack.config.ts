
// import { defineConfig } from '@objectstack/cli';
// @ts-ignore
import { CRMPlugin } from '@hotcrm/crm';
// @ts-ignore
import { FinancePlugin } from '@hotcrm/finance';
// @ts-ignore
import { MarketingPlugin } from '@hotcrm/marketing';
// @ts-ignore
import { ProductsPlugin } from '@hotcrm/products';
// @ts-ignore
import { SupportPlugin } from '@hotcrm/support';

/**
 * HotCRM Server Configuration
 * 
 * Aggregates all business plugins into a single runtime application.
 */
export default {
  // Project Metadata
  name: 'hotcrm-server',
  description: 'HotCRM Enterprise Server',

  // Database connection provided by environment variables
  // MONGODB_URI=mongodb://localhost:27017/hotcrm
  // datasources: ... (handled by env vars in standard ObjectStack)

  // Register all Plugins
  plugins: [
    CRMPlugin,
    FinancePlugin,
    MarketingPlugin,
    ProductsPlugin,
    SupportPlugin
  ],

  // Server Settings
  dev: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5000,
  },
  
  // Build Settings
  build: {
    outDir: './dist',
    target: 'node18'
  }
};
