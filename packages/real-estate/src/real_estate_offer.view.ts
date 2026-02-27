import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Real Estate Offer List Views
 */

export const AllOffersView = {
  list: {
    type: 'grid' as const,
    name: 'all_offers',
    label: 'All Offers',
    columns: [
      { field: 'listing_id', width: 200, sortable: true, link: true },
      { field: 'buyer_id', width: 160, sortable: true },
      { field: 'offer_amount', width: 140, sortable: true, align: 'right' as const },
      { field: 'status', width: 120, sortable: true },
      { field: 'expiration_date', width: 130, sortable: true },
      { field: 'earnest_money', width: 130, align: 'right' as const },
      { field: 'closing_date', width: 130, sortable: true }
    ],
    sort: [{ field: 'offer_amount', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const PendingOffersView = {
  list: {
    type: 'grid' as const,
    name: 'pending_offers',
    label: 'Pending Offers',
    filter: [{ field: 'status', operator: '=', value: 'submitted' }],
    columns: [
      { field: 'listing_id', width: 200, link: true },
      { field: 'buyer_id', width: 160 },
      { field: 'offer_amount', width: 140, sortable: true, align: 'right' as const },
      { field: 'expiration_date', width: 130, sortable: true },
      { field: 'earnest_money', width: 130, align: 'right' as const },
      { field: 'contingencies', width: 200 }
    ],
    sort: [{ field: 'expiration_date', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'expiration_date <= TODAY()', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const AcceptedOffersView = {
  list: {
    type: 'grid' as const,
    name: 'accepted_offers',
    label: 'Accepted Offers',
    filter: [{ field: 'status', operator: '=', value: 'accepted' }],
    columns: [
      { field: 'listing_id', width: 200, link: true },
      { field: 'buyer_id', width: 160 },
      { field: 'offer_amount', width: 140, align: 'right' as const },
      { field: 'earnest_money', width: 130, align: 'right' as const },
      { field: 'closing_date', width: 130, sortable: true }
    ],
    sort: [{ field: 'closing_date', order: 'asc' as const }]
  }
} satisfies View;

export const RejectedOffersView = {
  list: {
    type: 'grid' as const,
    name: 'rejected_offers',
    label: 'Rejected Offers',
    filter: [{ field: 'status', operator: '=', value: 'rejected' }],
    columns: [
      { field: 'listing_id', width: 200, link: true },
      { field: 'buyer_id', width: 160 },
      { field: 'offer_amount', width: 140, align: 'right' as const },
      { field: 'expiration_date', width: 130 },
      { field: 'contingencies', width: 200 }
    ],
    sort: [{ field: 'offer_amount', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllOffersView);
ViewSchema.parse(PendingOffersView);
ViewSchema.parse(AcceptedOffersView);
ViewSchema.parse(RejectedOffersView);

export const OfferListViews = {
  all: AllOffersView,
  pending: PendingOffersView,
  accepted: AcceptedOffersView,
  rejected: RejectedOffersView
};

export default OfferListViews;
