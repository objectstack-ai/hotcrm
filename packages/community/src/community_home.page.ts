import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Community Home Page Layout
 * Landing page for community teams with trending topics, recent ideas, and upcoming events.
 */
export const CommunityHomePage = {
  name: 'community_home',
  type: 'home' as const,
  label: 'Community Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['community_manager', 'moderator', 'admin'],

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
      name: 'trending_topics',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Trending Topics',
          properties: {
            object: 'topic',
            sort: [{ field: 'views', direction: 'desc' }]
          }
        }
      ]
    },
    {
      name: 'recent_ideas',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Recent Ideas',
          properties: {
            object: 'idea'
          }
        }
      ]
    },
    {
      name: 'upcoming_events',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Upcoming Events',
          properties: {
            object: 'community_event',
            filters: [['start_date', '>=', 'TODAY()']],
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CommunityHomePage);

export default CommunityHomePage;
