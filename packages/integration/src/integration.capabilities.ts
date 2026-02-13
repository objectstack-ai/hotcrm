import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * Integration Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Integration Cloud plugin
 * for cross-package discovery and AI agent tooling.
 */
export const IntegrationCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'integration',
  version: '1.0.0',
  capabilities: [
    { name: 'connector_management', description: 'Connector lifecycle management and marketplace' },
    { name: 'sync_management', description: 'Data synchronization configuration and monitoring' },
    { name: 'webhook_management', description: 'Webhook subscription and delivery management' },
    { name: 'api_key_management', description: 'API key creation, rotation, and usage tracking' },
    { name: 'field_mapping', description: 'Reusable field mapping templates between objects' },
    { name: 'connector_marketplace', description: 'Pre-built connector discovery and installation' },
  ],
});
