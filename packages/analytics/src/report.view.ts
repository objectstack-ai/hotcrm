import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Report Library Views
 */

export const AllReportsView = {
  list: {
    type: 'grid' as const,
    name: 'all_reports',
    label: 'All Reports',
    columns: [
      { field: 'name', width: 250, sortable: true, link: true },
      { field: 'report_type', width: 120, sortable: true },
      { field: 'object_name', width: 150, sortable: true },
      { field: 'chart_type', width: 120 },
      { field: 'is_public', width: 80 },
      { field: 'folder', width: 150 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const MyReportsView = {
  list: {
    type: 'grid' as const,
    name: 'my_reports',
    label: 'My Reports',
    filter: [['owner_id', '=', '${currentUser.id}']],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'report_type', width: 120 },
      { field: 'object_name', width: 150 },
      { field: 'chart_type', width: 120 },
      { field: 'folder', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

export const PublicReportsView = {
  list: {
    type: 'grid' as const,
    name: 'public_reports',
    label: 'Public Reports',
    filter: [['is_public', '=', true]],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'report_type', width: 120 },
      { field: 'object_name', width: 150 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllReportsView);
ViewSchema.parse(MyReportsView);
ViewSchema.parse(PublicReportsView);

export const ReportListViews = {
  all: AllReportsView,
  my: MyReportsView,
  public: PublicReportsView
};

export default ReportListViews;
