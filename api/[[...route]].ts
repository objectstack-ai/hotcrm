/**
 * Vercel Serverless Function — ObjectStack Hono Handler
 *
 * Bootstraps the full ObjectStack kernel with all HotCRM plugins,
 * using @objectstack/driver-memory for zero-config in-memory data.
 *
 * Uses @hono/node-server/vercel `handle()` adapter to convert the Hono app
 * into a Node.js serverless handler that Vercel's @vercel/node runtime
 * recognises (IncomingMessage / ServerResponse).
 *
 * Data lives in the function instance's memory and persists across
 * warm invocations (Vercel Fluid Compute) but resets on cold start.
 */
import { ObjectKernel, DriverPlugin, AppPlugin, createDispatcherPlugin, createRestApiPlugin } from '@objectstack/runtime';
import { HonoHttpServer } from '@objectstack/plugin-hono-server';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { ObjectQLPlugin } from '@objectstack/objectql';
// import { ConsolePlugin } from '@object-ui/console';
import { handle } from '@hono/node-server/vercel';
import type { Hono } from 'hono';

// Business plugins
import { CRMPlugin } from '../packages/crm/dist/plugin.js';
import { FinancePlugin } from '../packages/finance/dist/plugin.js';
import { MarketingPlugin } from '../packages/marketing/dist/plugin.js';
import { ProductsPlugin } from '../packages/products/dist/plugin.js';
import { SupportPlugin } from '../packages/support/dist/plugin.js';
import { HRPlugin } from '../packages/hr/dist/plugin.js';

// ---------------------------------------------------------------------------
// Singleton bootstrap — reused across warm invocations
// ---------------------------------------------------------------------------

let honoApp: Hono | null = null;
let bootstrapPromise: Promise<Hono> | null = null;

async function bootstrap(): Promise<Hono> {
  const kernel = new ObjectKernel();

  // 1. ObjectQL engine (provides metadata, data, and protocol services)
  await kernel.use(new ObjectQLPlugin());

  // 2. In-memory data driver (no external DB required)
  await kernel.use(new DriverPlugin(new InMemoryDriver(), 'memory'));

  // 3. HTTP server adapter — register the Hono app without TCP listener
  const httpServer = new HonoHttpServer();
  await kernel.use({
    name: 'vercel-http',
    version: '1.0.0',
    init: async (ctx: any) => {
      ctx.registerService('http.server', httpServer);
      ctx.registerService('http-server', httpServer);
    },
    start: async () => {},
  });

  // 4. In-memory cache service (satisfies the 'cache' core service requirement)
  await kernel.use({
    name: 'com.hotcrm.cache.memory',
    version: '1.0.0',
    init: async (ctx: any) => {
      const store = new Map<string, { value: unknown; expiresAt: number | null }>();
      const isExpired = (entry: { expiresAt: number | null }) =>
        entry.expiresAt !== null && Date.now() > entry.expiresAt;
      ctx.registerService('cache', {
        async get(key: string) {
          const entry = store.get(key);
          if (!entry) return undefined;
          if (isExpired(entry)) {
            store.delete(key);
            return undefined;
          }
          return entry.value;
        },
        async set(key: string, value: unknown, ttl?: number) {
          store.set(key, {
            value,
            expiresAt: ttl ? Date.now() + ttl * 1000 : null,
          });
        },
        async del(key: string) {
          store.delete(key);
        },
        async clear() {
          store.clear();
        },
        async has(key: string) {
          const entry = store.get(key);
          if (!entry) return false;
          if (isExpired(entry)) {
            store.delete(key);
            return false;
          }
          return true;
        },
      });
    },
    start: async () => {},
  });

  // 5. Application config (business objects & plugins)
  await kernel.use(new AppPlugin({
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

  // 6. Register business plugins
  const businessPlugins = [
    CRMPlugin, FinancePlugin, MarketingPlugin,
    ProductsPlugin, SupportPlugin, HRPlugin,
  ];
  for (const plugin of businessPlugins) {
    if (plugin) {
      await kernel.use(new AppPlugin(plugin));
    }
  }

  // 7. REST API endpoints (auto-generated CRUD for all objects)
  await kernel.use(createRestApiPlugin());

  // 8. Dispatcher (auth, graphql, analytics routes)
  await kernel.use(createDispatcherPlugin());

  // 9. Console UI (serves the ObjectStack Console SPA for data browsing and management)
  // await kernel.use(new ConsolePlugin());

  // 10. Bootstrap kernel (init + start all plugins, fire kernel:ready)
  await kernel.bootstrap();

  return httpServer.getRawApp();
}

async function getApp(): Promise<Hono> {
  if (honoApp) return honoApp;
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().then((app) => {
      honoApp = app;
      return app;
    });
  }
  return bootstrapPromise as Promise<Hono>;
}

// ---------------------------------------------------------------------------
// Vercel Node.js serverless handler via @hono/node-server/vercel adapter
// ---------------------------------------------------------------------------

const handler = handle(
  // Lazy-init proxy: the real Hono app is created on first request.
  // handle() only invokes app.fetch() at request time, so the proxy
  // forwards that call to the bootstrapped singleton.
  new Proxy({} as Hono, {
    get(_target, prop, receiver) {
      if (prop === 'fetch') {
        return async (request: Request) => {
          const app = await getApp();
          return app.fetch(request);
        };
      }
      return Reflect.get(_target, prop, receiver);
    },
  })
);

export default handler;
