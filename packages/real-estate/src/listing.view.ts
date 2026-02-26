import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Listing List Views
 */

export const AllListingsView = {
  list: {
    type: 'grid' as const,
    name: 'all_listings',
    label: 'All Listings',
    columns: [
      { field: 'property_id', width: 200, sortable: true, link: true },
      { field: 'list_price', width: 130, sortable: true, align: 'right' as const },
      { field: 'status', width: 120, sortable: true },
      { field: 'listing_type', width: 120, sortable: true },
      { field: 'listing_agent', width: 160, sortable: true },
      { field: 'list_date', width: 130, sortable: true },
      { field: 'days_on_market', width: 100, sortable: true, align: 'right' as const }
    ],
    sort: [{ field: 'list_date', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const ActiveListingsView = {
  list: {
    type: 'grid' as const,
    name: 'active_listings',
    label: 'Active Listings',
    filter: [{ field: 'status', operator: '=', value: 'active' }],
    columns: [
      { field: 'property_id', width: 200, link: true },
      { field: 'list_price', width: 130, sortable: true, align: 'right' as const },
      { field: 'listing_type', width: 120 },
      { field: 'listing_agent', width: 160 },
      { field: 'list_date', width: 130, sortable: true },
      { field: 'days_on_market', width: 100, sortable: true, align: 'right' as const }
    ],
    sort: [{ field: 'days_on_market', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'days_on_market > 90', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const PendingListingsView = {
  list: {
    type: 'grid' as const,
    name: 'pending_listings',
    label: 'Pending Listings',
    filter: [{ field: 'status', operator: '=', value: 'pending' }],
    columns: [
      { field: 'property_id', width: 200, link: true },
      { field: 'list_price', width: 130, align: 'right' as const },
      { field: 'listing_agent', width: 160 },
      { field: 'list_date', width: 130 },
      { field: 'days_on_market', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'list_date', order: 'desc' as const }]
  }
} satisfies View;

export const SoldListingsView = {
  list: {
    type: 'grid' as const,
    name: 'sold_listings',
    label: 'Sold Listings',
    filter: [{ field: 'status', operator: '=', value: 'sold' }],
    columns: [
      { field: 'property_id', width: 200, link: true },
      { field: 'list_price', width: 130, align: 'right' as const },
      { field: 'sold_price', width: 130, align: 'right' as const },
      { field: 'listing_agent', width: 160 },
      { field: 'sold_date', width: 130, sortable: true },
      { field: 'days_on_market', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'sold_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllListingsView);
ViewSchema.parse(ActiveListingsView);
ViewSchema.parse(PendingListingsView);
ViewSchema.parse(SoldListingsView);

export const ListingListViews = {
  all: AllListingsView,
  active: ActiveListingsView,
  pending: PendingListingsView,
  sold: SoldListingsView
};

export default ListingListViews;
