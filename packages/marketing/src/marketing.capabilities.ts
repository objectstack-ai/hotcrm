import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * Marketing Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Marketing Cloud plugin
 * for cross-package discovery and AI agent tooling.
 */
export const MarketingCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'marketing',
  version: '1.0.0',
  capabilities: [
    { name: 'campaign_management', description: 'Campaign creation, budgeting, and ROI tracking' },
    { name: 'email_marketing', description: 'Email templates, sends, and engagement tracking' },
    { name: 'landing_pages', description: 'Landing page and form management' },
    { name: 'marketing_automation', description: 'Automation workflows and lead nurture programs' },
    { name: 'list_management', description: 'Marketing list segmentation and unsubscribe compliance' },
    { name: 'attribution', description: 'Touchpoint recording and revenue attribution' },
  ],
});
