import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Referral List Views
 */

export const AllReferralsView = {
  list: {
    type: 'grid' as const,
    name: 'all_referrals',
    label: 'All Referrals',
    columns: [
      { field: 'patient', width: 180, sortable: true, link: true },
      { field: 'referring_provider', width: 150, sortable: true },
      { field: 'referred_to_provider', width: 150, sortable: true },
      { field: 'specialty', width: 130 },
      { field: 'referral_date', width: 120, sortable: true },
      { field: 'status', width: 110, sortable: true },
      { field: 'urgency', width: 100, sortable: true }
    ],
    sort: [{ field: 'referral_date', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const PendingReferralsView = {
  list: {
    type: 'grid' as const,
    name: 'pending_referrals',
    label: 'Pending Referrals',
    filter: [{ field: 'status', operator: '=', value: 'pending' }],
    columns: [
      { field: 'patient', width: 180, link: true },
      { field: 'referring_provider', width: 150 },
      { field: 'referred_to_provider', width: 150 },
      { field: 'specialty', width: 130 },
      { field: 'urgency', width: 100 },
      { field: 'referral_date', width: 120 }
    ],
    sort: [{ field: 'urgency', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'urgency == "urgent"' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } },
      { condition: { dialect: 'cel', source: 'urgency == "routine"' }, style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } }
    ]
  }
} satisfies View;

export const CompletedReferralsView = {
  list: {
    type: 'grid' as const,
    name: 'completed_referrals',
    label: 'Completed Referrals',
    filter: [{ field: 'status', operator: '=', value: 'completed' }],
    columns: [
      { field: 'patient', width: 180, link: true },
      { field: 'referred_to_provider', width: 150 },
      { field: 'specialty', width: 130 },
      { field: 'appointment_completed_date', width: 140 },
      { field: 'outcome', width: 200 }
    ],
    sort: [{ field: 'appointment_completed_date', order: 'desc' as const }]
  }
} satisfies View;

export const UrgentReferralsView = {
  list: {
    type: 'grid' as const,
    name: 'urgent_referrals',
    label: 'Urgent Referrals',
    filter: [{ field: 'urgency', operator: '=', value: 'urgent' }],
    columns: [
      { field: 'patient', width: 180, link: true },
      { field: 'referring_provider', width: 150 },
      { field: 'referred_to_provider', width: 150 },
      { field: 'specialty', width: 130 },
      { field: 'status', width: 110 },
      { field: 'referral_date', width: 120 }
    ],
    sort: [{ field: 'referral_date', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'status == "pending"' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

ViewSchema.parse(AllReferralsView);
ViewSchema.parse(PendingReferralsView);
ViewSchema.parse(CompletedReferralsView);
ViewSchema.parse(UrgentReferralsView);

export const ReferralListViews = {
  all: AllReferralsView,
  pending: PendingReferralsView,
  completed: CompletedReferralsView,
  urgent: UrgentReferralsView
};

export default ReferralListViews;
