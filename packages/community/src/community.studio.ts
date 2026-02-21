/**
 * Community Studio Plugin — Community Cloud
 *
 * Provides Studio IDE extensions for the Community Cloud package including
 * content moderation tools, topic management, and community metrics.
 */
import { defineStudioPlugin, StudioPluginManifestSchema } from '@objectstack/spec/studio';

const communityStudioConfig = {
  id: 'hotcrm.community',
  name: 'hotcrm-community-studio',
  version: '1.0.0',
  description: 'Studio extensions for Community Cloud',
  activationEvents: [
    'onObject:topic',
    'onObject:idea',
    'onObject:community_event'
  ],
  contributes: {
    sidebarGroups: [
      {
        key: 'community',
        label: 'Community Cloud',
        order: 80,
        metadataTypes: ['object']
      }
    ],
    actions: [
      {
        id: 'moderate_content',
        label: 'Moderate Content',
        location: 'toolbar' as const
      },
      {
        id: 'feature_topic',
        label: 'Feature Topic',
        location: 'toolbar' as const
      },
      {
        id: 'manage_badges',
        label: 'Manage Badges',
        location: 'commandPalette' as const
      }
    ],
    panels: [
      {
        id: 'moderation_queue',
        label: 'Moderation Queue',
        location: 'right' as const
      },
      {
        id: 'community_metrics',
        label: 'Community Metrics',
        location: 'right' as const
      }
    ],
    commands: [
      { id: 'hotcrm.community.moderateContent', label: 'Moderate Content' },
      { id: 'hotcrm.community.featureTopic', label: 'Feature Topic' },
      { id: 'hotcrm.community.manageBadges', label: 'Manage Badges' }
    ]
  }
};

export const CommunityStudioPlugin = defineStudioPlugin(communityStudioConfig);

export const CommunityStudioManifest = StudioPluginManifestSchema.parse(communityStudioConfig);

export default CommunityStudioPlugin;
