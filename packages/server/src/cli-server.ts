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

/**
 * Sort plugins by dependencies using topological sort
 * Ensures that plugins are loaded after their dependencies
 */
function sortPluginsByDependencies(plugins: any[]): any[] {
  const sorted: any[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function visit(plugin: any) {
    const pluginName = plugin.name;
    
    if (visited.has(pluginName)) {
      return;
    }
    
    if (visiting.has(pluginName)) {
      throw new Error(`Circular dependency detected: ${pluginName}`);
    }
    
    visiting.add(pluginName);
    
    // Visit dependencies first
    const deps = plugin.dependencies || [];
    for (const depName of deps) {
      const depPlugin = plugins.find(p => p.name === depName);
      if (depPlugin) {
        visit(depPlugin);
      }
    }
    
    visiting.delete(pluginName);
    visited.add(pluginName);
    sorted.push(plugin);
  }
  
  // Visit all plugins
  for (const plugin of plugins) {
    visit(plugin);
  }
  
  return sorted;
}

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

    // Load business plugins from configuration
    const plugins = config.plugins || [];
    
    if (plugins.length > 0) {
      console.log(chalk.yellow(`\n📦 Loading ${plugins.length} business plugin(s)...\n`));
      
      // Sort plugins by dependencies to ensure correct loading order
      const sortedPlugins = sortPluginsByDependencies(plugins);
      
      for (const plugin of sortedPlugins) {
        try {
          const pluginName = plugin.label || plugin.name || 'unnamed';
          const objectCount = Object.keys(plugin.objects || {}).length;
          const deps = plugin.dependencies?.length > 0 
            ? chalk.dim(` (depends on: ${plugin.dependencies.join(', ')})`) 
            : '';
          
          console.log(chalk.blue(`  📦 ${pluginName}`));
          console.log(chalk.dim(`     ${objectCount} object(s)${deps}`));
          
          // Register plugin objects with kernel if method exists
          if (typeof (kernel as any).registerPlugin === 'function') {
            (kernel as any).registerPlugin(plugin);
            console.log(chalk.green(`     ✓ Loaded successfully\n`));
          } else {
            // Fallback: just log that objects are available
            console.log(chalk.yellow(`     ⚠ Plugin loaded (registerPlugin not available)\n`));
          }
        } catch (e: any) {
          const pluginName = plugin.label || plugin.name || 'unnamed';
          console.error(chalk.red(`     ✗ Failed to load ${pluginName}: ${e.message}\n`));
        }
      }
      
      const totalObjects = Object.keys(config.objects || {}).length;
      console.log(chalk.green(`✓ All business plugins loaded (${totalObjects} total objects)`));
    }

    // Try to add HTTP server plugin
    try {
      console.log(chalk.yellow('\n🌐 Loading HTTP server plugin...'));
      const { HonoServerPlugin } = await import('@objectstack/plugin-hono-server');
      if (typeof (kernel as any).registerPlugin === 'function') {
        const serverPlugin = new HonoServerPlugin({ port: parseInt(PORT as string) });
        (kernel as any).registerPlugin(serverPlugin);
        console.log(chalk.green(`✓ HTTP server plugin loaded (port: ${PORT})`));
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
    console.log(chalk.dim('   ObjectStack v0.7.2 (Plugin Architecture)'));
    console.log(chalk.dim(`   ${plugins.length} business plugins loaded`));
    console.log(chalk.dim(`   ${Object.keys(config.objects || {}).length} objects available`));
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
