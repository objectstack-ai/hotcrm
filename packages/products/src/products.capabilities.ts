import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * Products Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Products & Pricing plugin
 * for cross-package discovery and AI agent tooling.
 */
export const ProductsCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'products',
  version: '1.0.0',
  capabilities: [
    { name: 'product_catalog', description: 'Product definition, bundles, and components' },
    { name: 'price_management', description: 'Price books, pricing rules, and discount schedules' },
    { name: 'cpq', description: 'Configure, Price, Quote with line item calculations' },
    { name: 'approval_workflows', description: 'Discount and quote approval request management' },
  ],
});
