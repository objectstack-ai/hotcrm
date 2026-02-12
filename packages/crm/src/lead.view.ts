import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Lead List Views
 */

export const AllLeadsView = {
  list: {
    name: 'all_leads',
    label: 'All Leads',
    columns: [
      { field: 'first_name', width: 150, sortable: true, link: true },
      { field: 'last_name', width: 150, sortable: true, link: true },
      { field: 'company', width: 200, sortable: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'rating', width: 100, sortable: true },
      { field: 'lead_score', width: 100, sortable: true, align: 'right' as const },
      { field: 'lead_source', width: 140 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'lead_score', order: 'desc' as const }],
    bulkActions: ['delete', 'update_owner', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const MyLeadsView = {
  list: {
    name: 'my_leads',
    label: 'My Leads',
    filter: [['owner_id', '=', '${currentUser.id}']],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'company', width: 200 },
      { field: 'status', width: 120 },
      { field: 'rating', width: 100 },
      { field: 'lead_score', width: 100, align: 'right' as const },
      { field: 'lead_source', width: 140 }
    ],
    sort: [{ field: 'lead_score', order: 'desc' as const }]
  }
} satisfies View;

export const HotLeadsView = {
  list: {
    name: 'hot_leads',
    label: 'Hot Leads',
    filter: [['rating', '=', 'hot']],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'company', width: 200 },
      { field: 'status', width: 120 },
      { field: 'lead_score', width: 100, align: 'right' as const },
      { field: 'lead_source', width: 140 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'lead_score', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: 'rating == "hot"', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const OpenLeadsView = {
  list: {
    name: 'open_leads',
    label: 'Open Leads',
    filter: [['status', 'IN', ['new', 'contacted']]],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'company', width: 200 },
      { field: 'status', width: 120 },
      { field: 'rating', width: 100 },
      { field: 'lead_score', width: 100, align: 'right' as const },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'lead_score', order: 'desc' as const }]
  }
} satisfies View;

export const QualifiedLeadsView = {
  list: {
    name: 'qualified_leads',
    label: 'Qualified Leads',
    filter: [['status', '=', 'qualified']],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'company', width: 200 },
      { field: 'rating', width: 100 },
      { field: 'lead_score', width: 100, align: 'right' as const },
      { field: 'lead_source', width: 140 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'lead_score', order: 'desc' as const }]
  }
} satisfies View;

export const PublicPoolView = {
  list: {
    name: 'public_pool',
    label: 'Public Pool',
    filter: [['is_in_public_pool', '=', true]],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'company', width: 200 },
      { field: 'status', width: 120 },
      { field: 'rating', width: 100 },
      { field: 'lead_score', width: 100, align: 'right' as const },
      { field: 'pool_entry_date', width: 150 }
    ],
    sort: [{ field: 'pool_entry_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllLeadsView);
ViewSchema.parse(MyLeadsView);
ViewSchema.parse(HotLeadsView);
ViewSchema.parse(OpenLeadsView);
ViewSchema.parse(QualifiedLeadsView);
ViewSchema.parse(PublicPoolView);

export const LeadListViews = {
  all: AllLeadsView,
  my: MyLeadsView,
  hot: HotLeadsView,
  open: OpenLeadsView,
  qualified: QualifiedLeadsView,
  publicPool: PublicPoolView
};

export default LeadListViews;
