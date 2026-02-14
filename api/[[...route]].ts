/**
 * Vercel Serverless Function — ObjectStack Hono Handler
 *
 * Bootstraps the full ObjectStack kernel with all HotCRM plugins,
 * using @objectstack/driver-memory for zero-config in-memory data.
 *
 * Exports a Web Standard fetch handler — Vercel natively recognises this.
 *
 * Data lives in the function instance's memory and persists across
 * warm invocations (Vercel Fluid Compute) but resets on cold start.
 */
import { ObjectKernel, DriverPlugin, AppPlugin, createDispatcherPlugin, createRestApiPlugin } from '@objectstack/runtime';
import { HonoHttpServer } from '@objectstack/plugin-hono-server';
import { InMemoryDriver } from '@objectstack/driver-memory';

// Business plugins
import { CRMPlugin } from '../packages/crm/src/plugin';
import { FinancePlugin } from '../packages/finance/src/plugin';
import { MarketingPlugin } from '../packages/marketing/src/plugin';
import { ProductsPlugin } from '../packages/products/src/plugin';
import { SupportPlugin } from '../packages/support/src/plugin';
import { HRPlugin } from '../packages/hr/src/plugin';

// ---------------------------------------------------------------------------
// Singleton bootstrap — reused across warm invocations
// ---------------------------------------------------------------------------

let honoApp: { fetch: (request: Request) => Promise<Response> } | null = null;
let bootstrapPromise: Promise<typeof honoApp> | null = null;

async function bootstrap() {
  const kernel = new ObjectKernel();

  // 1. In-memory data driver (no external DB required)
  kernel.use(new DriverPlugin(new InMemoryDriver()));

  // 2. HTTP server adapter — register the Hono app without TCP listener
  const httpServer = new HonoHttpServer();
  kernel.use({
    name: 'vercel-http',
    version: '1.0.0',
    init: async (ctx: any) => {
      ctx.registerService('http.server', httpServer);
      ctx.registerService('http-server', httpServer);
    },
    start: async () => {},
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

  // 7. Bootstrap kernel (init + start all plugins, fire kernel:ready)
  await kernel.bootstrap();

  return httpServer.getRawApp();
}

async function getApp() {
  if (honoApp) return honoApp;
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().then((app) => {
      honoApp = app;
      return app;
    });
  }
  return bootstrapPromise;
}

// ---------------------------------------------------------------------------
// Vercel Web Standard fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request): Promise<Response> {
    const app = await getApp();
    return app!.fetch(request);
  },
};
