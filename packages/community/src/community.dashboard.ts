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
      title: 'Active Topics',
      type: 'metric' as const,
      object: 'topic',
      aggregate: 'count' as const,
      filter: ['status', '=', 'open'],
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Total Ideas',
      type: 'metric' as const,
      object: 'idea',
      aggregate: 'count' as const,
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Upcoming Events',
      type: 'metric' as const,
      object: 'community_event',
      aggregate: 'count' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Badges Awarded',
      type: 'metric' as const,
      object: 'badge',
      aggregate: 'count' as const,
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Topics by Category',
      type: 'pie' as const,
      object: 'topic',
      categoryField: 'category_id',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Ideas by Status',
      type: 'bar' as const,
      object: 'idea',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Topic Activity Over Time',
      type: 'line' as const,
      object: 'topic',
      categoryField: 'last_activity_at',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
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
