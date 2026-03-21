import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Brokerage Dashboard
 * Key brokerage metrics: active listings, showings, offers, and commission tracking.
 */
export const BrokerageDashboard = {
  name: 'brokerage_dashboard',
  label: 'Brokerage Dashboard',
  description: 'Brokerage performance overview with listings, showings, and commission metrics',
  widgets: [
    {
      id: 'active_listings',
      title: 'Active Listings',
      type: 'metric' as const,
      object: 'listing',
      aggregate: 'count' as const,
      filter: { status: 'active' },
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'showings_this_week',
      title: 'Showings This Week',
      type: 'metric' as const,
      object: 'showing',
      aggregate: 'count' as const,
      filter: { scheduled_date: { $gte: 'THIS_WEEK()' } },
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'pending_offers',
      title: 'Pending Offers',
      type: 'metric' as const,
      object: 'real_estate_offer',
      aggregate: 'count' as const,
      filter: { status: 'submitted' },
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'commission_ytd',
      title: 'Commission YTD',
      type: 'kpi' as const,
      object: 'commission',
      valueField: 'commission_amount',
      aggregate: 'sum' as const,
      filter: { payment_status: { $ne: 'pending' } },
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      id: 'listings_by_status',
      title: 'Listings by Status',
      type: 'bar' as const,
      object: 'listing',
      categoryField: 'status',
      valueField: 'list_price',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'average_days_on_market',
      title: 'Average Days on Market',
      type: 'line' as const,
      object: 'listing',
      categoryField: 'list_date',
      valueField: 'days_on_market',
      aggregate: 'avg' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'top_agents_by_commission',
      title: 'Top Agents by Commission',
      type: 'bar' as const,
      object: 'commission',
      categoryField: 'agent_id',
      valueField: 'commission_amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      id: 'upcoming_showings',
      title: 'Upcoming Showings',
      type: 'table' as const,
      object: 'showing',
      aggregate: 'count' as const,
      filter: { scheduled_date: { $gte: 'TODAY()' } },
      layout: { x: 6, y: 6, w: 6, h: 4 },
      options: {
        columns: ['listing_id', 'agent_id', 'scheduled_date', 'buyer_contact_id', 'follow_up_status']
      }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(BrokerageDashboard);

export default BrokerageDashboard;
