import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * Finance Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Finance plugin
 * for cross-package discovery and AI agent tooling.
 */
export const FinanceCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'finance',
  version: '1.0.0',
  capabilities: [
    { name: 'contract_management', description: 'Contract lifecycle, renewal, and billing management' },
    { name: 'invoice_management', description: 'Invoice generation, status tracking, and line items' },
    { name: 'payment_processing', description: 'Payment tracking, matching, and reconciliation' },
    { name: 'revenue_recognition', description: 'Revenue forecasting and dashboard analytics' },
  ],
});
