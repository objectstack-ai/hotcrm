/**
 * Local Development Server
 * 
 * Custom server entry point that properly orders plugins to avoid routing conflicts.
 * This ensures the Console UI loads AFTER API plugins (RestAPI, Dispatcher).
 * 
 * Usage:
 *   pnpm dev
 * 
 * The ObjectStack CLI's automatic plugin ordering has a limitation where user-provided
 * UI plugins load before infrastructure plugins, causing route conflicts. This custom
 * server explicitly orders plugins correctly.
 */
import { ObjectKernel, DriverPlugin, AppPlugin, createDispatcherPlugin, createRestApiPlugin } from '@objectstack/runtime';
import { HonoHttpServer } from '@objectstack/plugin-hono-server';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { ConsolePlugin } from '@object-ui/console';

// Business plugins
import CRMPlugin from './packages/crm/src/plugin.js';
import FinancePlugin from './packages/finance/src/plugin.js';
import MarketingPlugin from './packages/marketing/src/plugin.js';
import ProductsPlugin from './packages/products/src/plugin.js';
import SupportPlugin from './packages/support/src/plugin.js';
import HRPlugin from './packages/hr/src/plugin.js';

async function main() {
  console.log('[HotCRM] Starting development server...\n');

  const kernel = new ObjectKernel();

  // 1. In-memory data driver (no external DB required)
  kernel.use(new DriverPlugin(new InMemoryDriver()));

  // 2. HTTP server adapter
  const httpServer = new HonoHttpServer();
  kernel.use({
    name: 'dev-http-server',
    version: '1.0.0',
    init: async (ctx: any) => {
      ctx.registerService('http.server', httpServer);
      ctx.registerService('http-server', httpServer);
    },
    start: async () => {
      // Start listening on port 3000
      await httpServer.start({ port: 3000 });
      console.log('\n[HotCRM] Server ready at http://localhost:3000');
      console.log('[HotCRM] Console UI: http://localhost:3000');
      console.log('[HotCRM] API: http://localhost:3000/api/v1\n');
    },
  });

  // 3. Application config (business objects & plugins)
  kernel.use(new AppPlugin({
    manifest: {
      id: 'com.hotcrm.app',
      namespace: 'hotcrm',
      version: '1.0.0',
      type: 'app',
      name: 'HotCRM Enterprise',
    },
    objects: [],
    plugins: [],
  }));

  // 4. Register business plugins
  const businessPlugins = [
    CRMPlugin, FinancePlugin, MarketingPlugin,
    ProductsPlugin, SupportPlugin, HRPlugin,
  ];
  for (const plugin of businessPlugins) {
    if (plugin) {
      kernel.use(new AppPlugin(plugin));
    }
  }

  // 5. REST API endpoints (auto-generated CRUD for all objects)
  kernel.use(createRestApiPlugin());

  // 6. Dispatcher (auth, graphql, analytics routes)
  kernel.use(createDispatcherPlugin());

  // 7. Console UI (serves the ObjectStack Console SPA - MUST load after API routes!)
  kernel.use(new ConsolePlugin());

  // 8. Bootstrap kernel (init + start all plugins, fire kernel:ready)
  await kernel.bootstrap();
}

main().catch((err) => {
  console.error('[HotCRM] Fatal error:', err);
  process.exit(1);
});
