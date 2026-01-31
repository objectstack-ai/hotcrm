/**
 * ObjectStack Configuration for HotCRM
 * 
 * This configuration file defines the ObjectStack kernel setup for HotCRM.
 * It uses a plugin-based architecture where each business package (CRM, Products, 
 * Finance, Support) is an independent plugin with its own objects and dependencies.
 * 
 * Plugin Architecture:
 * - Each plugin is self-contained with its own business objects
 * - Plugins can declare dependencies on other plugins
 * - Plugins are loaded in dependency order
 * - The @objectstack/cli command loads all plugins automatically
 */

// Import plugin definitions
import { CRMPlugin } from '@hotcrm/crm/dist/plugin.js';
import { ProductsPlugin } from '@hotcrm/products/dist/plugin.js';
import { FinancePlugin } from '@hotcrm/finance/dist/plugin.js';
import { SupportPlugin } from '@hotcrm/support/dist/plugin.js';

/**
 * Plugin Registry
 * 
 * All business plugins registered in the HotCRM application.
 * Plugins are loaded in the order they appear, respecting dependencies:
 * 1. CRM (core, no dependencies)
 * 2. Products (depends on CRM)
 * 3. Finance (depends on CRM)
 * 4. Support (depends on CRM)
 */
const plugins = [
  CRMPlugin,
  ProductsPlugin,
  FinancePlugin,
  SupportPlugin,
];

/**
 * Collect all objects from all plugins
 * This ensures backward compatibility with the current objectstack.config.ts structure
 */
const allObjects = plugins.reduce((acc, plugin) => {
  return { ...acc, ...plugin.objects };
}, {});

console.log(`[Config] Loaded ${plugins.length} plugin(s) with ${Object.keys(allObjects).length} total objects`);
plugins.forEach(plugin => {
  const objectCount = Object.keys(plugin.objects).length;
  const deps = plugin.dependencies.length > 0 ? ` (depends on: ${plugin.dependencies.join(', ')})` : '';
  console.log(`  - ${plugin.label} (${plugin.name}): ${objectCount} objects${deps}`);
});

/**
 * ObjectStack Configuration
 */
export default {
  // Metadata configuration
  metadata: {
    name: 'HotCRM',
    version: '1.0.0',
    description: 'Enterprise-level CRM system built on @objectstack/spec v0.7.2 with plugin architecture'
  },

  // Business plugins (new plugin-based architecture)
  plugins: plugins,

  // Business objects (backward compatibility)
  objects: allObjects,
};

