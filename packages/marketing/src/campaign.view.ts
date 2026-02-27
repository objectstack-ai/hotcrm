import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Campaign List Views
 */

export const AllCampaignsView = {
  list: {
    type: 'grid' as const,
    name: 'all_campaigns',
    label: 'All Campaigns',
    columns: [
      { field: 'name', width: 250, sortable: true, link: true },
      { field: 'type', width: 130, sortable: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'start_date', width: 130, sortable: true },
      { field: 'end_date', width: 130, sortable: true },
      { field: 'budgeted_cost', width: 150, sortable: true, align: 'right' as const },
      { field: 'actual_cost', width: 150, align: 'right' as const },
      { field: 'expected_revenue', width: 150, align: 'right' as const }
    ],
    sort: [{ field: 'start_date', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const ActiveCampaignsView = {
  list: {
    type: 'grid' as const,
    name: 'active_campaigns',
    label: 'Active Campaigns',
    filter: [{ field: 'status', operator: '=', value: 'in_progress' }],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 130 },
      { field: 'start_date', width: 130 },
      { field: 'end_date', width: 130 },
      { field: 'budgeted_cost', width: 150, align: 'right' as const },
      { field: 'actual_cost', width: 150, align: 'right' as const },
      { field: 'expected_revenue', width: 150, align: 'right' as const }
    ],
    sort: [{ field: 'end_date', order: 'asc' as const }]
  }
} satisfies View;

export const PlannedCampaignsView = {
  list: {
    type: 'grid' as const,
    name: 'planned_campaigns',
    label: 'Planned Campaigns',
    filter: [{ field: 'status', operator: '=', value: 'planned' }],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 130 },
      { field: 'start_date', width: 130 },
      { field: 'end_date', width: 130 },
      { field: 'budgeted_cost', width: 150, align: 'right' as const },
      { field: 'expected_revenue', width: 150, align: 'right' as const }
    ],
    sort: [{ field: 'start_date', order: 'asc' as const }]
  }
} satisfies View;

export const CompletedCampaignsView = {
  list: {
    type: 'grid' as const,
    name: 'completed_campaigns',
    label: 'Completed Campaigns',
    filter: [{ field: 'status', operator: '=', value: 'completed' }],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 130 },
      { field: 'start_date', width: 130 },
      { field: 'end_date', width: 130 },
      { field: 'budgeted_cost', width: 150, align: 'right' as const },
      { field: 'actual_cost', width: 150, align: 'right' as const },
      { field: 'actual_revenue', width: 150, align: 'right' as const }
    ],
    sort: [{ field: 'end_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllCampaignsView);
ViewSchema.parse(ActiveCampaignsView);
ViewSchema.parse(PlannedCampaignsView);
ViewSchema.parse(CompletedCampaignsView);

export const CampaignListViews = {
  all: AllCampaignsView,
  active: ActiveCampaignsView,
  planned: PlannedCampaignsView,
  completed: CompletedCampaignsView
};

export default CampaignListViews;
