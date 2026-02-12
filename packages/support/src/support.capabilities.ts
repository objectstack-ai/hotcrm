import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * Support Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Customer Support plugin
 * for cross-package discovery and AI agent tooling.
 */
export const SupportCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'support',
  version: '1.0.0',
  capabilities: [
    { name: 'case_management', description: 'Case creation, tracking, and resolution' },
    { name: 'knowledge_base', description: 'Knowledge article authoring, search, and recommendations' },
    { name: 'sla_management', description: 'SLA policies, milestones, and business hours tracking' },
    { name: 'queue_routing', description: 'Queue management, routing rules, and skill-based assignment' },
    { name: 'escalation', description: 'Case escalation rules and automatic escalation workflows' },
    { name: 'multi_channel', description: 'Email-to-case, web-to-case, and social media integration' },
    { name: 'community_portal', description: 'Portal users, forum topics, and community discussions' },
  ],
});
