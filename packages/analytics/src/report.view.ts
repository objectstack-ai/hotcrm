import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Report Library Views
 * Provides category filters, favorites, recent, and shared report views
 */

// All Reports View
export const AllReportsView = {
  list: {
    type: 'grid' as const,
    name: 'all_reports',
    label: 'All Reports',
    columns: [
      { field: 'name', width: 250, sortable: true, link: true },
      { field: 'report_type', width: 120, sortable: true },
      { field: 'object_name', width: 150, sortable: true },
      { field: 'chart_type', width: 120, sortable: true },
      { field: 'last_run_at', width: 150, sortable: true },
      { field: 'owner_id', width: 150 },
      { field: 'folder', width: 150, sortable: true }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// My Reports View
export const MyReportsView = {
  list: {
    type: 'grid' as const,
    name: 'my_reports',
    label: 'My Reports',
    filter: [['owner_id', '=', '${currentUser.id}']],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'report_type', width: 120 },
      { field: 'chart_type', width: 120 },
      { field: 'last_run_at', width: 150 },
      { field: 'run_count', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'last_run_at', order: 'desc' as const }]
  }
} satisfies View;

// Public Reports View
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
      { field: 'last_run_at', width: 150 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

// Recently Run Reports View
export const RecentReportsView = {
  list: {
    type: 'grid' as const,
    name: 'recent_reports',
    label: 'Recently Run',
    filter: [['last_run_at', '>=', 'LAST_30_DAYS']],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'report_type', width: 120 },
      { field: 'last_run_at', width: 150 },
      { field: 'run_count', width: 120, align: 'right' as const },
      { field: 'folder', width: 150 }
    ],
    sort: [{ field: 'last_run_at', order: 'desc' as const }]
  }
} satisfies View;

// Reports by Folder View
export const ReportsByFolderView = {
  list: {
    type: 'grid' as const,
    name: 'reports_by_folder',
    label: 'By Folder',
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'report_type', width: 120 },
      { field: 'object_name', width: 150 },
      { field: 'owner_id', width: 150 },
      { field: 'last_run_at', width: 150 }
    ],
    sort: [{ field: 'folder', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllReportsView);
ViewSchema.parse(MyReportsView);
ViewSchema.parse(PublicReportsView);
ViewSchema.parse(RecentReportsView);
ViewSchema.parse(ReportsByFolderView);

export const ReportListViews = {
  all: AllReportsView,
  my: MyReportsView,
  public: PublicReportsView,
  recent: RecentReportsView,
  byFolder: ReportsByFolderView
};

export default ReportListViews;
