import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * CRM Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Sales Cloud plugin
 * for cross-package discovery and AI agent tooling.
 */
export const CRMCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'crm',
  version: '1.0.0',
  capabilities: [
    { name: 'account_management', description: 'Account CRUD and hierarchy management' },
    { name: 'contact_management', description: 'Contact lifecycle and relationship tracking' },
    { name: 'lead_management', description: 'Lead scoring, qualification, and conversion' },
    { name: 'opportunity_management', description: 'Sales pipeline and opportunity tracking' },
    { name: 'activity_tracking', description: 'Activity logging, tasks, and notes' },
    { name: 'assignment_rules', description: 'Automated record assignment based on rules' },
  ],
});
