#!/usr/bin/env node
/**
 * HotCRM Server - ObjectStack CLI Wrapper
 * 
 * Custom startup script that uses ObjectStack runtime directly to work around
 * CLI compatibility issues in @objectstack/cli@0.7.2
 * 
 * Issues with official CLI:
 * - Expects ObjectStackKernel but @objectstack/core exports ObjectKernel
 * - ESM compatibility issues with driver packages
 */

import { bundleRequire } from 'bundle-require';
import chalk from 'chalk';
import { ObjectKernel } from '@objectstack/core';

const CONFIG_PATH = 'objectstack.config.ts';
const PORT = process.env.PORT || 3000;

async function startServer() {
  console.log(chalk.bold('\n🚀 HotCRM Server'));
  console.log(chalk.dim('------------------------'));
  console.log('📂 Config:', chalk.blue(CONFIG_PATH));
  console.log('🌐 Port:', chalk.blue(PORT.toString()));
  console.log('');

  try {
    // Load configuration
    console.log(chalk.yellow('📦 Loading configuration...'));
    const { mod } = await bundleRequire({
      filepath: CONFIG_PATH,
    });

    const config = mod.default || mod;

    if (!config) {
      throw new Error(`Default export not found in ${CONFIG_PATH}`);
    }

    console.log(chalk.green('✓ Configuration loaded'));

    // Create kernel instance
    console.log(chalk.yellow('🔧 Initializing ObjectStack kernel...'));
    const kernel = new ObjectKernel({
      logger: {
        level: 'info',
        format: 'text'
      }
    });

    // Load plugins from configuration
    const plugins = config.plugins || [];
    
    if (plugins.length > 0) {
      console.log(chalk.yellow(`📦 Loading ${plugins.length} plugin(s)...`));
      
      for (const plugin of plugins) {
        try {
          if (typeof (kernel as any).registerPlugin === 'function') {
            (kernel as any).registerPlugin(plugin);
            const pluginName = plugin.name || plugin.constructor?.name || 'unnamed';
            console.log(chalk.green(`  ✓ Registered plugin: ${pluginName}`));
          } else {
            console.warn(chalk.yellow('  ⚠ registerPlugin not available on kernel'));
          }
        } catch (e: any) {
          console.error(chalk.red(`  ✗ Failed to register plugin: ${e.message}`));
        }
      }
    }

    // Try to add HTTP server plugin
    try {
      const { HonoServerPlugin } = await import('@objectstack/plugin-hono-server');
      if (typeof (kernel as any).registerPlugin === 'function') {
        const serverPlugin = new HonoServerPlugin({ port: parseInt(PORT as string) });
        (kernel as any).registerPlugin(serverPlugin);
        console.log(chalk.green(`  ✓ Registered HTTP server plugin (port: ${PORT})`));
      }
    } catch (e: any) {
      console.warn(chalk.yellow(`  ⚠ HTTP server plugin not available: ${e.message}`));
      console.warn(chalk.yellow('  ℹ Server will run without HTTP endpoint'));
    }

    // Boot the kernel
    console.log(chalk.yellow('\n🚀 Starting ObjectStack...'));
    if (typeof (kernel as any).boot === 'function') {
      await (kernel as any).boot();
    } else {
      console.log(chalk.yellow('  ⚠ Boot method not available, kernel created successfully'));
    }

    console.log(chalk.green('\n✅ HotCRM server is running!'));
    console.log(chalk.dim('   ObjectStack v0.7.2'));
    console.log(chalk.dim(`   ${Object.keys(config.objects || {}).length} objects loaded`));
    console.log(chalk.dim('   Press Ctrl+C to stop\n'));

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n⏹  Stopping server...'));
      if (typeof (kernel as any).shutdown === 'function') {
        await (kernel as any).shutdown();
      }
      console.log(chalk.green('✅ Server stopped'));
      process.exit(0);
    });

  } catch (error: any) {
    console.error(chalk.red('\n❌ Server Error:'));
    console.error(error.message || error);
    if (error.stack) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
}

startServer();
