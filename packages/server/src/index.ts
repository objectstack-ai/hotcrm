
// Polyfill require for ESM libraries that erroneously use it
try {
  if (typeof require !== 'undefined') {
    (global as any).require = require;
  }
} catch (e) {
  console.warn('Could not polyfill require');
}

import { ObjectKernel, AppPlugin, DriverPlugin } from '@objectstack/runtime';
import { HonoServerPlugin } from '@objectstack/plugin-hono-server';
import { MetadataPlugin } from '@objectstack/metadata';
import { ObjectQLPlugin } from '@objectstack/objectql';

// Import plugins directly
import { CRMPlugin } from '@hotcrm/crm';
import { FinancePlugin } from '@hotcrm/finance';
import { MarketingPlugin } from '@hotcrm/marketing';
import { ProductsPlugin } from '@hotcrm/products';
import { SupportPlugin } from '@hotcrm/support';
import { HRPlugin } from '@hotcrm/hr';

async function main() {
  console.log('Starting HotCRM Server...');
  
  const kernel = new ObjectKernel();

  // Initialize Metadata Plugin (provides 'metadata' service)
  kernel.use(new MetadataPlugin());

  // Initialize ObjectQL Plugin (provides 'data' service)
  kernel.use(new ObjectQLPlugin());

  // Initialize Database Driver
  const driverPlugin = new DriverPlugin({
    type: process.env.DB_TYPE || 'sqlite',
    database: process.env.DB_NAME || 'hotcrm.db'
  });
  kernel.use(driverPlugin);

  // Initialize Hono Server Plugin
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  kernel.use(new HonoServerPlugin({ port }));

  // Register business plugins
  const businessPlugins = [
    CRMPlugin,
    FinancePlugin,
    MarketingPlugin,
    ProductsPlugin,
    SupportPlugin,
    HRPlugin
  ];

  for (const plugin of businessPlugins) {
    if (plugin) {
      console.log(`Registering plugin: ${plugin.name || 'Unknown'}`);
      kernel.use(new AppPlugin(plugin));
    }
  }

  await kernel.bootstrap();
  console.log(`✓ HotCRM Server is running on port ${port}!`);
  console.log(`  API: http://localhost:${port}`);
}

main().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
