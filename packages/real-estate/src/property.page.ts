import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Property Record Page Layout
 * Comprehensive property view with details, photos, listings, and showings.
 */
export const PropertyPage = {
  name: 'property_detail',
  object: 'property',
  type: 'record' as const,
  label: 'Property Record',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['listing_agent', 'broker', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'status', 'property_type', 'listed_price', 'mls_number']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['details', 'photos', 'listings', 'showings']
          }
        }
      ]
    },
    {
      name: 'details',
      components: [
        {
          type: 'record:details' as const,
          label: 'Property Information',
          properties: {
            fields: [
              'name', 'address', 'property_type', 'status',
              'bedrooms', 'bathrooms', 'sqft', 'lot_size',
              'year_built', 'listed_price', 'mls_number', 'owner_id'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Features',
          properties: {
            fields: ['features'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'photos',
      components: [
        {
          type: 'record:details' as const,
          label: 'Property Photos',
          properties: {
            fields: ['features'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'listings',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Listings',
          properties: {
            object: 'listing',
            columns: ['list_price', 'list_date', 'status', 'listing_agent', 'days_on_market'],
            sort: [{ field: 'list_date', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'showings',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Showings',
          properties: {
            object: 'showing',
            columns: ['scheduled_date', 'agent_id', 'buyer_contact_id', 'follow_up_status', 'rating'],
            sort: [{ field: 'scheduled_date', direction: 'desc' }],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(PropertyPage);

export default PropertyPage;
