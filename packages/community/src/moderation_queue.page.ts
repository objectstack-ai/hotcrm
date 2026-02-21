import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Moderation Queue Page Layout
 * Page for moderators to review flagged content and manage moderation tasks.
 */
export const ModerationQueuePage = {
  name: 'moderation_queue',
  type: 'app' as const,
  label: 'Moderation Queue',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['moderator', 'community_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'flagged_content',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Flagged Content',
          properties: {
            object: 'topic',
            filters: [['is_flagged', '=', true]],
          }
        }
      ]
    },
    {
      name: 'pending_reviews',
      components: [
        {
          type: 'page:card' as const,
          label: 'Pending Reviews',
          properties: {}
        }
      ]
    },
    {
      name: 'moderation_stats',
      components: [
        {
          type: 'page:card' as const,
          label: 'Moderation Statistics',
          properties: {}
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ModerationQueuePage);

export default ModerationQueuePage;
