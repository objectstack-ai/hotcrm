import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Community Health Dashboard
 * Engagement rate, active users, resolution rate, top contributors
 */
export const CommunityDashboard = {
  name: 'community_dashboard',
  label: 'Community Health',
  description: 'Community engagement, activity, and health metrics',
  widgets: [
    {
      id: 'active_topics',
      title: 'Active Topics',
      type: 'metric' as const,
      object: 'topic',
      aggregate: 'count' as const,
      filter: ['status', '=', 'open'],
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'total_ideas',
      title: 'Total Ideas',
      type: 'metric' as const,
      object: 'idea',
      aggregate: 'count' as const,
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'upcoming_events',
      title: 'Upcoming Events',
      type: 'metric' as const,
      object: 'community_event',
      aggregate: 'count' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'badges_awarded',
      title: 'Badges Awarded',
      type: 'metric' as const,
      object: 'badge',
      aggregate: 'count' as const,
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      id: 'topics_by_category',
      title: 'Topics by Category',
      type: 'pie' as const,
      object: 'topic',
      categoryField: 'category_id',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'ideas_by_status',
      title: 'Ideas by Status',
      type: 'bar' as const,
      object: 'idea',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'topic_activity_over_time',
      title: 'Topic Activity Over Time',
      type: 'line' as const,
      object: 'topic',
      categoryField: 'last_activity_at',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      id: 'recent_topics',
      title: 'Recent Topics',
      type: 'table' as const,
      object: 'topic',
      aggregate: 'count' as const,
      filter: ['last_activity_at', '>=', 'LAST_7_DAYS'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(CommunityDashboard);

export default CommunityDashboard;
