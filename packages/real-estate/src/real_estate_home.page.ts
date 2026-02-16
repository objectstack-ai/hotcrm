import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Real Estate Home Page Layout
 * Landing page for brokerage users with key metrics, recent listings, and upcoming showings.
 */
export const RealEstateHomePage = {
  name: 'real_estate_home',
  type: 'home' as const,
  label: 'Real Estate Home',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['listing_agent', 'buyer_agent', 'broker', 'admin'],

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
      name: 'summary',
      components: [
        {
          type: 'page:card' as const,
          label: 'Active Listings',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Pending Offers',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Showings This Week',
          properties: {}
        }
      ]
    },
    {
      name: 'insights',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'Market Insights',
          properties: {
            context: 'real_estate_market'
          }
        }
      ]
    },
    {
      name: 'recent_listings',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Recent Listings',
          properties: {
            object: 'listing',
            columns: ['property_id', 'list_price', 'status', 'listing_agent', 'days_on_market']
          }
        }
      ]
    },
    {
      name: 'upcoming_showings',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Upcoming Showings',
          properties: {
            object: 'showing',
            columns: ['listing_id', 'scheduled_date', 'buyer_contact_id', 'agent_id', 'follow_up_status']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(RealEstateHomePage);

export default RealEstateHomePage;
