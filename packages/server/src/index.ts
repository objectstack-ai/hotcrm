
// Polyfill require for ESM libraries that erroneously use it
try {
  if (typeof require !== 'undefined') {
    (global as any).require = require;
  }
} catch (e) {
  console.warn('Could not polyfill require');
}

import { ObjectKernel, AppPlugin, DriverPlugin, HttpServer, RestServer } from '@objectstack/runtime';
import { HonoServerPlugin } from '@objectstack/plugin-hono-server';
// We import the raw config object.
// ts-node will handle the .ts extension.
import config from '../objectstack.config';

async function main() {
  console.log('Starting HotCRM Server via Custom Runner...');
  
  const kernel = new ObjectKernel();

  // Initialize Database Driver
  // This usually provides the 'objectql' service
  const driverPlugin = new DriverPlugin({
    // Default to sqlite or from env
    type: 'sqlite',
    database: 'hotcrm.db'
  });
  kernel.use(driverPlugin);

  // Initialize Hono Server Plugin
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  kernel.use(new HonoServerPlugin({ port }));

  // We generally need the @objectstack/core ObjectQL implementation which uses the driver.
  // Since we don't have a distinct ObjectQLPlugin here, maybe the DriverPlugin *IS* the ObjectQL engine in this version?
  // Let's alias it.
  // @ts-ignore - access private container or service registry
  const services = kernel.services || (kernel as any)._services;
  
  // We can use a custom plugin to register the alias cleanly
  
  // We can use a custom plugin to register the alias cleanly
  kernel.use({
    name: 'objectql-alias',
    version: '1.0.0',
    init: async (ctx) => {
        // DriverPlugin registers 'driver.unknown' (or similar)
        // We find it and alias it to 'objectql'
        // But better yet, we just register the driver instance as 'objectql'
        
        // We need the ACTUAL driver instance that was passed to DriverPlugin
        const driver = (driverPlugin as any).driver;
        ctx.registerService('objectql', driver);
        console.log('Aliased objectql service to driver');
    }
  });

  if (config.plugins) {
    for (const plugin of config.plugins) {
      if (plugin) {
        console.log(`Registering plugin: ${plugin.name || 'Unknown'}`);
        // Wrap plain object plugins in AppPlugin adapter if needed
        if (typeof plugin.init !== 'function') {
           kernel.use(new AppPlugin(plugin));
        } else {
           kernel.use(plugin);
        }
      }
    }
  }

  // Environment variables usually handle Mongo URI etc.
  // config.datasources is not used in v0.8.0 minimal config unless manually set.

  await kernel.bootstrap();
  console.log('HotCRM Server is running!');
}

main().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
