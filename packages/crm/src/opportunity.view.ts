import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Opportunity List Views
 */

export const AllOpportunitiesView = {
  list: {
    name: 'all_opportunities',
    label: 'All Opportunities',
    columns: [
      { field: 'name', width: 250, sortable: true, link: true },
      { field: 'account_id', width: 200, sortable: true },
      { field: 'stage', width: 130, sortable: true },
      { field: 'amount', width: 150, sortable: true, align: 'right' as const },
      { field: 'close_date', width: 130, sortable: true },
      { field: 'probability', width: 100, sortable: true, align: 'right' as const },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'close_date', order: 'asc' as const }],
    bulkActions: ['delete', 'update_owner', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const MyOpportunitiesView = {
  list: {
    name: 'my_opportunities',
    label: 'My Opportunities',
    filter: [['owner_id', '=', '${currentUser.id}']],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'account_id', width: 200 },
      { field: 'stage', width: 130 },
      { field: 'amount', width: 150, align: 'right' as const },
      { field: 'close_date', width: 130 },
      { field: 'probability', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'close_date', order: 'asc' as const }]
  }
} satisfies View;

export const OpenPipelineView = {
  list: {
    name: 'open_pipeline',
    label: 'Open Pipeline',
    filter: [['stage', 'NOT IN', ['closed_won', 'closed_lost']]],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'account_id', width: 200 },
      { field: 'stage', width: 130 },
      { field: 'amount', width: 150, align: 'right' as const },
      { field: 'close_date', width: 130 },
      { field: 'probability', width: 100, align: 'right' as const },
      { field: 'forecast_category', width: 130 }
    ],
    sort: [{ field: 'amount', order: 'desc' as const }]
  }
} satisfies View;

export const ClosingThisMonthView = {
  list: {
    name: 'closing_this_month',
    label: 'Closing This Month',
    filter: [
      ['close_date', '>=', 'THIS_MONTH'],
      ['stage', 'NOT IN', ['closed_won', 'closed_lost']]
    ],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'account_id', width: 200 },
      { field: 'stage', width: 130 },
      { field: 'amount', width: 150, align: 'right' as const },
      { field: 'close_date', width: 130 },
      { field: 'probability', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'close_date', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'probability >= 75', style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } }
    ]
  }
} satisfies View;

export const HighValueDealsView = {
  list: {
    name: 'high_value_deals',
    label: 'High Value Deals',
    filter: [['amount', '>', 100000]],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'account_id', width: 200 },
      { field: 'stage', width: 130 },
      { field: 'amount', width: 150, align: 'right' as const },
      { field: 'close_date', width: 130 },
      { field: 'probability', width: 100, align: 'right' as const },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'amount', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: 'amount > 500000', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const LostDealsView = {
  list: {
    name: 'lost_deals',
    label: 'Lost Deals',
    filter: [['stage', '=', 'closed_lost']],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'account_id', width: 200 },
      { field: 'amount', width: 150, align: 'right' as const },
      { field: 'close_date', width: 130 },
      { field: 'lead_source', width: 130 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'close_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllOpportunitiesView);
ViewSchema.parse(MyOpportunitiesView);
ViewSchema.parse(OpenPipelineView);
ViewSchema.parse(ClosingThisMonthView);
ViewSchema.parse(HighValueDealsView);
ViewSchema.parse(LostDealsView);

export const OpportunityListViews = {
  all: AllOpportunitiesView,
  my: MyOpportunitiesView,
  openPipeline: OpenPipelineView,
  closingThisMonth: ClosingThisMonthView,
  highValue: HighValueDealsView,
  lost: LostDealsView
};

export default OpportunityListViews;
