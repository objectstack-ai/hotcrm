import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * Community Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Community Cloud plugin
 * for cross-package discovery and AI agent tooling.
 */
export const CommunityCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'community',
  version: '1.0.0',
  capabilities: [
    { name: 'forum_management', description: 'Forum category, topic, and reply management with threading' },
    { name: 'idea_management', description: 'Idea submission, voting, prioritization, and status tracking' },
    { name: 'event_management', description: 'Community event creation, RSVP tracking, and reminders' },
    { name: 'badge_system', description: 'Gamification badges with automatic award criteria and points' },
    { name: 'user_group_management', description: 'User group creation, membership criteria, and access control' },
    { name: 'content_moderation', description: 'AI-powered content moderation, spam detection, and flagging' },
  ],
});
