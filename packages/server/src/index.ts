
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

  // Initialize Database Driver
  const driverPlugin = new DriverPlugin({
    type: process.env.DB_TYPE || 'sqlite',
    database: process.env.DB_NAME || 'hotcrm.db'
  });
  kernel.use(driverPlugin);

  // Initialize Hono Server Plugin
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  kernel.use(new HonoServerPlugin({ port }));

  // Add minimal metadata service plugin
  kernel.use({
    name: 'minimal-metadata',
    version: '1.0.0',
    init: async (ctx: any) => {
      // Register minimal metadata service to satisfy system requirements
      const metadataService = {
        load: async () => ({}),
        save: async () => {},
        watch: () => {},
      };
      ctx.registerService('metadata', metadataService);
    },
    start: async (ctx: any) => {
      console.log('Minimal metadata service started');
    }
  });

  // Add minimal data service plugin  
  kernel.use({
    name: 'minimal-data',
    version: '1.0.0',
    init: async (ctx: any) => {
      // Register minimal data service to satisfy system requirements
      const dataService = {
        query: async () => ([]),
        insert: async () => ({}),
        update: async () => ({}),
        delete: async () => ({}),
      };
      ctx.registerService('data', dataService);
    },
    start: async (ctx: any) => {
      console.log('Minimal data service started');
    }
  });

  // Add minimal auth service plugin
  kernel.use({
    name: 'minimal-auth',
    version: '1.0.0',
    init: async (ctx: any) => {
      // Register minimal auth service to satisfy system requirements
      const authService = {
        authenticate: async () => ({ user: 'system' }),
        authorize: async () => true,
      };
      ctx.registerService('auth', authService);
    },
    start: async (ctx: any) => {
      console.log('Minimal auth service started');
    }
  });

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
  console.log(`  Studio: http://localhost:${port}/_studio/`);
}

main().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
